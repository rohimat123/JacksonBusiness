"use client";

import {
  ClipboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string;
  name: string;
  seed: string;
  status: string;
};

export default function LoadPlantForm({
  employees,
}: {
  employees: Employee[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [employeeId, setEmployeeId] = useState(
    employees[0]?.id ?? ""
  );

  const [amount, setAmount] =
    useState("");

  const [reportDate, setReportDate] =
    useState(
      getJakartaDate()
    );

  const [evidenceFile, setEvidenceFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (employee) =>
            employee.id === employeeId
        ),
      [
        employeeId,
        employees,
      ]
    );

  // ==========================================================
  // PREVIEW
  // ==========================================================

  useEffect(() => {
    if (!evidenceFile) {
      setPreviewUrl("");
      return;
    }

    const url =
      URL.createObjectURL(
        evidenceFile
      );

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [evidenceFile]);

  // ==========================================================
  // CLIPBOARD FILE
  // ==========================================================

  function processClipboardFile(
    file: File
  ) {
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "Clipboard tidak berisi gambar."
      );

      return;
    }

    const extension =
      getExtensionFromMime(
        file.type
      );

    const newFile =
      new File(
        [file],
        `clipboard-${Date.now()}.${extension}`,
        {
          type: file.type,
        }
      );

    setEvidenceFile(newFile);
    setErrorMessage("");
    setSuccessMessage("");
  }

  // ==========================================================
  // CTRL + V
  // ==========================================================

  function handlePaste(
    event: ClipboardEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const items =
      event.clipboardData.items;

    let imageFound =
      false;

    for (
      let i = 0;
      i < items.length;
      i++
    ) {
      const item =
        items[i];

      if (
        item.type.startsWith(
          "image/"
        )
      ) {
        const file =
          item.getAsFile();

        if (file) {
          processClipboardFile(
            file
          );

          imageFound =
            true;

          break;
        }
      }
    }

    if (!imageFound) {
      setErrorMessage(
        "Clipboard tidak berisi gambar. Copy screenshot dulu lalu Ctrl + V."
      );
    }
  }

  // ==========================================================
  // PASTE BUTTON
  // ==========================================================

  async function pasteFromClipboard() {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (
        !navigator.clipboard ||
        !navigator.clipboard.read
      ) {
        throw new Error(
          "Browser ini tidak mendukung Clipboard Image API."
        );
      }

      const clipboardItems =
        await navigator.clipboard.read();

      for (
        const clipboardItem
        of clipboardItems
      ) {
        const imageType =
          clipboardItem.types.find(
            (type) =>
              type.startsWith(
                "image/"
              )
          );

        if (!imageType) {
          continue;
        }

        const blob =
          await clipboardItem.getType(
            imageType
          );

        const extension =
          getExtensionFromMime(
            imageType
          );

        const file =
          new File(
            [blob],
            `clipboard-${Date.now()}.${extension}`,
            {
              type:
                imageType,
            }
          );

        processClipboardFile(
          file
        );

        return;
      }

      throw new Error(
        "Clipboard tidak berisi gambar."
      );
    } catch (error) {
      if (
        error instanceof Error
      ) {
        setErrorMessage(
          `Paste gagal: ${error.message}`
        );
      } else {
        setErrorMessage(
          "Paste clipboard gagal."
        );
      }
    }
  }

  // ==========================================================
  // FILE INPUT
  // ==========================================================

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setEvidenceFile(file);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function clearImage() {
    setEvidenceFile(null);
    setPreviewUrl("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!selectedEmployee) {
      setErrorMessage(
        "Pegawai tidak ditemukan."
      );

      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setErrorMessage(
        "Jumlah plant harus lebih dari 0."
      );

      return;
    }

    if (!reportDate) {
      setErrorMessage(
        "Tanggal wajib diisi."
      );

      return;
    }

    if (!evidenceFile) {
      setErrorMessage(
        "Screenshot bukti wajib dipaste atau dipilih."
      );

      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    let uploadedFilePath:
      | string
      | null = null;

    try {
      // ======================================================
      // AUTH
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
      // FILE VALIDATION
      // ======================================================

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          evidenceFile.type
        )
      ) {
        throw new Error(
          "Format gambar harus JPG, PNG, atau WEBP."
        );
      }

      const MAX_FILE_SIZE =
        5 * 1024 * 1024;

      if (
        evidenceFile.size >
        MAX_FILE_SIZE
      ) {
        throw new Error(
          `Ukuran gambar maksimal 5 MB. File kamu sekarang ${(
            evidenceFile.size /
            1024 /
            1024
          ).toFixed(2)} MB.`
        );
      }

      // ======================================================
      // UPLOAD
      // ======================================================

      const extension =
        getExtensionFromMime(
          evidenceFile.type
        );

      const filePath =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      uploadedFilePath =
        filePath;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "load-plant-evidence"
          )
          .upload(
            filePath,
            evidenceFile,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                evidenceFile.type,
            }
          );

      if (uploadError) {
        throw new Error(
          `Upload screenshot gagal: ${uploadError.message}`
        );
      }

      // ======================================================
      // PUBLIC URL
      // ======================================================

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from(
            "load-plant-evidence"
          )
          .getPublicUrl(
            filePath
          );

      if (
        !publicUrlData?.publicUrl
      ) {
        throw new Error(
          "Public URL screenshot gagal dibuat."
        );
      }

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
              selectedEmployee.id,

            seed:
              selectedEmployee.seed,

            amount:
              numericAmount,

            report_date:
              reportDate,

            evidence_url:
              publicUrlData.publicUrl,

            status:
              "PENDING",

            submitted_by:
              user.id,
          })
          .select(`
            id,
            status
          `)
          .single();

      if (insertError) {
        throw new Error(
          `Database gagal menyimpan laporan: ${insertError.message}`
        );
      }

      if (!insertedReport) {
        throw new Error(
          "Laporan gagal dibuat."
        );
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      setSuccessMessage(
        "Load Plant berhasil dikirim dan menunggu review."
      );

      setAmount("");
      setEvidenceFile(null);
      setPreviewUrl("");

      router.push(
        "/dashboard/storage-reports/mine"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "LOAD PLANT SUBMIT ERROR:",
        error
      );

      // kalau upload sudah berhasil tapi insert DB gagal,
      // hapus file supaya tidak jadi orphan file
      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from(
              "load-plant-evidence"
            )
            .remove([
              uploadedFilePath,
            ]);
        } catch (
          cleanupError
        ) {
          console.error(
            "CLEANUP FILE ERROR:",
            cleanupError
          );
        }
      }

      if (
        error instanceof Error
      ) {
        setErrorMessage(
          error.message
        );
      } else {
        setErrorMessage(
          "Terjadi error saat mengirim Load Plant."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // NO EMPLOYEE
  // ==========================================================

  if (
    employees.length === 0
  ) {
    return (
      <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-5 text-sm text-yellow-300">
        Tidak ada pegawai ACTIVE.
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <Field label="Pegawai">
        <select
          value={employeeId}
          onChange={(e) =>
            setEmployeeId(
              e.target.value
            )
          }
          className={
            inputClass
          }
        >
          {employees.map(
            (employee) => (
              <option
                key={
                  employee.id
                }
                value={
                  employee.id
                }
              >
                {employee.name}
              </option>
            )
          )}
        </select>
      </Field>

      <Field label="Seed">
        <input
          value={
            selectedEmployee?.seed ??
            ""
          }
          disabled
          className={`${inputClass} cursor-not-allowed opacity-60`}
        />
      </Field>

      <Field label="Jumlah Plant">
        <input
          type="number"
          min="1"
          required
          value={amount}
          onChange={(e) =>
            setAmount(
              e.target.value
            )
          }
          placeholder="Contoh: 4879"
          className={
            inputClass
          }
        />
      </Field>

      <Field label="Tanggal">
        <input
          type="date"
          required
          value={reportDate}
          onChange={(e) =>
            setReportDate(
              e.target.value
            )
          }
          className={
            inputClass
          }
        />
      </Field>

      <Field label="Screenshot Bukti">
        <div className="space-y-4">
          <div
            tabIndex={0}
            onPaste={handlePaste}
            className="cursor-text rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center outline-none transition hover:border-zinc-500 focus:border-white"
          >
            <p className="text-base font-semibold text-white">
              Paste Screenshot Di Sini
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Klik kotak ini terlebih dahulu
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              lalu tekan{" "}
              <span className="rounded bg-zinc-800 px-2 py-1 font-semibold text-white">
                Ctrl + V
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={
              pasteFromClipboard
            }
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            📋 Paste dari Clipboard
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />

            <span className="text-xs text-zinc-600">
              ATAU
            </span>

            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={
              handleFileChange
            }
            className="block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
          />

          <p className="text-xs text-zinc-600">
            JPG, PNG, WEBP. Maksimal 5 MB.
          </p>
        </div>
      </Field>

      {evidenceFile && (
        <div className="rounded-xl border border-green-900 bg-green-950/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                Screenshot berhasil dibaca
              </p>

              <p className="mt-2 text-sm text-zinc-200">
                {evidenceFile.name}
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {(
                  evidenceFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearImage
              }
              className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400"
            >
              Hapus
            </button>
          </div>

          {previewUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <img
                src={
                  previewUrl
                }
                alt="Preview screenshot"
                className="max-h-[500px] w-full object-contain"
              />
            </div>
          )}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-900 bg-green-950/30 px-4 py-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          disabled={
            loading
          }
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300 disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Mengupload..."
            : "Submit Laporan"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      {children}
    </div>
  );
}

// ============================================================
// MIME
// ============================================================

function getExtensionFromMime(
  mime: string
) {
  if (
    mime === "image/png"
  ) {
    return "png";
  }

  if (
    mime === "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

// ============================================================
// WIB DATE
// ============================================================

function getJakartaDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Jakarta",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

// ============================================================
// STYLE
// ============================================================

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500";