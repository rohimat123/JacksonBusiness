"use client";

import {
  ClipboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  stockBySeed: Record<
    string,
    number
  >;
};

export default function SalesForm({
  stockBySeed,
}: Props) {
  const router =
    useRouter();

  const supabase =
    createClient();

  const availableSeeds =
    useMemo(
      () =>
        Object.keys(
          stockBySeed
        ).sort(),
      [stockBySeed]
    );

  const [seed, setSeed] =
    useState(
      availableSeeds[0] ??
        ""
    );

  const [quantity, setQuantity] =
    useState("");

  const [
    pricePerUnit,
    setPricePerUnit,
  ] = useState("0.60");

  const [saleDate, setSaleDate] =
    useState(
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

  const [loading, setLoading] =
    useState(false);

  const [
    processingImage,
    setProcessingImage,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const availableStock =
    stockBySeed[seed] ??
    0;

  const quantityNumber =
    Number(quantity) || 0;

  const priceNumber =
    Number(pricePerUnit) ||
    0;

  const totalAmount =
    quantityNumber *
    priceNumber;

  const remainingStock =
    Math.max(
      0,
      availableStock -
        quantityNumber
    );

  // ============================================================
  // PREVIEW
  // ============================================================

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
      URL.revokeObjectURL(
        url
      );
    };
  }, [evidenceFile]);

  // ============================================================
  // IMAGE PROCESSING 800 x 600 MAX
  // ============================================================

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

    setProcessingImage(
      true
    );

    try {
      const compressed =
        await resizeImage(
          file,
          800,
          600,
          0.85
        );

      setEvidenceFile(
        compressed
      );

      setErrorMessage("");
    } finally {
      setProcessingImage(
        false
      );
    }
  }

  // ============================================================
  // CTRL + V
  // ============================================================

  async function handlePaste(
    event: ClipboardEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    const items =
      event.clipboardData
        .items;

    for (
      const item of
        Array.from(items)
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
            : "Paste gambar gagal."
        );
      }

      return;
    }

    setErrorMessage(
      "Clipboard tidak berisi gambar."
    );
  }

  // ============================================================
  // PASTE BUTTON
  // ============================================================

  async function pasteFromClipboard() {
    setErrorMessage("");

    try {
      if (
        !navigator.clipboard
          ?.read
      ) {
        throw new Error(
          "Browser tidak mendukung Clipboard Image API."
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
          getExtension(
            imageType
          );

        const file =
          new File(
            [blob],
            `clipboard-${Date.now()}.${extension}`,
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
          ? `Paste gagal: ${error.message}`
          : "Paste gagal."
      );
    }
  }

  // ============================================================
  // FILE INPUT
  // ============================================================

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

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

  function clearImage() {
    setEvidenceFile(null);
    setPreviewUrl("");
    setErrorMessage("");
  }

  // ============================================================
  // SUBMIT
  // ============================================================

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (!seed) {
      setErrorMessage(
        "Seed wajib dipilih."
      );
      return;
    }

    if (
      quantityNumber <= 0
    ) {
      setErrorMessage(
        "Jumlah penjualan harus lebih dari 0."
      );
      return;
    }

    if (
      priceNumber <= 0
    ) {
      setErrorMessage(
        "Harga per plant harus lebih dari 0."
      );
      return;
    }

    if (
      quantityNumber >
      availableStock
    ) {
      setErrorMessage(
        `Stock ${seed} tidak cukup. Tersedia ${formatNumber(
          availableStock
        )} plants.`
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

    try {
      // ========================================================
      // AUTH
      // ========================================================

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

      // ========================================================
      // UPLOAD SCREENSHOT
      // ========================================================

      const extension =
        getExtension(
          evidenceFile.type
        );

      const filePath =
        `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "sales-evidence"
          )
          .upload(
            filePath,
            evidenceFile,
            {
              cacheControl:
                "3600",
              upsert: false,
              contentType:
                evidenceFile.type,
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          `Upload screenshot gagal: ${uploadError.message}`
        );
      }

      // ========================================================
      // PUBLIC URL
      // ========================================================

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "sales-evidence"
          )
          .getPublicUrl(
            filePath
          );

      // ========================================================
      // INSERT SALES REPORT
      // ========================================================

      const {
        error:
          insertError,
      } =
        await supabase
          .from(
            "sales_reports"
          )
          .insert({
            seller_profile_id:
              user.id,

            seed,

            quantity:
              quantityNumber,

            price_per_unit:
              priceNumber,

            evidence_url:
              publicUrlData.publicUrl,

            sale_date:
              saleDate,

            status:
              "PENDING",
          });

      if (
        insertError
      ) {
        // Kalau insert gagal, hapus file tadi
        await supabase.storage
          .from(
            "sales-evidence"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          insertError.message
        );
      }

      router.push(
        "/dashboard/sales"
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

  // ============================================================
  // EMPTY STOCK
  // ============================================================

  if (
    availableSeeds.length ===
    0
  ) {
    return (
      <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-5">
        <p className="font-medium text-yellow-300">
          Storage masih kosong.
        </p>

        <p className="mt-1 text-sm text-yellow-600">
          Approve laporan Load Plant terlebih dahulu sebelum membuat penjualan.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      {/* SEED */}

      <Field label="Seed">
        <select
          value={seed}
          onChange={(event) =>
            setSeed(
              event.target
                .value
            )
          }
          className={
            inputClass
          }
        >
          {availableSeeds.map(
            (
              seedName
            ) => (
              <option
                key={
                  seedName
                }
                value={
                  seedName
                }
              >
                {
                  seedName
                }{" "}
                —{" "}
                {formatNumber(
                  stockBySeed[
                    seedName
                  ]
                )}{" "}
                plants
              </option>
            )
          )}
        </select>
      </Field>

      {/* STOCK INFO */}

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard
          title="Stock Tersedia"
          value={`${formatNumber(
            availableStock
          )} Plants`}
        />

        <InfoCard
          title="Sisa Setelah Penjualan"
          value={`${formatNumber(
            remainingStock
          )} Plants`}
        />
      </div>

      {/* QUANTITY */}

      <Field label="Jumlah Plants Dijual">
        <input
          type="number"
          min="1"
          max={
            availableStock
          }
          required
          value={
            quantity
          }
          onChange={(event) =>
            setQuantity(
              event.target
                .value
            )
          }
          placeholder="Contoh: 2000"
          className={
            inputClass
          }
        />
      </Field>

      {/* PRICE */}

      <Field label="Harga Per Plant">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            $
          </span>

          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={
              pricePerUnit
            }
            onChange={(
              event
            ) =>
              setPricePerUnit(
                event.target
                  .value
              )
            }
            className={`${inputClass} pl-8`}
          />
        </div>
      </Field>

      {/* TOTAL */}

      <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-500">
          Total Penjualan
        </p>

        <p className="mt-2 text-3xl font-bold text-white">
          {formatMoney(
            totalAmount
          )}
        </p>

        <p className="mt-1 text-xs text-zinc-600">
          {formatNumber(
            quantityNumber
          )}{" "}
          plants ×{" "}
          {formatMoney(
            priceNumber
          )}
        </p>
      </div>

      {/* DATE */}

      <Field label="Tanggal Penjualan">
        <input
          type="date"
          required
          value={
            saleDate
          }
          onChange={(
            event
          ) =>
            setSaleDate(
              event.target
                .value
            )
          }
          className={
            inputClass
          }
        />
      </Field>

      {/* SCREENSHOT */}

      <Field label="Screenshot Bukti">
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
              Klik kotak ini lalu tekan
            </p>

            <p className="mt-2">
              <span className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-semibold text-white">
                Ctrl + V
              </span>
            </p>

            <p className="mt-3 text-xs text-zinc-600">
              Gambar otomatis diresize maksimal 800×600
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
              ? "Memproses gambar..."
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

      {/* PREVIEW */}

      {evidenceFile && (
        <div className="rounded-xl border border-green-900 bg-green-950/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-500">
                Screenshot siap
              </p>

              <p className="mt-2 text-sm text-zinc-300">
                {
                  evidenceFile.name
                }
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {(
                  evidenceFile.size /
                  1024 /
                  1024
                ).toFixed(
                  2
                )}{" "}
                MB
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearImage
              }
              className="rounded-lg border border-red-900 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-950/30"
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

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {
            errorMessage
          }
        </div>
      )}

      {/* BUTTONS */}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          disabled={
            loading
          }
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={
            loading ||
            processingImage
          }
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Menyimpan..."
            : "Submit Penjualan"}
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
// INFO CARD
// ============================================================

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {title}
      </p>

      <p className="mt-2 text-lg font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// IMAGE RESIZE
// ============================================================

function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<File> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
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

            const context =
              canvas.getContext(
                "2d"
              );

            if (
              !context
            ) {
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

            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(
                  objectUrl
                );

                if (
                  !blob
                ) {
                  reject(
                    new Error(
                      "Gagal memproses screenshot."
                    )
                  );
                  return;
                }

                const resizedFile =
                  new File(
                    [
                      blob,
                    ],
                    `sales-${Date.now()}.jpg`,
                    {
                      type: "image/jpeg",
                    }
                  );

                resolve(
                  resizedFile
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

            reject(
              error
            );
          }
        };

      image.onerror =
        () => {
          URL.revokeObjectURL(
            objectUrl
          );

          reject(
            new Error(
              "Gambar tidak dapat dibaca."
            )
          );
        };

      image.src =
        objectUrl;
    }
  );
}

// ============================================================
// UTILITIES
// ============================================================

function getExtension(
  mime: string
) {
  if (
    mime ===
    "image/png"
  ) {
    return "png";
  }

  if (
    mime ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(value);
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(value);
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500";