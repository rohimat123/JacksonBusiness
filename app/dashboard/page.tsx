import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import EmployeePeriodSelector from "./employee-period-selector";

type PageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

// ============================================================
// MAIN
// ============================================================

export default async function DashboardPage({
  searchParams,
}: PageProps) {
  const supabase =
    await createClient();

  const params =
    await searchParams;

  const requestedPeriodId =
    params?.period ?? "";

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
    redirect(
      "/login"
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(`
        id,
        full_name,
        email,
        role,
        position,
        status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.status !==
      "ACTIVE"
  ) {
    redirect(
      "/login"
    );
  }

  const role =
    String(
      profile.role
    ).toUpperCase();

  if (
    role ===
    "EMPLOYEE"
  ) {
    return (
      <EmployeeDashboard
        userId={
          user.id
        }
        fullName={
          profile.full_name ??
          "Employee"
        }
        requestedPeriodId={
          requestedPeriodId
        }
      />
    );
  }

  return (
    <ManagementDashboard
      requestedPeriodId={
        requestedPeriodId
      }
    />
  );
}

// ============================================================
// EMPLOYEE DASHBOARD
// ============================================================

async function EmployeeDashboard({
  userId,
  fullName,
  requestedPeriodId,
}: {
  userId: string;
  fullName: string;
  requestedPeriodId: string;
}) {
  const supabase =
    await createClient();

  const settings =
    await getSystemSettings();

  const payrollRate =
    settings.payrollRate;

  const ssrpRate =
    settings.ssrpRate;

  // ==========================================================
  // EMPLOYEE
  // ==========================================================

  const {
    data:
      employee,
    error:
      employeeError,
  } =
    await supabase
      .from(
        "employees"
      )
      .select(`
        id,
        name,
        forum_name,
        seed,
        position,
        join_date,
        status,
        target_plants
      `)
      .eq(
        "profile_id",
        userId
      )
      .maybeSingle();

  if (
    employeeError
  ) {
    throw new Error(
      employeeError.message
    );
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-yellow-900/50 bg-yellow-950/20 p-6">
          <h1 className="text-xl font-bold text-yellow-400">
            Akun belum terhubung
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Akun{" "}
            {fullName} belum
            terhubung ke Data
            Pegawai.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ALL PAYROLL PERIODS
  // ==========================================================

  const {
    data:
      periodsData,
    error:
      periodsError,
  } =
    await supabase
      .from(
        "payroll_periods"
      )
      .select(`
        id,
        period_start,
        period_end,
        status
      `)
      .order(
        "period_start",
        {
          ascending:
            true,
        }
      );

  if (
    periodsError
  ) {
    throw new Error(
      periodsError.message
    );
  }

  const periods =
    periodsData ?? [];

  // ==========================================================
  // PERIOD LABEL
  // ==========================================================

  const periodOptions =
    periods.map(
      (
        period,
        index
      ) => ({
        id:
          period.id,

        label:
          `Periode #${
            index + 1
          }`,

        status:
          period.status,
      })
    );

  // ==========================================================
  // SELECTED PERIOD
  // ==========================================================

  let selectedPeriod =
    null as
      | (typeof periods)[number]
      | null;

  if (
    requestedPeriodId
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          period.id ===
          requestedPeriodId
      ) ??
      null;
  }

  if (
    !selectedPeriod
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          String(
            period.status
          ).toUpperCase() ===
          "OPEN"
      ) ??
      periods[
        periods.length -
          1
      ] ??
      null;
  }

  // ==========================================================
  // LOAD PLANT
  // ==========================================================

  let loadReports: any[] =
    [];

  if (
    selectedPeriod
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "load_plant_reports"
        )
        .select(`
          id,
          employee_id,
          seed,
          amount,
          status,
          report_date,
          created_at
        `)
        .eq(
          "employee_id",
          employee.id
        )
        .gte(
          "report_date",
          selectedPeriod.period_start
        )
        .lte(
          "report_date",
          selectedPeriod.period_end
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    loadReports =
      data ?? [];
  }

  const approvedLoad =
    loadReports.filter(
      (report) =>
        report.status ===
        "APPROVED"
    );

  const pendingLoad =
    loadReports.filter(
      (report) =>
        report.status ===
        "PENDING"
    );

  const rejectedLoad =
    loadReports.filter(
      (report) =>
        report.status ===
        "REJECTED"
    );

  const approvedPlants =
    approvedLoad.reduce(
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

  // ==========================================================
  // TARGET
  // ==========================================================

  const targetPlants =
    Number(
      employee.target_plants
    ) || 0;

  const remainingPlants =
    Math.max(
      0,
      targetPlants -
        approvedPlants
    );

  const progress =
    targetPlants > 0
      ? Math.min(
          100,
          (approvedPlants /
            targetPlants) *
            100
        )
      : 0;

  // ==========================================================
  // SSRP
  // ==========================================================

  let ssrpReports: any[] =
    [];

  if (
    selectedPeriod
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "ssrp_reports"
        )
        .select(`
          id,
          employee_id,
          activity,
          report_date,
          status,
          created_at
        `)
        .eq(
          "employee_id",
          employee.id
        )
        .gte(
          "report_date",
          selectedPeriod.period_start
        )
        .lte(
          "report_date",
          selectedPeriod.period_end
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    ssrpReports =
      data ?? [];
  }

  const approvedSSRP =
    ssrpReports.filter(
      (report) =>
        report.status ===
        "APPROVED"
    ).length;

  const pendingSSRP =
    ssrpReports.filter(
      (report) =>
        report.status ===
        "PENDING"
    ).length;

  const rejectedSSRP =
    ssrpReports.filter(
      (report) =>
        report.status ===
        "REJECTED"
    ).length;

  // ==========================================================
  // PAYROLL
  // ==========================================================

  let payroll: any =
    null;

  if (
    selectedPeriod
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "payroll_records"
        )
        .select(`
          id,
          approved_plants,
          rate_per_plant,
          gross_salary,
          bonus,
          fine,
          total_salary,
          status,
          paid_at,
          payment_note
        `)
        .eq(
          "employee_id",
          employee.id
        )
        .eq(
          "period_start",
          selectedPeriod.period_start
        )
        .eq(
          "period_end",
          selectedPeriod.period_end
        )
        .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    payroll =
      data ?? null;
  }

  // ==========================================================
  // SALARY
  // ==========================================================

  const estimatedSalary =
    approvedPlants *
      payrollRate +
    approvedSSRP *
      ssrpRate;

  const payrollGross =
    payroll
      ? Number(
          payroll.gross_salary ??
            0
        )
      : estimatedSalary;

  const payrollBonus =
    payroll
      ? Number(
          payroll.bonus ??
            0
        )
      : 0;

  const payrollFine =
    payroll
      ? Number(
          payroll.fine ??
            0
        )
      : 0;

  const payrollTotal =
    payroll
      ? Number(
          payroll.total_salary ??
            0
        )
      : estimatedSalary;

  const payrollStatus =
    payroll
      ? String(
          payroll.status ??
            "UNPAID"
        ).toUpperCase()
      : "ESTIMASI";

  // ==========================================================
  // SHIFT TODAY
  // ==========================================================

  const today =
    getLocalDateString();

  const {
    data:
      todayShift,
    error:
      todayShiftError,
  } =
    await supabase
      .from(
        "shift_assignments"
      )
      .select(`
        id,
        shift_date,
        note,
        shift_type_id,
        shift_types (
          name,
          start_time,
          end_time
        )
      `)
      .eq(
        "employee_id",
        employee.id
      )
      .eq(
        "shift_date",
        today
      )
      .maybeSingle();

  if (
    todayShiftError
  ) {
    throw new Error(
      todayShiftError.message
    );
  }

  const shiftRelation =
    todayShift?.shift_types;

  const shiftType =
    Array.isArray(
      shiftRelation
    )
      ? shiftRelation[0] ??
        null
      : shiftRelation ??
        null;

  const latestLoad =
    loadReports[0] ??
    null;

  const latestSSRP =
    ssrpReports[0] ??
    null;

  // ==========================================================
  // PERIOD NUMBER
  // ==========================================================

  const selectedPeriodIndex =
    selectedPeriod
      ? periods.findIndex(
          (period) =>
            period.id ===
            selectedPeriod?.id
        )
      : -1;

  const selectedPeriodNumber =
    selectedPeriodIndex >=
    0
      ? selectedPeriodIndex +
        1
      : 0;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Employee Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Dashboard Saya
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Selamat datang,{" "}
            {employee.name}.
          </p>
        </div>

        {periodOptions.length >
          0 && (
          <EmployeePeriodSelector
            periods={
              periodOptions
            }
            selectedPeriodId={
              selectedPeriod?.id ??
              ""
            }
          />
        )}
      </div>

      {/* PERIOD */}

      {selectedPeriod && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                Periode Aktif Tampilan
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                Periode #
                {
                  selectedPeriodNumber
                }
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {formatDate(
                  selectedPeriod.period_start
                )}
                {" - "}
                {formatDate(
                  selectedPeriod.period_end
                )}
              </p>
            </div>

            <StatusBadge
              status={
                selectedPeriod.status
              }
            />
          </div>
        </section>
      )}

      {/* PROFILE */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white">
              {employee.name}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {employee.seed}
              {" • "}
              {employee.position}
              {" • "}
              {employee.status}
            </p>

            {employee.forum_name && (
              <p className="mt-1 text-xs text-zinc-600">
                Forum:{" "}
                {
                  employee.forum_name
                }
              </p>
            )}
          </div>

          <StatusBadge
            status={
              employee.status
            }
          />
        </div>
      </section>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Approved Plants"
          value={approvedPlants.toLocaleString(
            "en-US"
          )}
          description={
            selectedPeriod
              ? `Periode #${selectedPeriodNumber}`
              : "Belum ada periode"
          }
        />

        <StatCard
          title="Sisa Target"
          value={remainingPlants.toLocaleString(
            "en-US"
          )}
          description={`Target ${targetPlants.toLocaleString(
            "en-US"
          )}`}
        />

        <StatCard
          title="SSRP Approved"
          value={String(
            approvedSSRP
          )}
          description={`${pendingSSRP} pending`}
        />

        <SalaryStatCard
          payroll={
            Boolean(
              payroll
            )
          }
          total={
            payrollTotal
          }
          status={
            payrollStatus
          }
          gross={
            payrollGross
          }
          bonus={
            payrollBonus
          }
          fine={
            payrollFine
          }
          payrollRate={
            payrollRate
          }
          ssrpRate={
            ssrpRate
          }
        />
      </div>

      {/* TARGET */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Target Saya
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Progress berdasarkan
              Load Plant APPROVED
              pada periode yang
              dipilih.
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-lg font-bold text-white">
              {approvedPlants.toLocaleString(
                "en-US"
              )}
              {" / "}
              {targetPlants.toLocaleString(
                "en-US"
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {progress.toFixed(
                1
              )}
              %
            </p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          Sisa{" "}
          {remainingPlants.toLocaleString(
            "en-US"
          )}{" "}
          Plants
        </p>
      </section>

      {/* SHIFT */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-white">
              Shift Saya Hari Ini
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {formatDate(
                today
              )}
            </p>
          </div>

          <Link
            href="/dashboard/shifts/mine"
            className="text-xs text-zinc-400 hover:text-white"
          >
            Lihat Jadwal →
          </Link>
        </div>

        <div className="mt-5">
          {todayShift ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xl font-bold text-white">
                {shiftType?.name ??
                  "Shift"}
              </p>

              {shiftType?.start_time &&
                shiftType?.end_time && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatTime(
                      shiftType.start_time
                    )}
                    {" - "}
                    {formatTime(
                      shiftType.end_time
                    )}
                  </p>
                )}

              {todayShift.note && (
                <p className="mt-3 text-sm text-zinc-400">
                  {
                    todayShift.note
                  }
                </p>
              )}
            </div>
          ) : (
            <EmptyText text="Belum ada shift untuk hari ini." />
          )}
        </div>
      </section>

      {/* REPORTS */}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Load Plant Saya
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Periode #
                {
                  selectedPeriodNumber
                }
              </p>
            </div>

            <Link
              href="/dashboard/storage-reports/mine"
              className="text-xs text-zinc-400 hover:text-white"
            >
              Riwayat →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat
              label="Pending"
              value={
                pendingLoad.length
              }
            />

            <MiniStat
              label="Approved"
              value={
                approvedLoad.length
              }
            />

            <MiniStat
              label="Rejected"
              value={
                rejectedLoad.length
              }
            />
          </div>

          <div className="mt-5">
            {latestLoad ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {Number(
                        latestLoad.amount
                      ).toLocaleString(
                        "en-US"
                      )}{" "}
                      Plants
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDate(
                        latestLoad.report_date
                      )}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      latestLoad.status
                    }
                  />
                </div>
              </div>
            ) : (
              <EmptyText text="Belum ada laporan Load Plant di periode ini." />
            )}
          </div>

          <Link
            href="/dashboard/storage-reports/submit"
            className="mt-5 block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black hover:bg-zinc-200"
          >
            + Kirim Load Plant
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                SSRP Saya
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Periode #
                {
                  selectedPeriodNumber
                }
              </p>
            </div>

            <Link
              href="/dashboard/ssrp/mine"
              className="text-xs text-zinc-400 hover:text-white"
            >
              Riwayat →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <MiniStat
              label="Pending"
              value={
                pendingSSRP
              }
            />

            <MiniStat
              label="Approved"
              value={
                approvedSSRP
              }
            />

            <MiniStat
              label="Rejected"
              value={
                rejectedSSRP
              }
            />
          </div>

          <div className="mt-5">
            {latestSSRP ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {
                        latestSSRP.activity
                      }
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      {formatDate(
                        latestSSRP.report_date
                      )}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      latestSSRP.status
                    }
                  />
                </div>
              </div>
            ) : (
              <EmptyText text="Belum ada SSRP di periode ini." />
            )}
          </div>

          <Link
            href="/dashboard/ssrp/create"
            className="mt-5 block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black hover:bg-zinc-200"
          >
            + Kirim SSRP
          </Link>
        </section>
      </div>

      {/* PAYROLL */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">
              Gaji Saya
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Periode #
              {
                selectedPeriodNumber
              }
            </p>
          </div>

          {payroll ? (
            <StatusBadge
              status={
                payrollStatus
              }
            />
          ) : selectedPeriod ? (
            <StatusBadge
              status={
                selectedPeriod.status
              }
            />
          ) : null}
        </div>

        {payroll ? (
          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <PayrollItem
                label="Plants"
                value={Number(
                  payroll.approved_plants
                ).toLocaleString(
                  "en-US"
                )}
              />

              <PayrollItem
                label="Gaji Kotor"
                value={formatMoney(
                  payrollGross
                )}
              />

              <PayrollItem
                label="Bonus"
                value={formatMoney(
                  payrollBonus
                )}
              />

              <PayrollItem
                label="Denda"
                value={formatMoney(
                  payrollFine
                )}
              />

              <PayrollItem
                label="Total"
                value={formatMoney(
                  payrollTotal
                )}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <StatusBadge
                status={
                  payrollStatus
                }
              />

              <Link
                href="/dashboard/salary/mine"
                className="text-xs font-medium text-zinc-400 hover:text-white"
              >
                Lihat Detail Gaji →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
            <p className="text-sm text-zinc-500">
              Payroll belum dibuat
              untuk periode ini.
            </p>

            <p className="mt-2 text-xl font-bold">
              Estimasi:{" "}
              {formatMoney(
                estimatedSalary
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// MANAGEMENT DASHBOARD
// ============================================================

async function ManagementDashboard({
  requestedPeriodId,
}: {
  requestedPeriodId: string;
}) {
  const supabase =
    await createClient();

  const settings =
    await getSystemSettings();

  const storageCapacity =
    settings.storageCapacity;

  // ==========================================================
  // PERIODS
  // ==========================================================

  const {
    data:
      periodsData,
    error:
      periodsError,
  } =
    await supabase
      .from(
        "payroll_periods"
      )
      .select(`
        id,
        period_start,
        period_end,
        status
      `)
      .order(
        "period_start",
        {
          ascending:
            true,
        }
      );

  if (
    periodsError
  ) {
    throw new Error(
      periodsError.message
    );
  }

  const periods =
    periodsData ?? [];

  const periodOptions =
    periods.map(
      (
        period,
        index
      ) => ({
        id:
          period.id,

        label:
          `Periode #${
            index + 1
          }`,

        status:
          period.status,
      })
    );

  let selectedPeriod =
    null as
      | (typeof periods)[number]
      | null;

  if (
    requestedPeriodId
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          period.id ===
          requestedPeriodId
      ) ??
      null;
  }

  if (
    !selectedPeriod
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          String(
            period.status
          ).toUpperCase() ===
          "OPEN"
      ) ??
      periods[
        periods.length -
          1
      ] ??
      null;
  }

  const selectedPeriodIndex =
    selectedPeriod
      ? periods.findIndex(
          (period) =>
            period.id ===
            selectedPeriod?.id
        )
      : -1;

  const selectedPeriodNumber =
    selectedPeriodIndex >=
    0
      ? selectedPeriodIndex +
        1
      : 0;

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  const {
    data:
      employees,
    error:
      employeesError,
  } =
    await supabase
      .from(
        "employees"
      )
      .select(`
        id,
        name,
        seed,
        status,
        target_plants
      `)
      .order(
        "name",
        {
          ascending:
            true,
        }
      );

  if (
    employeesError
  ) {
    throw new Error(
      employeesError.message
    );
  }

  const activeEmployees =
    employees?.filter(
      (employee) =>
        employee.status ===
        "ACTIVE"
    ) ?? [];

  // ==========================================================
  // LOAD PLANT - ALL TIME
  // UNTUK REAL TIME STORAGE
  // ==========================================================

  const {
    data:
      reports,
    error:
      reportsError,
  } =
    await supabase
      .from(
        "load_plant_reports"
      )
      .select(`
        id,
        employee_id,
        seed,
        amount,
        status,
        report_date
      `);

  if (
    reportsError
  ) {
    throw new Error(
      reportsError.message
    );
  }

  const approvedReports =
    reports?.filter(
      (report) =>
        report.status ===
        "APPROVED"
    ) ?? [];

  const pendingReports =
    reports?.filter(
      (report) =>
        report.status ===
        "PENDING"
    ) ?? [];

  // ==========================================================
  // LOAD PLANT - SELECTED PERIOD
  // KHUSUS TARGET PEGAWAI
  // ==========================================================

  const periodApprovedReports =
    selectedPeriod
      ? approvedReports.filter(
          (report) =>
            report.report_date >=
              selectedPeriod.period_start &&
            report.report_date <=
              selectedPeriod.period_end
        )
      : [];

  // ==========================================================
  // SALES
  // ==========================================================

  const {
    data:
      salesReports,
    error:
      salesError,
  } =
    await supabase
      .from(
        "sales_reports"
      )
      .select(`
        id,
        seed,
        quantity,
        total_amount,
        status,
        sale_date
      `);

  if (
    salesError
  ) {
    throw new Error(
      salesError.message
    );
  }

  const approvedSales =
    salesReports?.filter(
      (sale) =>
        sale.status ===
        "APPROVED"
    ) ?? [];

  const pendingSales =
    salesReports?.filter(
      (sale) =>
        sale.status ===
        "PENDING"
    ) ?? [];

  // ==========================================================
  // REAL TIME STORAGE
  // ==========================================================

  const storage = {
    POTATO: 0,
    ONION: 0,
    CORN: 0,
    WHEAT: 0,
    CARROT: 0,
  };

  for (
    const report of
    approvedReports
  ) {
    const seed =
      report.seed as keyof typeof storage;

    if (
      seed in storage
    ) {
      storage[seed] +=
        Number(
          report.amount
        );
    }
  }

  for (
    const sale of
    approvedSales
  ) {
    const seed =
      sale.seed as keyof typeof storage;

    if (
      seed in storage
    ) {
      storage[seed] -=
        Number(
          sale.quantity
        );
    }
  }

  for (
    const seed of Object.keys(
      storage
    ) as Array<
      keyof typeof storage
    >
  ) {
    storage[seed] =
      Math.max(
        0,
        storage[seed]
      );
  }

  const storageTotal =
    Object.values(
      storage
    ).reduce(
      (
        total,
        amount
      ) =>
        total +
        amount,
      0
    );

  const availableStorage =
    Math.max(
      0,
      storageCapacity -
        storageTotal
    );

  const storagePercentage =
    storageCapacity > 0
      ? Math.min(
          100,
          (storageTotal /
            storageCapacity) *
            100
        )
      : 0;

  // ==========================================================
  // SALES SUMMARY
  // ==========================================================

  const totalSalesRevenue =
    approvedSales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.total_amount
        ),
      0
    );

  const totalPlantsSold =
    approvedSales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.quantity
        ),
      0
    );

  // ==========================================================
  // EMPLOYEE TARGET - SELECTED PERIOD ONLY
  // ==========================================================

  const employeeProgress =
    activeEmployees.map(
      (employee) => {
        const current =
          periodApprovedReports
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

        const target =
          Number(
            employee.target_plants
          );

        const remaining =
          Math.max(
            0,
            target -
              current
          );

        return {
          ...employee,

          current,

          remaining,

          percentage:
            target > 0
              ? Math.min(
                  100,
                  (current /
                    target) *
                    100
                )
              : 0,
        };
      }
    );

  // ==========================================================
  // PERIOD TOTAL
  // ==========================================================

  const totalPeriodApproved =
    periodApprovedReports.reduce(
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

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Jackson Farm Dashboard
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Monitoring pegawai,
            storage dan penjualan.
          </p>
        </div>

        {periodOptions.length >
          0 && (
          <EmployeePeriodSelector
            periods={
              periodOptions
            }
            selectedPeriodId={
              selectedPeriod?.id ??
              ""
            }
          />
        )}
      </div>

      {/* SELECTED PERIOD */}

      {selectedPeriod && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                Target Periode Aktif Tampilan
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                Periode #
                {
                  selectedPeriodNumber
                }
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                {formatDate(
                  selectedPeriod.period_start
                )}
                {" - "}
                {formatDate(
                  selectedPeriod.period_end
                )}
              </p>
            </div>

            <StatusBadge
              status={
                selectedPeriod.status
              }
            />
          </div>
        </section>
      )}

      {/* MAIN STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Pegawai"
          value={String(
            activeEmployees.length
          )}
          description="Pegawai aktif"
        />

        <StatCard
          title="Storage"
          value={`${storageTotal.toLocaleString(
            "en-US"
          )} / ${storageCapacity.toLocaleString(
            "en-US"
          )}`}
          description="Stock realtime"
        />

        <StatCard
          title="Penjualan"
          value={formatMoney(
            totalSalesRevenue
          )}
          description={`${totalPlantsSold.toLocaleString(
            "en-US"
          )} plants terjual`}
        />

        <StatCard
          title="Approved Periode"
          value={totalPeriodApproved.toLocaleString(
            "en-US"
          )}
          description={
            selectedPeriod
              ? `Periode #${selectedPeriodNumber}`
              : "Belum ada periode"
          }
        />
      </div>

      {/* STORAGE */}

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 xl:col-span-2">
          <div className="flex justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                Real Time Storage
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Semua Load Plant
                Approved dikurangi
                semua Penjualan
                Approved.
              </p>
            </div>

            <span className="text-sm text-zinc-400">
              {storagePercentage.toFixed(
                1
              )}
              %
            </span>
          </div>

          <div className="mt-5 h-3 rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-white"
              style={{
                width:
                  `${storagePercentage}%`,
              }}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {Object.entries(
              storage
            ).map(
              ([
                seed,
                value,
              ]) => (
                <StorageItem
                  key={
                    seed
                  }
                  name={
                    seed
                  }
                  value={
                    value
                  }
                />
              )
            )}
          </div>
        </section>

        {/* QUICK INFO */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="font-semibold">
            Quick Information
          </h2>

          <div className="mt-5 space-y-4">
            <QuickInfo
              label="Available Storage"
              value={`${availableStorage.toLocaleString(
                "en-US"
              )} Plants`}
            />

            <QuickInfo
              label="Load Plant Pending"
              value={`${pendingReports.length} Laporan`}
            />

            <QuickInfo
              label="Pending Penjualan"
              value={`${pendingSales.length} Laporan`}
            />

            <QuickInfo
              label="Pendapatan"
              value={formatMoney(
                totalSalesRevenue
              )}
            />
          </div>
        </section>
      </div>

      {/* TARGET PEGAWAI */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Target Pegawai
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Hanya Load Plant
              APPROVED pada periode
              yang dipilih.
            </p>
          </div>

          {selectedPeriod && (
            <div className="sm:text-right">
              <p className="text-sm font-semibold text-white">
                Periode #
                {
                  selectedPeriodNumber
                }
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                {formatDate(
                  selectedPeriod.period_start
                )}
                {" - "}
                {formatDate(
                  selectedPeriod.period_end
                )}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {employeeProgress.length >
          0 ? (
            employeeProgress.map(
              (
                employee
              ) => (
                <EmployeeTarget
                  key={
                    employee.id
                  }
                  name={
                    employee.name
                  }
                  seed={
                    employee.seed
                  }
                  current={
                    employee.current
                  }
                  target={Number(
                    employee.target_plants
                  )}
                  percentage={
                    employee.percentage
                  }
                />
              )
            )
          ) : (
            <EmptyText text="Belum ada pegawai aktif." />
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
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <p className="text-sm text-zinc-400">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// SALARY STAT
// ============================================================

function SalaryStatCard({
  payroll,
  total,
  status,
  gross,
  bonus,
  fine,
  payrollRate,
  ssrpRate,
}: {
  payroll: boolean;
  total: number;
  status: string;
  gross: number;
  bonus: number;
  fine: number;
  payrollRate: number;
  ssrpRate: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {payroll
            ? "Gaji Saat Ini"
            : "Estimasi Gaji"}
        </p>

        {payroll && (
          <StatusBadge
            status={
              status
            }
          />
        )}
      </div>

      <p className="mt-3 text-3xl font-bold text-white">
        {formatMoney(
          total
        )}
      </p>

      {payroll ? (
        <p className="mt-2 text-xs leading-5 text-zinc-600">
          Kotor{" "}
          {formatMoney(
            gross
          )}
          {" + "}
          Bonus{" "}
          {formatMoney(
            bonus
          )}
          {" - "}
          Denda{" "}
          {formatMoney(
            fine
          )}
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-600">
          {formatMoney(
            payrollRate
          )} / plant • {formatMoney(
            ssrpRate
          )} / SSRP approved
        </p>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-center">
      <p className="text-xs text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function PayrollItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs text-zinc-600">
        {label}
      </p>

      <p className="mt-2 font-semibold">
        {value}
      </p>
    </div>
  );
}

function StorageItem({
  name,
  value,
}: {
  name: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs text-zinc-500">
        {name}
      </p>

      <p className="mt-2 text-lg font-semibold">
        {value.toLocaleString(
          "en-US"
        )}
      </p>
    </div>
  );
}

function QuickInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function EmployeeTarget({
  name,
  seed,
  current,
  target,
  percentage,
}: {
  name: string;
  seed: string;
  current: number;
  target: number;
  percentage: number;
}) {
  const remaining =
    Math.max(
      0,
      target -
        current
    );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">
            {name}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {seed}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-sm font-semibold">
            {current.toLocaleString(
              "en-US"
            )}
            {" / "}
            {target.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            Sisa{" "}
            {remaining.toLocaleString(
              "en-US"
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 h-2 rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-white"
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

      <p className="mt-2 text-right text-xs text-zinc-600">
        {percentage.toFixed(
          1
        )}
        %
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalizedStatus =
    String(
      status
    ).toUpperCase();

  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    normalizedStatus ===
      "ACTIVE" ||
    normalizedStatus ===
      "APPROVED" ||
    normalizedStatus ===
      "PAID" ||
    normalizedStatus ===
      "OPEN"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    normalizedStatus ===
      "PENDING" ||
    normalizedStatus ===
      "UNPAID"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    normalizedStatus ===
      "REJECTED" ||
    normalizedStatus ===
      "RESIGNED" ||
    normalizedStatus ===
      "VOID"
  ) {
    style =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {
        normalizedStatus
      }
    </span>
  );
}

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-600">
      {text}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    }
  ).format(value);
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}

function formatTime(
  value: string
) {
  return value.slice(
    0,
    5
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

async function getSystemSettings() {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "system_settings"
      )
      .select(`
        storage_capacity,
        payroll_rate,
        ssrp_rate,
        default_target_plants,
        payroll_period_days
      `)
      .limit(1)
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return {
    storageCapacity:
      Number(
        data?.storage_capacity ??
          75000
      ),

    payrollRate:
      Number(
        data?.payroll_rate ??
          0.3
      ),

    ssrpRate:
      Number(
        data?.ssrp_rate ??
          200
      ),

    defaultTargetPlants:
      Number(
        data?.default_target_plants ??
          40000
      ),

    payrollPeriodDays:
      Number(
        data?.payroll_period_days ??
          14
      ),
  };
}

