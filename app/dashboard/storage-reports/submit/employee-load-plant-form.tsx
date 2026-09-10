"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const BUCKET =
  "load-plant-evidence";

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

type Props = {
  employeeId: string;
  employeeName: string;
  employeeSeed: string;
};

export default function EmployeeLoadPlantForm({
  employeeId,
  employeeName,
  employeeSeed,
}: Props) {
  const router = useRouter();

  const [amount, setAmount] =
    useState("");

  const [reportDate, setReportDate] =
    useState(
      getLocalDateString()
    );

  const [imageFile, setImageFile] =
    useState<File | null>(
      null
    );

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // ==========================================================
  // PROCESS IMAGE
  // ==========================================================

  async function processImage(
    file: File
  ) {
    setErrorMessage("");

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "File harus berupa gambar."
      );

      return;
    }

    try {
      const resized =
        await resizeImage(
          file,
          MAX_WIDTH,
          MAX_HEIGHT
        );

      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setImageFile(
        resized
      );

      setPreviewUrl(
        URL.createObjectURL(
          resized
        )
      );
    } catch (
      error
    ) {
      console.error(
        "PROCESS IMAGE ERROR:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "Gagal memproses gambar."
        )
      );
    }
  }

  // ==========================================================
  // FILE INPUT
  // ==========================================================

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    await processImage(
      file
    );
  }

  // ==========================================================
  // CTRL + V
  // ==========================================================

  async function handlePaste(
    event: ClipboardEvent<HTMLDivElement>
  ) {
    const items =
      Array.from(
        event.clipboardData.items
      );

    const imageItem =
      items.find(
        (item) =>
          item.type.startsWith(
            "image/"
          )
      );

    if (!imageItem) {
      return;
    }

    event.preventDefault();

    const file =
      imageItem.getAsFile();

    if (!file) {
      return;
    }

    await processImage(
      file
    );
  }

  // ==========================================================
  // PASTE BUTTON
  // ==========================================================

  async function pasteFromClipboard() {
    setErrorMessage("");

    try {
      if (
        !navigator.clipboard ||
        !navigator.clipboard.read
      ) {
        throw new Error(
          "Browser tidak mendukung Clipboard Image API."
        );
      }

      const items =
        await navigator.clipboard.read();

      for (
        const item of items
      ) {
        const imageType =
          item.types.find(
            (type) =>
              type.startsWith(
                "image/"
              )
          );

        if (!imageType) {
          continue;
        }

        const blob =
          await item.getType(
            imageType
          );

        const file =
          new File(
            [blob],
            `load-plant-${Date.now()}.png`,
            {
              type:
                blob.type,
            }
          );

        await processImage(
          file
        );

        return;
      }

      setErrorMessage(
        "Clipboard tidak berisi gambar."
      );
    } catch (
      error
    ) {
      console.error(
        "CLIPBOARD ERROR:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error,
          "Browser tidak mengizinkan membaca clipboard. Coba tekan Ctrl+V langsung di halaman."
        )
      );
    }
  }

  // ==========================================================
  // REMOVE IMAGE
  // ==========================================================

  function removeImage() {
    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setPreviewUrl("");
    setImageFile(null);
  }

  // ==========================================================
  // SUBMIT REPORT
  // ==========================================================

  async function submitReport() {
    setErrorMessage("");
    setSuccessMessage("");

    const numericAmount =
      Number(amount);

    if (
      !Number.isInteger(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setErrorMessage(
        "Jumlah plants harus lebih dari 0."
      );

      return;
    }

    if (!reportDate) {
      setErrorMessage(
        "Tanggal wajib diisi."
      );

      return;
    }

    if (!imageFile) {
      setErrorMessage(
        "Screenshot bukti wajib diisi."
      );

      return;
    }

    setLoading(true);

    let uploadedFilename:
      | string
      | null = null;

    try {
      const supabase =
        createClient();

      // ======================================================
      // USER
      // ======================================================

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          userError?.message ??
            "Session login tidak ditemukan."
        );
      }

      // ======================================================
      // VALIDATE IMAGE
      // ======================================================

      if (
        imageFile.type !==
        "image/jpeg"
      ) {
        throw new Error(
          `Format gambar setelah diproses tidak valid: ${imageFile.type}`
        );
      }

      const MAX_FILE_SIZE =
        5 *
        1024 *
        1024;

      if (
        imageFile.size >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          `Ukuran screenshot terlalu besar. Maksimal 5 MB. Ukuran sekarang ${(
            imageFile.size /
            1024 /
            1024
          ).toFixed(2)} MB.`
        );
      }

      // ======================================================
      // FILENAME
      // ======================================================

      const filename =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;

      uploadedFilename =
        filename;

      // ======================================================
      // UPLOAD
      // ======================================================

      const {
        data: uploadData,
        error: uploadError,
      } =
        await supabase.storage
          .from(BUCKET)
          .upload(
            filename,
            imageFile,
            {
              cacheControl:
                "3600",

              contentType:
                "image/jpeg",

              upsert:
                false,
            }
          );

      if (uploadError) {
        console.error(
          "LOAD PLANT STORAGE UPLOAD ERROR:",
          uploadError
        );

        throw new Error(
          `Upload screenshot gagal: ${uploadError.message}`
        );
      }

      if (!uploadData) {
        throw new Error(
          "Upload screenshot gagal: tidak ada response dari Supabase Storage."
        );
      }

      // ======================================================
      // PUBLIC URL
      // ======================================================

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from(BUCKET)
          .getPublicUrl(
            filename
          );

      const evidenceUrl =
        publicUrlData?.publicUrl;

      if (!evidenceUrl) {
        throw new Error(
          "URL screenshot gagal dibuat."
        );
      }

      // ======================================================
      // DEBUG EMPLOYEE
      // ======================================================

      console.log(
        "LOAD PLANT SUBMIT DATA:",
        {
          employeeId,
          employeeName,
          employeeSeed,
          amount:
            numericAmount,
          reportDate,
          userId:
            user.id,
          evidenceUrl,
        }
      );

      // ======================================================
      // INSERT REPORT
      // ======================================================

      const {
        data: insertedReport,
        error: insertError,
      } =
        await supabase
          .from(
            "load_plant_reports"
          )
          .insert({
            employee_id:
              employeeId,

            seed:
              employeeSeed,

            amount:
              numericAmount,

            evidence_url:
              evidenceUrl,

            report_date:
              reportDate,

            status:
              "PENDING",

            submitted_by:
              user.id,

            reviewed_by:
              null,

            reviewed_at:
              null,

            rejection_reason:
              null,
          })
          .select(`
            id,
            employee_id,
            seed,
            amount,
            report_date,
            status
          `)
          .single();

      if (insertError) {
        console.error(
          "LOAD PLANT DATABASE INSERT ERROR:",
          insertError
        );

        // hapus screenshot kalau insert DB gagal
        if (uploadedFilename) {
          const {
            error:
              cleanupError,
          } =
            await supabase.storage
              .from(BUCKET)
              .remove([
                uploadedFilename,
              ]);

          if (cleanupError) {
            console.error(
              "LOAD PLANT CLEANUP ERROR:",
              cleanupError
            );
          }
        }

        throw new Error(
          `Database gagal menyimpan Load Plant: ${insertError.message}`
        );
      }

      if (!insertedReport) {
        throw new Error(
          "Database tidak mengembalikan laporan yang baru dibuat."
        );
      }

      console.log(
        "LOAD PLANT BERHASIL:",
        insertedReport
      );

      // ======================================================
      // SUCCESS
      // ======================================================

      setAmount("");

      removeImage();

      setSuccessMessage(
        "Load Plant berhasil dikirim dan menunggu review."
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      console.error(
        "========================================"
      );

      console.error(
        "LOAD PLANT SUBMIT ERROR:"
      );

      console.error(
        error
      );

      console.error(
        "========================================"
      );

      const message =
        getErrorMessage(
          error,
          "Gagal mengirim Load Plant."
        );

      setErrorMessage(
        message
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      onPaste={
        handlePaste
      }
      className="space-y-5"
    >
      {/* EMPLOYEE */}

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoBox
          label="Pegawai"
          value={
            employeeName
          }
        />

        <InfoBox
          label="Seed"
          value={
            employeeSeed
          }
        />
      </div>

      {/* AMOUNT */}

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Jumlah Plants
        </label>

        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(event) =>
            setAmount(
              event.target.value
            )
          }
          placeholder="Contoh: 5000"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      {/* DATE */}

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Tanggal
        </label>

        <input
          type="date"
          value={
            reportDate
          }
          onChange={(event) =>
            setReportDate(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none"
        />
      </div>

      {/* SCREENSHOT */}

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Screenshot Bukti
        </label>

        <button
          type="button"
          onClick={
            pasteFromClipboard
          }
          disabled={
            loading
          }
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          📋 Paste dari Clipboard
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />

          <span className="text-xs uppercase text-zinc-600">
            atau
          </span>

          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={
            handleFile
          }
          disabled={
            loading
          }
          className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400 disabled:opacity-50"
        />

        <p className="mt-2 text-xs text-zinc-600">
          Bisa juga tekan Ctrl+V langsung.
          Gambar otomatis maksimal 800×600
          dan dikonversi menjadi JPG.
        </p>
      </div>

      {/* PREVIEW */}

      {previewUrl && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Screenshot Siap
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {imageFile?.name}

                {" • "}

                {imageFile
                  ? `${(
                      imageFile.size /
                      1024 /
                      1024
                    ).toFixed(
                      2
                    )} MB`
                  : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={
                removeImage
              }
              disabled={
                loading
              }
              className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"
            >
              Hapus
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
            <img
              src={
                previewUrl
              }
              alt="Preview Load Plant"
              className="max-h-[600px] w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/20 px-4 py-3">
          <p className="text-sm font-semibold text-red-400">
            Gagal mengirim Load Plant
          </p>

          <p className="mt-2 break-words text-sm text-red-300">
            {errorMessage}
          </p>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="rounded-xl border border-green-900 bg-green-950/20 px-4 py-3 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {/* SUBMIT */}

      <button
        type="button"
        onClick={
          submitReport
        }
        disabled={
          loading
        }
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Mengirim Load Plant..."
          : "Kirim Load Plant"}
      </button>
    </div>
  );
}

// ============================================================
// INFO BOX
// ============================================================

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-2 font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// GET ERROR MESSAGE
// ============================================================

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    if (
      "message" in error
    ) {
      const message =
        (
          error as {
            message?: unknown;
          }
        ).message;

      if (
        message !== undefined &&
        message !== null
      ) {
        return String(
          message
        );
      }
    }

    if (
      "error_description" in error
    ) {
      const description =
        (
          error as {
            error_description?: unknown;
          }
        ).error_description;

      if (
        description !== undefined &&
        description !== null
      ) {
        return String(
          description
        );
      }
    }

    try {
      return JSON.stringify(
        error
      );
    } catch {
      return fallback;
    }
  }

  return fallback;
}

// ============================================================
// RESIZE IMAGE
// ============================================================

async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<File> {
  const image =
    await loadImage(
      file
    );

  let width =
    image.width;

  let height =
    image.height;

  const scale =
    Math.min(
      maxWidth / width,
      maxHeight / height,
      1
    );

  width =
    Math.round(
      width * scale
    );

  height =
    Math.round(
      height * scale
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;

  const context =
    canvas.getContext(
      "2d"
    );

  if (!context) {
    throw new Error(
      "Canvas tidak tersedia."
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const blob =
    await new Promise<Blob>(
      (
        resolve,
        reject
      ) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(
                result
              );
            } else {
              reject(
                new Error(
                  "Gagal resize gambar."
                )
              );
            }
          },
          "image/jpeg",
          0.82
        );
      }
    );

  return new File(
    [blob],
    `load-plant-${Date.now()}.jpg`,
    {
      type:
        "image/jpeg",
    }
  );
}

// ============================================================
// LOAD IMAGE
// ============================================================

function loadImage(
  file: File
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      const url =
        URL.createObjectURL(
          file
        );

      image.onload =
        () => {
          URL.revokeObjectURL(
            url
          );

          resolve(
            image
          );
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            url
          );

          reject(
            new Error(
              "Gagal membaca gambar."
            )
          );
        };

      image.src =
        url;
    }
  );
}

// ============================================================
// LOCAL DATE
// ============================================================

function getLocalDateString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}