import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type LoadPlantReport = {
  id: string;
  employee_id: string;
  seed: string;
  amount: number;
  report_date: string;
  status: string;
  evidence_url: string | null;
  created_at: string;
  employees:
    | {
        name: string;
        forum_name: string | null;
        position: string | null;
      }
    | {
        name: string;
        forum_name: string | null;
        position: string | null;
      }[]
    | null;
};

type ApprovedLoad = {
  seed: string;
  amount: number;
};

type ApprovedSale = {
  seed: string;
  quantity: number;
};

export default async function StorageReportsPage() {
  const supabase = await createClient();

  // ============================================================
  // SYSTEM SETTINGS
  // ============================================================

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("system_settings")
    .select("storage_capacity")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      settingsError.message
    );
  }

  const storageCapacity =
    Math.max(
      0,
      Number(
        settings?.storage_capacity ??
          75000
      ) || 75000
    );

  // ============================================================
  // LOAD REPORTS
  // ============================================================

  const {
    data: reportsData,
    error: reportsError,
  } = await supabase
    .from("load_plant_reports")
    .select(`
      id,
      employee_id,
      seed,
      amount,
      report_date,
      status,
      evidence_url,
      created_at,
      employees (
        name,
        forum_name,
        position
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (reportsError) {
    throw new Error(
      reportsError.message
    );
  }

  const reports =
    (reportsData ?? []) as LoadPlantReport[];

  // ============================================================
  // APPROVED LOAD PLANTS
  // ============================================================

  const {
    data: approvedLoadData,
    error: approvedLoadError,
  } = await supabase
    .from("load_plant_reports")
    .select("seed, amount")
    .eq("status", "APPROVED");

  if (approvedLoadError) {
    throw new Error(
      approvedLoadError.message
    );
  }

  const approvedLoads =
    (approvedLoadData ?? []) as ApprovedLoad[];

  // ============================================================
  // APPROVED SALES
  // ============================================================

  const {
    data: approvedSalesData,
    error: approvedSalesError,
  } = await supabase
    .from("sales_reports")
    .select("seed, quantity")
    .eq("status", "APPROVED");

  if (approvedSalesError) {
    throw new Error(
      approvedSalesError.message
    );
  }

  const approvedSales =
    (approvedSalesData ?? []) as ApprovedSale[];

  // ============================================================
  // CALCULATE STORAGE
  // ============================================================

  const seedTotals: Record<string, number> = {};

  for (const report of approvedLoads) {
    const seed = String(report.seed);

    seedTotals[seed] =
      (seedTotals[seed] ?? 0) +
      Number(report.amount);
  }

  for (const sale of approvedSales) {
    const seed = String(sale.seed);

    seedTotals[seed] =
      (seedTotals[seed] ?? 0) -
      Number(sale.quantity);
  }

  for (const seed of Object.keys(seedTotals)) {
    seedTotals[seed] = Math.max(
      0,
      seedTotals[seed]
    );
  }

  const totalStorage =
    Object.values(seedTotals).reduce(
      (total, amount) =>
        total + amount,
      0
    );

  const availableStorage = Math.max(
    0,
    storageCapacity -
      totalStorage
  );

  const pendingCount =
    reports.filter(
      (report) =>
        report.status ===
        "PENDING"
    ).length;

  const approvedCount =
    reports.filter(
      (report) =>
        report.status ===
        "APPROVED"
    ).length;

  const rejectedCount =
    reports.filter(
      (report) =>
        report.status ===
        "REJECTED"
    ).length;

  const seedNames =
    Array.from(
      new Set([
        ...approvedLoads.map(
          (item) =>
            String(item.seed)
        ),
        ...approvedSales.map(
          (item) =>
            String(item.seed)
        ),
      ])
    ).sort();

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="depth-title text-2xl font-bold text-white">
            Load Plant / Lumbung
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Monitoring laporan Load Plant dan stock lumbung Jackson Farm.
          </p>
        </div>

        <Link
          href="/dashboard/storage-reports/create"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          + Tambah Load Plant
        </Link>
      </div>

      {/* STORAGE SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Storage"
          value={`${formatNumber(
            totalStorage
          )} / ${formatNumber(
            storageCapacity
          )}`}
          description="Stock setelah penjualan"
        />

        <StatCard
          title="Available Storage"
          value={formatNumber(
            availableStorage
          )}
          description="Kapasitas tersisa"
        />

        <StatCard
          title="Pending Reports"
          value={String(
            pendingCount
          )}
          description="Menunggu review"
        />

        <StatCard
          title="Approved Reports"
          value={String(
            approvedCount
          )}
          description="Load Plant disetujui"
        />
      </div>

      {/* SEED STORAGE */}

      <div className="glass-panel depth-card rounded-2xl/50">
        <div className="border-b border-emerald-500/10 px-5 py-4">
          <h2 className="font-semibold text-white">
            Storage Per Seed
          </h2>

          <p className="mt-1 text-xs text-zinc-600">
            Load Plant Approved dikurangi Penjualan Approved.
          </p>
        </div>

        {seedNames.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-600">
            Belum ada stock.
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {seedNames.map(
              (seed) => (
                <div
                  key={seed}
                  className="depth-surface rounded-xl p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                    {seed}
                  </p>

                  <p className="mt-2 depth-number text-xl font-bold text-white">
                    {formatNumber(
                      seedTotals[
                        seed
                      ] ?? 0
                    )}
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Plants
                  </p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* REPORT SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-3">
        <SmallStat
          label="Pending"
          value={pendingCount}
        />

        <SmallStat
          label="Approved"
          value={approvedCount}
        />

        <SmallStat
          label="Rejected"
          value={rejectedCount}
        />
      </div>

      {/* REPORT TABLE */}

      <div className="overflow-hidden glass-panel depth-card rounded-2xl/50">
        <div className="border-b border-emerald-500/10 px-5 py-4">
          <h2 className="font-semibold text-white">
            Riwayat Load Plant
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-zinc-500">
              Belum ada laporan Load Plant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-500/10 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Tanggal
                  </th>

                  <th className="px-5 py-4">
                    Pegawai
                  </th>

                  <th className="px-5 py-4">
                    Seed
                  </th>

                  <th className="px-5 py-4 text-right">
                    Plants
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
                {reports.map(
                  (report) => {
                    const employee = Array.isArray(
                      report.employees
                    )
                      ? report
                          .employees[0]
                      : report.employees;

                    return (
                      <tr
                        key={
                          report.id
                        }
                        className="transition hover:bg-emerald-950/25/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-zinc-300">
                          {formatDate(
                            report.report_date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-200">
                            {employee?.name ??
                              "Unknown"}
                          </p>

                          {employee?.position && (
                            <p className="mt-0.5 text-xs text-zinc-600">
                              {
                                employee.position
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                            {
                              report.seed
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right font-medium text-zinc-200">
                          {formatNumber(
                            report.amount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              report.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/storage-reports/${report.id}`}
                            className="text-sm font-medium text-zinc-300 transition hover:text-white"
                          >
                            Lihat →
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
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
    <div className="glass-panel depth-card rounded-2xl/50 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 depth-title text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="depth-surface rounded-xl/50 p-4">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-1 depth-number text-xl font-bold text-white">
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
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