import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Sale = {
  id: string;
  seller_profile_id: string | null;
  seed: string;
  quantity: number;
  price_per_unit: number | string;
  total_amount: number | string;
  evidence_url: string | null;
  sale_date: string;
  status: string;
  created_at: string;
};

export default async function SalesPage() {
  const supabase = await createClient();

  // ============================================================
  // GET SALES
  // ============================================================

  const { data: salesData, error: salesError } = await supabase
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
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (salesError) {
    throw new Error(salesError.message);
  }

  const sales = (salesData ?? []) as Sale[];

  // ============================================================
  // GET SELLER PROFILES
  // ============================================================

  const sellerIds = [
    ...new Set(
      sales
        .map((sale) => sale.seller_profile_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let profileMap: Record<
    string,
    {
      full_name: string;
      position: string | null;
    }
  > = {};

  if (sellerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, position")
      .in("id", sellerIds);

    profileMap = Object.fromEntries(
      (profiles ?? []).map((profile) => [
        profile.id,
        {
          full_name: profile.full_name ?? "Unknown",
          position: profile.position ?? null,
        },
      ])
    );
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  const approvedSales = sales.filter(
    (sale) => sale.status === "APPROVED"
  );

  const pendingSales = sales.filter(
    (sale) => sale.status === "PENDING"
  );

  const rejectedSales = sales.filter(
    (sale) => sale.status === "REJECTED"
  );

  const totalApprovedQuantity = approvedSales.reduce(
    (total, sale) => total + Number(sale.quantity),
    0
  );

  const totalRevenue = approvedSales.reduce(
    (total, sale) => total + Number(sale.total_amount),
    0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Penjualan
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Laporan penjualan hasil tanaman Jackson Farm.
          </p>
        </div>

        <Link
          href="/dashboard/sales/create"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          + Tambah Penjualan
        </Link>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Terjual"
          value={formatNumber(totalApprovedQuantity)}
          description="Plants approved"
        />

        <StatCard
          title="Total Pendapatan"
          value={formatMoney(totalRevenue)}
          description="Penjualan approved"
        />

        <StatCard
          title="Pending"
          value={String(pendingSales.length)}
          description="Menunggu review"
        />

        <StatCard
          title="Rejected"
          value={String(rejectedSales.length)}
          description="Laporan ditolak"
        />
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Riwayat Penjualan
          </h2>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-zinc-500">
              Belum ada laporan penjualan.
            </p>

            <Link
              href="/dashboard/sales/create"
              className="mt-4 inline-block text-sm font-medium text-white underline"
            >
              Tambah laporan pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Tanggal
                  </th>

                  <th className="px-5 py-4">
                    Penjual
                  </th>

                  <th className="px-5 py-4">
                    Seed
                  </th>

                  <th className="px-5 py-4 text-right">
                    Plants
                  </th>

                  <th className="px-5 py-4 text-right">
                    Harga
                  </th>

                  <th className="px-5 py-4 text-right">
                    Total
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Detail
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {sales.map((sale) => {
                  const seller = sale.seller_profile_id
                    ? profileMap[sale.seller_profile_id]
                    : null;

                  return (
                    <tr
                      key={sale.id}
                      className="transition hover:bg-zinc-900/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-300">
                        {formatDate(sale.sale_date)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-200">
                          {seller?.full_name ?? "Unknown"}
                        </p>

                        {seller?.position && (
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {seller.position}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <SeedBadge seed={sale.seed} />
                      </td>

                      <td className="px-5 py-4 text-right font-medium text-zinc-200">
                        {formatNumber(sale.quantity)}
                      </td>

                      <td className="px-5 py-4 text-right text-zinc-400">
                        {formatMoney(
                          Number(sale.price_per_unit)
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-white">
                        {formatMoney(
                          Number(sale.total_amount)
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={sale.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-sm font-medium text-zinc-300 transition hover:text-white"
                        >
                          Lihat →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
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

  if (status === "APPROVED") {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (status === "PENDING") {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (status === "REJECTED") {
    style =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function SeedBadge({
  seed,
}: {
  seed: string;
}) {
  return (
    <span className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300">
      {seed}
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
    new Date(`${value}T00:00:00`)
  );
}