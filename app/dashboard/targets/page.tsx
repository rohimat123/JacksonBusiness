import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  period?: string;
}>;

type Employee = {
  id: string;
  name: string;
  forum_name: string | null;
  seed: string;
  status: string;
  target_plants: number;
};

type PayrollPeriod = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: string;
};

type LoadReport = {
  employee_id: string;
  amount: number;
  status: string;
  report_date: string;
};

type SSRPReport = {
  employee_id: string;
  status: string;
  report_date: string;
};

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const supabase =
    await createClient();

  // =========================================================
  // PERIODS
  // =========================================================

  const {
    data: periodsData,
    error: periodsError,
  } = await supabase
    .from("payroll_periods")
    .select(`
      id,
      name,
      period_start,
      period_end,
      status
    `)
    .order("period_start", {
      ascending: false,
    });

  if (periodsError) {
    throw new Error(
      periodsError.message
    );
  }

  const periods =
    (periodsData ??
      []) as PayrollPeriod[];

  const openPeriod =
    periods.find(
      (period) =>
        period.status === "OPEN"
    );

  const selectedPeriod =
    periods.find(
      (period) =>
        period.id === params.period
    ) ??
    openPeriod ??
    periods[0];

  if (!selectedPeriod) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="depth-title text-2xl font-bold text-white">
            Target Pegawai
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Belum ada periode payroll.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // EMPLOYEES
  // =========================================================

  const {
    data: employeesData,
    error: employeesError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      forum_name,
      seed,
      status,
      target_plants
    `)
    .order("name", {
      ascending: true,
    });

  if (employeesError) {
    throw new Error(
      employeesError.message
    );
  }

  const employees =
    (employeesData ??
      []) as Employee[];

  // =========================================================
  // LOAD PLANT FOR PERIOD
  // =========================================================

  const {
    data: loadData,
    error: loadError,
  } = await supabase
    .from("load_plant_reports")
    .select(`
      employee_id,
      amount,
      status,
      report_date
    `)
    .eq("status", "APPROVED")
    .gte(
      "report_date",
      selectedPeriod.period_start
    )
    .lte(
      "report_date",
      selectedPeriod.period_end
    );

  if (loadError) {
    throw new Error(
      loadError.message
    );
  }

  const loadReports =
    (loadData ??
      []) as LoadReport[];

  // =========================================================
  // SSRP FOR PERIOD
  // =========================================================

  const {
    data: ssrpData,
    error: ssrpError,
  } = await supabase
    .from("ssrp_reports")
    .select(`
      employee_id,
      status,
      report_date
    `)
    .eq("status", "APPROVED")
    .gte(
      "report_date",
      selectedPeriod.period_start
    )
    .lte(
      "report_date",
      selectedPeriod.period_end
    );

  if (ssrpError) {
    throw new Error(
      ssrpError.message
    );
  }

  const ssrpReports =
    (ssrpData ??
      []) as SSRPReport[];

  // =========================================================
  // BUILD TARGETS
  // =========================================================

  const rows =
    employees.map(
      (employee) => {
        const approvedPlants =
          loadReports
            .filter(
              (report) =>
                report.employee_id ===
                employee.id
            )
            .reduce(
              (
                total,
                report
              ) =>
                total +
                Number(
                  report.amount
                ),
              0
            );

        const approvedSSRP =
          ssrpReports.filter(
            (report) =>
              report.employee_id ===
              employee.id
          ).length;

        const target =
          Number(
            employee.target_plants
          );

        const progress =
          target > 0
            ? Math.min(
                100,
                (approvedPlants /
                  target) *
                  100
              )
            : 0;

        const remaining =
          Math.max(
            0,
            target -
              approvedPlants
          );

        let targetStatus =
          "NOT STARTED";

        if (
          approvedPlants > 0 &&
          approvedPlants < target
        ) {
          targetStatus =
            "ON PROGRESS";
        }

        if (
          approvedPlants >= target &&
          target > 0
        ) {
          targetStatus =
            "TARGET ACHIEVED";
        }

        return {
          employee,
          approvedPlants,
          approvedSSRP,
          target,
          progress,
          remaining,
          targetStatus,
        };
      }
    );

  // =========================================================
  // SUMMARY
  // =========================================================

  const activeRows =
    rows.filter(
      (row) =>
        row.employee.status ===
        "ACTIVE"
    );

  const totalTarget =
    activeRows.reduce(
      (total, row) =>
        total + row.target,
      0
    );

  const totalApproved =
    activeRows.reduce(
      (total, row) =>
        total +
        row.approvedPlants,
      0
    );

  const overallProgress =
    totalTarget > 0
      ? Math.min(
          100,
          (totalApproved /
            totalTarget) *
            100
        )
      : 0;

  const achievedCount =
    activeRows.filter(
      (row) =>
        row.targetStatus ===
        "TARGET ACHIEVED"
    ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Pegawai
          </p>

          <h1 className="mt-1 depth-title text-2xl font-bold text-white">
            Target Pegawai
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Progress target berdasarkan Load Plant APPROVED.
          </p>
        </div>

        <form
          action="/dashboard/targets"
          method="get"
          className="flex items-center gap-2"
        >
          <select
            name="period"
            defaultValue={
              selectedPeriod.id
            }
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            {periods.map(
              (period) => (
                <option
                  key={period.id}
                  value={period.id}
                >
                  {period.name} —{" "}
                  {period.status}
                </option>
              )
            )}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Buka
          </button>
        </form>
      </div>

      {/* PERIOD INFO */}

      <div className="depth-surface rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Periode
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {
                selectedPeriod.name
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {formatDate(
                selectedPeriod.period_start
              )}
              {" - "}
              {formatDate(
                selectedPeriod.period_end
              )}
            </p>
          </div>

          <PeriodBadge
            status={
              selectedPeriod.status
            }
          />
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pegawai Aktif"
          value={String(
            activeRows.length
          )}
          description="Status ACTIVE"
        />

        <StatCard
          title="Total Approved"
          value={formatNumber(
            totalApproved
          )}
          description="Plants periode ini"
        />

        <StatCard
          title="Progress Keseluruhan"
          value={`${overallProgress.toFixed(
            1
          )}%`}
          description={`${formatNumber(
            totalApproved
          )} / ${formatNumber(
            totalTarget
          )}`}
        />

        <StatCard
          title="Target Tercapai"
          value={String(
            achievedCount
          )}
          description="Pegawai"
        />
      </div>

      {/* EMPLOYEE TARGET CARDS */}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map(
          (row) => (
            <div
              key={
                row.employee.id
              }
              className="depth-surface rounded-xl p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-white">
                    {
                      row.employee.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    {
                      row.employee.seed
                    }
                    {" • "}
                    {
                      row.employee.status
                    }
                  </p>

                  {row.employee
                    .forum_name && (
                    <p className="mt-1 text-xs text-zinc-700">
                      Forum:{" "}
                      {
                        row.employee
                          .forum_name
                      }
                    </p>
                  )}
                </div>

                <TargetBadge
                  status={
                    row.targetStatus
                  }
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Approved"
                  value={formatNumber(
                    row.approvedPlants
                  )}
                />

                <MiniStat
                  label="Target"
                  value={formatNumber(
                    row.target
                  )}
                />

                <MiniStat
                  label="Sisa"
                  value={formatNumber(
                    row.remaining
                  )}
                />

                <MiniStat
                  label="SSRP"
                  value={String(
                    row.approvedSSRP
                  )}
                />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">
                    Progress
                  </span>

                  <span className="font-semibold text-zinc-300">
                    {row.progress.toFixed(
                      1
                    )}
                    %
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-white"
                    style={{
                      width: `${row.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// =========================================================
// COMPONENTS
// =========================================================

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
    <div className="depth-surface rounded-xl p-5">
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-zinc-900/40 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function TargetBadge({
  status,
}: {
  status: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    status === "ON PROGRESS"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status ===
    "TARGET ACHIEVED"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function PeriodBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "OPEN"
      ? "border-green-900 bg-green-950/30 text-green-400"
      : "border-zinc-700 bg-zinc-900 text-zinc-400";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// FORMAT
// =========================================================

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