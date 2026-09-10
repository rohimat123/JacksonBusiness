import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PayrollActions from "./payroll-actions";
import PeriodActions from "./period-actions";

type Employee = {
  id: string;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string | null;
  status: string;
  target_plants: number;
  join_date: string | null;
};

type LoadPlantReport = {
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

type PayrollRecord = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  approved_plants: number;
  approved_ssrp: number | null;
  rate_per_plant: number | string;
  ssrp_rate: number | string | null;
  gross_salary: number | string;
  bonus: number | string;
  fine: number | string;
  total_salary: number | string;
  status: string;
  payment_note: string | null;
  paid_at: string | null;
};

type PayrollPeriod = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: string;
};

export default async function PayrollPage() {
  const supabase = await createClient();

  // =========================================================
  // SYSTEM SETTINGS
  // =========================================================

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("system_settings")
    .select(`
      payroll_rate,
      ssrp_rate
    `)
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      settingsError.message
    );
  }

  const currentPayrollRate =
    Number(
      settings?.payroll_rate ??
        0.3
    ) || 0.3;

  const currentSSRPRate =
    Number(
      settings?.ssrp_rate ??
        200
    ) || 200;

  // =========================================================
  // OPEN PERIOD
  // =========================================================

  const {
    data: period,
    error: periodError,
  } = await supabase
    .from("payroll_periods")
    .select(`
      id,
      name,
      period_start,
      period_end,
      status
    `)
    .eq("status", "OPEN")
    .order("period_start", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (periodError) {
    throw new Error(
      periodError.message
    );
  }

  if (!period) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gaji
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Tidak ada periode payroll OPEN.
          </p>
        </div>

        <Link
          href="/dashboard/salary/history"
          className="inline-flex rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200"
        >
          Riwayat Gaji →
        </Link>
      </div>
    );
  }

  const currentPeriod =
    period as PayrollPeriod;

  const periodStart =
    currentPeriod.period_start;

  const periodEnd =
    currentPeriod.period_end;

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
      target_plants,
      join_date
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
    (employeesData ?? []) as Employee[];

  // =========================================================
  // APPROVED LOAD PLANT
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
      periodStart
    )
    .lte(
      "report_date",
      periodEnd
    );

  if (loadError) {
    throw new Error(
      loadError.message
    );
  }

  const loadReports =
    (loadData ?? []) as LoadPlantReport[];

  // =========================================================
  // APPROVED SSRP
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
      periodStart
    )
    .lte(
      "report_date",
      periodEnd
    );

  if (ssrpError) {
    throw new Error(
      ssrpError.message
    );
  }

  const ssrpReports =
    (ssrpData ?? []) as SSRPReport[];

  // =========================================================
  // PAYROLL RECORDS CURRENT PERIOD
  // =========================================================

  const {
    data: payrollData,
    error: payrollError,
  } = await supabase
    .from("payroll_records")
    .select(`
      id,
      employee_id,
      period_start,
      period_end,
      approved_plants,
      approved_ssrp,
      rate_per_plant,
      ssrp_rate,
      gross_salary,
      bonus,
      fine,
      total_salary,
      status,
      payment_note,
      paid_at
    `)
    .eq(
      "period_start",
      periodStart
    )
    .eq(
      "period_end",
      periodEnd
    );

  if (payrollError) {
    throw new Error(
      payrollError.message
    );
  }

  const payrollRecords =
    (payrollData ?? []) as PayrollRecord[];

  const payrollMap =
    Object.fromEntries(
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

        const existing =
          payrollMap[
            employee.id
          ];

        const payrollSSRP =
          existing
            ? Number(
                existing.approved_ssrp ??
                  approvedSSRP
              )
            : approvedSSRP;

        const ssrpRate =
          existing
            ? Number(
                existing.ssrp_rate
              ) ||
              currentSSRPRate
            : currentSSRPRate;

        const rate =
          existing
            ? Number(
                existing.rate_per_plant
              ) ||
              currentPayrollRate
            : currentPayrollRate;

        const grossSalary =
          existing
            ? Number(
                existing.gross_salary
              )
            : approvedPlants *
                rate +
              payrollSSRP *
                ssrpRate;

        const bonus =
          existing
            ? Number(
                existing.bonus
              )
            : 0;

        const fine =
          existing
            ? Number(
                existing.fine
              )
            : 0;

        const totalSalary =
          existing
            ? Number(
                existing.total_salary
              )
            : Math.max(
                0,
                grossSalary +
                  bonus -
                  fine
              );

        const daysWorked =
          employee.join_date
            ? getDaysBetween(
                employee.join_date,
                periodEnd
              ) + 1
            : null;

        // RESIGNED = VOID untuk payroll aktif
        const payrollStatus =
          employee.status ===
          "RESIGNED"
            ? "VOID"
            : existing?.status ??
              "UNPAID";

        return {
          employee,
          approvedPlants,
          approvedSSRP:
            payrollSSRP,
          rate,
          ssrpRate,
          grossSalary,
          bonus,
          fine,
          totalSalary,
          daysWorked,
          existing,
          payrollStatus,
        };
      }
    );

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalUnpaid =
    rows.reduce(
      (total, row) => {
        if (
          row.payrollStatus !==
          "UNPAID"
        ) {
          return total;
        }

        return (
          total +
          row.totalSalary
        );
      },
      0
    );

  const totalPaid =
    rows.reduce(
      (total, row) => {
        if (
          row.payrollStatus !==
          "PAID"
        ) {
          return total;
        }

        return (
          total +
          row.totalSalary
        );
      },
      0
    );

  const paidCount =
    rows.filter(
      (row) =>
        row.payrollStatus ===
        "PAID"
    ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">
              Gaji
            </h1>

            <PeriodStatus
              status={
                currentPeriod.status
              }
            />
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            {currentPeriod.name}
            {" • "}
            {formatDate(
              periodStart
            )}
            {" - "}
            {formatDate(
              periodEnd
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <Link
            href="/dashboard/salary/history"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
          >
            Riwayat Gaji →
          </Link>

          <PeriodActions
            periodId={
              currentPeriod.id
            }
            periodName={
              currentPeriod.name
            }
            periodStart={
              periodStart
            }
            periodEnd={
              periodEnd
            }
          />
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Rate Default"
          value={formatMoney(
            currentPayrollRate
          )}
          description={`Plant approved • SSRP ${formatMoney(
            currentSSRPRate
          )} / approved`}
        />

        <StatCard
          title="Total Belum Dibayar"
          value={formatMoney(
            totalUnpaid
          )}
          description={
            currentPeriod.name
          }
        />

        <StatCard
          title="Total Dibayar"
          value={formatMoney(
            totalPaid
          )}
          description={
            currentPeriod.name
          }
        />

        <StatCard
          title="Pegawai Dibayar"
          value={String(
            paidCount
          )}
          description="Status PAID"
        />
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">
              Payroll Pegawai
            </h2>

            <span className="text-xs text-zinc-600">
              {currentPeriod.name}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-4">
                  Pegawai
                </th>

                <th className="px-5 py-4 text-right">
                  Plants
                </th>

                <th className="px-5 py-4 text-center">
                  SSRP
                </th>

                <th className="px-5 py-4 text-right">
                  Rate
                </th>

                <th className="px-5 py-4 text-right">
                  Gaji Kotor
                </th>

                <th className="px-5 py-4 text-right">
                  Bonus
                </th>

                <th className="px-5 py-4 text-right">
                  Denda
                </th>

                <th className="px-5 py-4 text-right">
                  Total
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4 text-right">
                  Aksi
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
                      <p className="font-medium text-zinc-200">
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

                      {row.daysWorked !==
                        null && (
                        <p className="mt-1 text-xs text-zinc-700">
                          Masa kerja:{" "}
                          {
                            row.daysWorked
                          }{" "}
                          hari
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold text-white">
                      {formatNumber(
                        row.approvedPlants
                      )}
                    </td>

                    <td className="px-5 py-4 text-center text-green-400">
                      {
                        row.approvedSSRP
                      }
                    </td>

                    <td className="px-5 py-4 text-right text-zinc-400">
                      {formatMoney(
                        row.rate
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-zinc-300">
                      {formatMoney(
                        row.grossSalary
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-green-400">
                      +{" "}
                      {formatMoney(
                        row.bonus
                      )}
                    </td>

                    <td className="px-5 py-4 text-right text-red-400">
                      -{" "}
                      {formatMoney(
                        row.fine
                      )}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-white">
                      {formatMoney(
                        row.totalSalary
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <PayrollStatus
                        status={
                          row.payrollStatus
                        }
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <PayrollActions
                        employeeId={
                          row.employee.id
                        }
                        employeeName={
                          row.employee.name
                        }
                        periodStart={
                          periodStart
                        }
                        periodEnd={
                          periodEnd
                        }
                        approvedPlants={
                          row.approvedPlants
                        }
                        rate={
                          row.rate
                        }
                        grossSalary={
                          row.grossSalary
                        }
                        bonus={
                          row.bonus
                        }
                        fine={
                          row.fine
                        }
                        totalSalary={
                          row.totalSalary
                        }
                        status={
                          row.payrollStatus
                        }
                      />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
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

function PayrollStatus({
  status,
}: {
  status: string;
}) {
  let style =
    "border-yellow-900 bg-yellow-950/30 text-yellow-400";

  if (
    status === "PAID"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
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

function PeriodStatus({
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
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

// =========================================================
// UTILS
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

function getDaysBetween(
  start: string,
  end: string
) {
  const a =
    new Date(
      `${start}T00:00:00Z`
    );

  const b =
    new Date(
      `${end}T00:00:00Z`
    );

  return Math.floor(
    (b.getTime() -
      a.getTime()) /
      86400000
  );
}