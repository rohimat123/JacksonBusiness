import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewActions from "./review-actions";

type SaleRow = {
  id: string;
  seller_profile_id: string | null;
  seed: string;
  quantity: number;
  price_per_unit: number | string;
  total_amount: number | string;
  evidence_url: string | null;
  sale_date: string;
  status: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

export default async function SalesDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const supabase =
    await createClient();

  // ============================================================
  // GET SALE
  // ============================================================

  const {
    data: saleData,
    error: saleError,
  } = await supabase
    .from("sales_reports")
    .select(`
      id,
      seller_profile_id,
      seed,
      quantity,
      price_per_unit,
      total_amount,
      evidence_url,
      sale_date,
      status,
      reviewed_at,
      rejection_reason,
      created_at
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    saleError ||
    !saleData
  ) {
    notFound();
  }

  const sale =
    saleData as SaleRow;

  // ============================================================
  // SELLER PROFILE
  // ============================================================

  let seller:
    | {
        full_name: string;
        position: string | null;
      }
    | null = null;

  if (
    sale.seller_profile_id
  ) {
    const {
      data: sellerData,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, position"
      )
      .eq(
        "id",
        sale.seller_profile_id
      )
      .maybeSingle();

    seller =
      sellerData ?? null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/sales"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Kembali ke Penjualan
          </Link>

          <h1 className="mt-4 depth-title text-2xl font-bold text-white">
            Detail Penjualan
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            ID laporan:{" "}
            <span className="font-mono text-zinc-400">
              {sale.id}
            </span>
          </p>
        </div>

        {sale.status ===
          "PENDING" && (
          <ReviewActions
            reportId={sale.id}
          />
        )}
      </div>

      {/* STATUS */}

      <div className="glass-panel depth-card rounded-2xl/50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Status Laporan
            </p>

            <div className="mt-2">
              <StatusBadge
                status={
                  sale.status
                }
              />
            </div>
          </div>

          {sale.reviewed_at && (
            <div className="text-sm text-zinc-500">
              Direview:{" "}
              <span className="text-zinc-300">
                {formatDateTime(
                  sale.reviewed_at
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Seed"
          value={sale.seed}
        />

        <StatCard
          title="Plants"
          value={formatNumber(
            sale.quantity
          )}
        />

        <StatCard
          title="Harga / Plant"
          value={formatMoney(
            Number(
              sale.price_per_unit
            )
          )}
        />

        <StatCard
          title="Total"
          value={formatMoney(
            Number(
              sale.total_amount
            )
          )}
        />
      </div>

      {/* INFO */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SELLER */}

        <section className="glass-panel depth-card rounded-2xl/50 p-6">
          <h2 className="font-semibold text-white">
            Informasi Penjual
          </h2>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Nama"
              value={
                seller?.full_name ??
                "Unknown"
              }
            />

            <InfoRow
              label="Position"
              value={
                seller?.position ??
                "-"
              }
            />

            <InfoRow
              label="Profile ID"
              value={
                sale.seller_profile_id ??
                "-"
              }
              mono
            />
          </div>
        </section>

        {/* REPORT */}

        <section className="glass-panel depth-card rounded-2xl/50 p-6">
          <h2 className="font-semibold text-white">
            Informasi Penjualan
          </h2>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Tanggal"
              value={formatDate(
                sale.sale_date
              )}
            />

            <InfoRow
              label="Seed"
              value={sale.seed}
            />

            <InfoRow
              label="Jumlah"
              value={`${formatNumber(
                sale.quantity
              )} Plants`}
            />

            <InfoRow
              label="Harga"
              value={`${formatMoney(
                Number(
                  sale.price_per_unit
                )
              )} / plant`}
            />

            <InfoRow
              label="Total"
              value={formatMoney(
                Number(
                  sale.total_amount
                )
              )}
            />
          </div>
        </section>
      </div>

      {/* REJECTION */}

      {sale.status ===
        "REJECTED" &&
        sale.rejection_reason && (
          <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Alasan Penolakan
            </p>

            <p className="mt-3 text-sm leading-6 text-red-200">
              {
                sale.rejection_reason
              }
            </p>
          </section>
        )}

      {/* SCREENSHOT */}

      <section className="glass-panel depth-card rounded-2xl/50 p-6">
        <h2 className="font-semibold text-white">
          Screenshot Bukti
        </h2>

        <div className="mt-5">
          {sale.evidence_url ? (
            <div className="overflow-hidden rounded-xl border border-emerald-500/15 bg-black">
              <img
                src={
                  sale.evidence_url
                }
                alt="Bukti Penjualan"
                className="max-h-[700px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-600">
              Tidak ada screenshot.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="glass-panel depth-card rounded-2xl/50 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 depth-title text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-zinc-900 pb-3 last:border-0 last:pb-0">
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p
        className={`break-all text-sm text-zinc-200 ${
          mono
            ? "font-mono"
            : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    status === "APPROVED"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    status === "PENDING"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status === "REJECTED"
  ) {
    style =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

// ============================================================
// FORMAT
// ============================================================

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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}