"use client";

import {
  ClipboardEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string | null;
  status: string;
};

export default function SSRPForm({
  employees,
}: {
  employees: Employee[];
}) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    employeeId,
    setEmployeeId,
  ] = useState(
    employees[0]?.id ?? ""
  );

  const [
    activity,
    setActivity,
  ] =
    useState("");

  const [
    reportDate,
    setReportDate,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 10)
  );

  const [
    evidenceFile,
    setEvidenceFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");

  const [
    processingImage,
    setProcessingImage,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

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

  async function prepareImage(
    file: File
  ) {
    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      throw new Error(
        "File harus berupa gambar."
      );
    }

    setProcessingImage(true);

    try {
      const resized =
        await resizeImage(
          file,
          800,
          600,
          0.85
        );

      setEvidenceFile(
        resized
      );

      setErrorMessage("");
    } finally {
      setProcessingImage(
        false
      );
    }
  }

  async function handlePaste(
    event: ClipboardEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    for (
      const item of Array.from(
        event.clipboardData.items
      )
    ) {
      if (
        !item.type.startsWith(
          "image/"
        )
      ) {
        continue;
      }

      const file =
        item.getAsFile();

      if (!file) {
        continue;
      }

      try {
        await prepareImage(
          file
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Paste gagal."
        );
      }

      return;
    }

    setErrorMessage(
      "Clipboard tidak berisi gambar."
    );
  }

  async function pasteFromClipboard() {
    try {
      setErrorMessage("");

      if (
        !navigator.clipboard
          ?.read
      ) {
        throw new Error(
          "Browser tidak mendukung Clipboard API."
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
            `ssrp-${Date.now()}.png`,
            {
              type: imageType,
            }
          );

        await prepareImage(
          file
        );

        return;
      }

      throw new Error(
        "Clipboard tidak berisi gambar."
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Paste gagal."
      );
    }
  }

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await prepareImage(
        file
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gambar gagal diproses."
      );
    }
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (!employeeId) {
      setErrorMessage(
        "Pegawai wajib dipilih."
      );
      return;
    }

    if (!activity.trim()) {
      setErrorMessage(
        "Aktivitas wajib diisi."
      );
      return;
    }

    if (!evidenceFile) {
      setErrorMessage(
        "Screenshot SSRP wajib dipaste atau dipilih."
      );
      return;
    }

    setLoading(true);

    try {
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
          "Session login tidak ditemukan."
        );
      }

      const filePath =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.jpg`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "ssrp-evidence"
          )
          .upload(
            filePath,
            evidenceFile,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                "image/jpeg",
            }
          );

      if (uploadError) {
        throw new Error(
          `Upload screenshot gagal: ${uploadError.message}`
        );
      }

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from(
            "ssrp-evidence"
          )
          .getPublicUrl(
            filePath
          );

      const {
        error: insertError,
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
              publicUrlData.publicUrl,

            submitted_by:
              user.id,

            status:
              "PENDING",
          });

      if (insertError) {
        await supabase.storage
          .from(
            "ssrp-evidence"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          insertError.message
        );
      }

      router.push(
        "/dashboard/ssrp"
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi error."
      );

      setLoading(false);
    }
  }

  if (
    employees.length === 0
  ) {
    return (
      <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-5 text-yellow-300">
        Tidak ada pegawai ACTIVE.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <Field label="Pegawai">
        <select
          value={employeeId}
          onChange={(event) =>
            setEmployeeId(
              event.target.value
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
                {employee.name} —{" "}
                {employee.seed}
              </option>
            )
          )}
        </select>
      </Field>

      <Field label="Tanggal SSRP">
        <input
          type="date"
          required
          value={
            reportDate
          }
          onChange={(event) =>
            setReportDate(
              event.target.value
            )
          }
          className={
            inputClass
          }
        />
      </Field>

      <Field label="Aktivitas / Keterangan">
        <textarea
          required
          rows={5}
          value={
            activity
          }
          onChange={(event) =>
            setActivity(
              event.target.value
            )
          }
          placeholder="Contoh: Melakukan aktivitas farming dan loading tanaman ke lumbung."
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label="Screenshot SSRP">
        <div className="space-y-4">
          <div
            tabIndex={0}
            onPaste={
              handlePaste
            }
            className="cursor-text rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center outline-none transition hover:border-zinc-500 focus:border-white"
          >
            <p className="font-semibold text-white">
              Paste Screenshot Di Sini
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Klik kotak lalu tekan
            </p>

            <p className="mt-2">
              <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-white">
                Ctrl + V
              </span>
            </p>

            <p className="mt-3 text-xs text-zinc-600">
              Otomatis resize maksimal 800×600
            </p>
          </div>

          <button
            type="button"
            onClick={
              pasteFromClipboard
            }
            disabled={
              processingImage
            }
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {processingImage
              ? "Memproses..."
              : "📋 Paste dari Clipboard"}
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
        </div>
      </Field>

      {evidenceFile && (
        <div className="rounded-xl border border-green-900 bg-green-950/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                Screenshot siap
              </p>

              <p className="mt-1 text-xs text-zinc-500">
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
              onClick={() =>
                setEvidenceFile(
                  null
                )
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
                alt="Preview SSRP"
                className="max-h-[500px] w-full object-contain"
              />
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {
            errorMessage
          }
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-300"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={
            loading ||
            processingImage
          }
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {loading
            ? "Menyimpan..."
            : "Submit SSRP"}
        </button>
      </div>
    </form>
  );
}

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

function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      const objectUrl =
        URL.createObjectURL(
          file
        );

      image.onload =
        () => {
          try {
            let width =
              image.width;

            let height =
              image.height;

            const ratio =
              Math.min(
                maxWidth /
                  width,
                maxHeight /
                  height,
                1
              );

            width =
              Math.round(
                width *
                  ratio
              );

            height =
              Math.round(
                height *
                  ratio
              );

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width =
              width;

            canvas.height =
              height;

            const ctx =
              canvas.getContext(
                "2d"
              );

            if (!ctx) {
              throw new Error(
                "Canvas tidak tersedia."
              );
            }

            ctx.drawImage(
              image,
              0,
              0,
              width,
              height
            );

            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(
                  objectUrl
                );

                if (!blob) {
                  reject(
                    new Error(
                      "Resize gambar gagal."
                    )
                  );

                  return;
                }

                resolve(
                  new File(
                    [blob],
                    `ssrp-${Date.now()}.jpg`,
                    {
                      type: "image/jpeg",
                    }
                  )
                );
              },

              "image/jpeg",
              quality
            );
          } catch (
            error
          ) {
            URL.revokeObjectURL(
              objectUrl
            );

            reject(error);
          }
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "Gambar tidak bisa dibaca."
            )
          );
        };

      image.src =
        objectUrl;
    }
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500";