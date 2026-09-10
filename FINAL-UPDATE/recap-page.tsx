import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  period?: string;
}>;

type Employee = {
  id: string;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string | null;
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

type LoadPlantReport = {
  employee_id: string;
  amount: number;
};

type SSRPReport = {
  employee_id: string;
};

type ShiftAssignment = {
  employee_id: string;
  shift_date: string;
};

type PayrollRecord = {
  employee_id: string;
  approved_plants: number;
  gross_salary: number | string;
  bonus: number | string;
  fine: number | string;
  total_salary: number | string;
  status: string;
  paid_at: string | null;
};

export default async function RecapPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params =
    await searchParams;

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
        period.id ===
        params.period
    ) ??
    openPeriod ??
    periods[0];

  if (!selectedPeriod) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">
          Rekap
        </h1>

        <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-5 text-yellow-300">
          Belum ada periode payroll.
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
      position,
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
  // LOAD PLANT
  // =========================================================

  const {
    data: loadData,
    error: loadError,
  } = await supabase
    .from("load_plant_reports")
    .select(`
      employee_id,
      amount
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
      []) as LoadPlantReport[];

  // =========================================================
  // SSRP
  // =========================================================

  const {
    data: ssrpData,
    error: ssrpError,
  } = await supabase
    .from("ssrp_reports")
    .select(`
      employee_id
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
  // SHIFTS
  // =========================================================

  const {
    data: shiftData,
    error: shiftError,
  } = await supabase
    .from("shift_assignments")
    .select(`
      employee_id,
      shift_date
    `)
    .gte(
      "shift_date",
      selectedPeriod.period_start
    )
    .lte(
      "shift_date",
      selectedPeriod.period_end
    );

  if (shiftError) {
    throw new Error(
      shiftError.message
    );
  }

  const shifts =
    (shiftData ??
      []) as ShiftAssignment[];

  // =========================================================
  // PAYROLL
  // =========================================================

  const {
    data: payrollData,
    error: payrollError,
  } = await supabase
    .from("payroll_records")
    .select(`
      employee_id,
      approved_plants,
      gross_salary,
      bonus,
      fine,
      total_salary,
      status,
      paid_at
    `)
    .eq(
      "period_start",
      selectedPeriod.period_start
    )
    .eq(
      "period_end",
      selectedPeriod.period_end
    );

  if (payrollError) {
    throw new Error(
      payrollError.message
    );
  }

  const payrollRecords =
    (payrollData ??
      []) as PayrollRecord[];

  const payrollMap =
    new Map(
      payrollRecords.map(
        (record) => [
          record.employee_id,
          record,
        ]
      )
    );

  // =========================================================
  // BUILD ROWS
  // =========================================================

  const rows =
    employees
      .map(
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

          const shiftCount =
            shifts.filter(
              (shift) =>
                shift.employee_id ===
                employee.id
            ).length;

          const payroll =
            payrollMap.get(
              employee.id
            );

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

          const targetStatus =
            approvedPlants >=
              target &&
            target > 0
              ? "ACHIEVED"
              : approvedPlants >
                  0
                ? "ON PROGRESS"
                : "NOT STARTED";

          let payrollStatus =
            "NO SALARY";

          if (payroll) {
            payrollStatus =
              payroll.status;
          } else if (
            employee.status ===
            "RESIGNED"
          ) {
            payrollStatus =
              "VOID";
          } else if (
            approvedPlants > 0
          ) {
            payrollStatus =
              "UNPAID";
          }

          const payrollTotal =
            payroll
              ? Number(
                  payroll.total_salary
                )
              : approvedPlants *
                0.3;

          const hasPeriodActivity =
            approvedPlants > 0 ||
            approvedSSRP > 0 ||
            shiftCount > 0 ||
            Boolean(payroll);

          return {
            employee,
            approvedPlants,
            approvedSSRP,
            shiftCount,
            target,
            progress,
            remaining,
            targetStatus,
            payroll,
            payrollTotal,
            payrollStatus,
            hasPeriodActivity,
          };
        }
      )
      // ACTIVE selalu tampil.
      // RESIGNED hanya tampil jika memang punya aktivitas/history pada periode.
      .filter(
        (row) =>
          row.employee.status ===
            "ACTIVE" ||
          row.hasPeriodActivity
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

  const totalApproved =
    rows.reduce(
      (total, row) =>
        total +
        row.approvedPlants,
      0
    );

  const totalSSRP =
    rows.reduce(
      (total, row) =>
        total +
        row.approvedSSRP,
      0
    );

  const totalShifts =
    rows.reduce(
      (total, row) =>
        total +
        row.shiftCount,
      0
    );

  const totalTarget =
    activeRows.reduce(
      (total, row) =>
        total +
        row.target,
      0
    );

  const overallProgress =
    totalTarget > 0
      ? Math.min(
          100,
          (activeRows.reduce(
            (total, row) =>
              total +
              row.approvedPlants,
            0
          ) /
            totalTarget) *
            100
        )
      : 0;

  const achievedCount =
    activeRows.filter(
      (row) =>
        row.targetStatus ===
        "ACHIEVED"
    ).length;

  const totalPayrollPaid =
    payrollRecords
      .filter(
        (record) =>
          record.status ===
          "PAID"
      )
      .reduce(
        (
          total,
          record
        ) =>
          total +
          Number(
            record.total_salary
          ),
        0
      );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Management
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white">
            Rekap
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Ringkasan aktivitas pegawai Jackson Farm per periode.
          </p>
        </div>

        <form
          action="/dashboard/recap"
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
                  key={
                    period.id
                  }
                  value={
                    period.id
                  }
                >
                  {period.name} —{" "}
                  {period.status}
                </option>
              )
            )}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Buka
          </button>
        </form>
      </div>

      {/* PERIOD */}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Periode Rekap
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          title="Load Plant"
          value={formatNumber(
            totalApproved
          )}
          description="Approved plants"
        />

        <StatCard
          title="SSRP"
          value={String(
            totalSSRP
          )}
          description="Approved SSRP"
        />

        <StatCard
          title="Shift"
          value={String(
            totalShifts
          )}
          description="Assignment"
        />

        <StatCard
          title="Progress"
          value={`${overallProgress.toFixed(
            1
          )}%`}
          description={`${formatNumber(
            activeRows.reduce(
              (total, row) =>
                total +
                row.approvedPlants,
              0
            )
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

        <StatCard
          title="Payroll Dibayar"
          value={formatMoney(
            totalPayrollPaid
          )}
          description="Status PAID"
        />
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">
                Rekap Pegawai
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {
                  selectedPeriod.name
                }
              </p>
            </div>

            <span className="text-xs text-zinc-600">
              {
                rows.length
              }{" "}
              Pegawai
            </span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-zinc-500">
            Belum ada data untuk periode ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-4">
                    Pegawai
                  </th>

                  <th className="px-5 py-4">
                    Seed
                  </th>

                  <th className="px-5 py-4 text-right">
                    Plants
                  </th>

                  <th className="px-5 py-4 text-right">
                    Target
                  </th>

                  <th className="px-5 py-4">
                    Progress
                  </th>

                  <th className="px-5 py-4 text-center">
                    SSRP
                  </th>

                  <th className="px-5 py-4 text-center">
                    Shift
                  </th>

                  <th className="px-5 py-4 text-right">
                    Payroll
                  </th>

                  <th className="px-5 py-4">
                    Gaji
                  </th>

                  <th className="px-5 py-4">
                    Pegawai
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {rows.map(
                  (row) => (
                    <tr
                      key={
                        row.employee.id
                      }
                      className="transition hover:bg-zinc-900/40"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {
                            row.employee.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {row.employee.forum_name ??
                            "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-medium text-zinc-300">
                          {
                            row.employee.seed
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-white">
                        {formatNumber(
                          row.approvedPlants
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-zinc-300">
                        {formatNumber(
                          row.target
                        )}
                      </td>

                      <td className="min-w-[220px] px-5 py-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">
                            {row.progress.toFixed(
                              1
                            )}
                            %
                          </span>

                          <span className="text-zinc-600">
                            Sisa{" "}
                            {formatNumber(
                              row.remaining
                            )}
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

                        <div className="mt-2">
                          <TargetBadge
                            status={
                              row.targetStatus
                            }
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-green-400">
                          {
                            row.approvedSSRP
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-blue-300">
                          {
                            row.shiftCount
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="font-bold text-white">
                          {formatMoney(
                            row.payrollTotal
                          )}
                        </p>

                        {row.payroll && (
                          <>
                            <p className="mt-1 text-xs text-green-500">
                              Bonus +{" "}
                              {formatMoney(
                                Number(
                                  row.payroll.bonus
                                )
                              )}
                            </p>

                            <p className="mt-1 text-xs text-red-500">
                              Denda -{" "}
                              {formatMoney(
                                Number(
                                  row.payroll.fine
                                )
                              )}
                            </p>
                          </>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <PayrollBadge
                          status={
                            row.payrollStatus
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <EmployeeBadge
                          status={
                            row.employee.status
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
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
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
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
    status ===
    "ON PROGRESS"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status ===
    "ACHIEVED"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function PayrollBadge({
  status,
}: {
  status: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    status === "PAID"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    status === "UNPAID"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status === "VOID"
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

function EmployeeBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "ACTIVE"
      ? "border-green-900 bg-green-950/30 text-green-400"
      : "border-red-900 bg-red-950/30 text-red-400";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
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