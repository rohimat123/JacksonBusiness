"use client";

import {
  ClipboardEvent,
  ChangeEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SSRP_BUCKET =
  "ssrp-evidence";

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

type Props = {
  employeeId: string;
  employeeName: string;
  employeeSeed: string;
};

export default function EmployeeSSRPForm({
  employeeId,
  employeeName,
  employeeSeed,
}: Props) {
  const router =
    useRouter();

  const [activity, setActivity] =
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
  // FILE
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

      setImageFile(
        resized
      );

      setPreviewUrl(
        URL.createObjectURL(
          resized
        )
      );
    } catch {
      setErrorMessage(
        "Gagal memproses gambar."
      );
    }
  }

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

  async function pasteFromClipboard() {
    setErrorMessage("");

    try {
      const clipboardItems =
        await navigator.clipboard.read();

      for (
        const item of
        clipboardItems
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
            [
              blob,
            ],
            `ssrp-${Date.now()}.png`,
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
    } catch {
      setErrorMessage(
        "Browser tidak mengizinkan membaca clipboard. Coba klik area halaman lalu Ctrl+V."
      );
    }
  }

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
  // SUBMIT
  // ==========================================================

async function submitSSRP() {
  setErrorMessage("");
  setSuccessMessage("");

  console.log("SSRP DEBUG:", {
    employeeId,
    employeeName,
    employeeSeed,
  });

  if (!employeeId) {
    setErrorMessage(
      "Employee ID tidak ditemukan. Silakan refresh halaman atau hubungi Owner."
    );
    return;
  }

  if (!activity.trim()) {
    setErrorMessage(
      "Aktivitas SSRP wajib diisi."
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
      "Screenshot SSRP wajib diisi."
    );
    return;
  }

  setLoading(true);

    try {
      const supabase =
        createClient();

      const {
        data: {
          user,
        },
        error:
          userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "Session login tidak ditemukan."
        );
      }

      // ======================================================
      // UPLOAD SCREENSHOT
      // ======================================================

      const extension =
        "jpg";

      const filename =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            SSRP_BUCKET
          )
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

      if (
        uploadError
      ) {
        throw new Error(
          `Upload screenshot gagal: ${uploadError.message}`
        );
      }

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            SSRP_BUCKET
          )
          .getPublicUrl(
            filename
          );

      const evidenceUrl =
        publicUrlData
          .publicUrl;

      // ======================================================
      // INSERT SSRP
      // ======================================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "ssrp_reports"
          )
          .insert({
            employee_id:
              employeeId,

            activity:
              activity.trim(),

            report_date:
              reportDate,

            evidence_url:
              evidenceUrl,

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
          });

      if (
        insertError
      ) {
        // Kalau insert gagal,
        // hapus screenshot supaya tidak menjadi file orphan.
        await supabase.storage
          .from(
            SSRP_BUCKET
          )
          .remove([
            filename,
          ]);

        throw insertError;
      }

      setActivity("");
      removeImage();

      setSuccessMessage(
        "SSRP berhasil dikirim dan menunggu review."
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengirim SSRP."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onPaste={
        handlePaste
      }
      className="space-y-5"
    >
      {/* EMPLOYEE */}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="depth-surface rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-600">
            Pegawai
          </p>

          <p className="mt-2 font-semibold text-white">
            {
              employeeName
            }
          </p>
        </div>

        <div className="depth-surface rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-600">
            Seed
          </p>

          <p className="mt-2 font-semibold text-white">
            {
              employeeSeed
            }
          </p>
        </div>
      </div>

      {/* ACTIVITY */}

      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Aktivitas
        </label>

        <textarea
          value={
            activity
          }
          onChange={(
            event
          ) =>
            setActivity(
              event.target.value
            )
          }
          rows={4}
          placeholder="Contoh: Melakukan perbaikan pada Ban Combine"
          className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
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
          onChange={(
            event
          ) =>
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
          Screenshot SSRP
        </label>

        <button
          type="button"
          onClick={
            pasteFromClipboard
          }
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
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
          className="block w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-400"
        />

        <p className="mt-2 text-xs text-zinc-600">
          Bisa juga langsung tekan Ctrl+V di halaman ini.
          Gambar otomatis diperkecil maksimal 800×600.
        </p>
      </div>

      {/* PREVIEW */}

      {previewUrl && (
        <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/10 p-4">
          <div className="mb-3 flex items-center justify-between">
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
              className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30"
            >
              Hapus
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-emerald-500/15 bg-black">
            <img
              src={
                previewUrl
              }
              alt="Preview SSRP"
              className="max-h-[600px] w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          {
            errorMessage
          }
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="rounded-xl border border-green-900 bg-green-950/20 px-4 py-3 text-sm text-green-400">
          {
            successMessage
          }
        </div>
      )}

      {/* SUBMIT */}

      <button
        type="button"
        onClick={
          submitSSRP
        }
        disabled={
          loading
        }
        className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Mengirim SSRP..."
          : "Kirim SSRP"}
      </button>
    </div>
  );
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
          (
            result
          ) => {
            if (
              result
            ) {
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
    [
      blob,
    ],
    `ssrp-${Date.now()}.jpg`,
    {
      type:
        "image/jpeg",
    }
  );
}

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

function getLocalDateString() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
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