import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  BadgeCheck,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Database,
  Info,
  Leaf,
  PackageOpen,
  ScrollText,
  Sprout,
  Target,
  Users,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import EmployeePeriodSelector from "./employee-period-selector";

// ============================================================
// TYPES
// ============================================================

type PageProps = {
  searchParams?: Promise<{
    period?: string;
  }>;
};

type PayrollPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
};

type EmployeeRow = {
  id: string;
  profile_id?: string | null;
  name: string;
  forum_name?: string | null;
  seed: string | null;
  position?: string | null;
  join_date?: string | null;
  status: string;
  target_plants:
    | number
    | string
    | null;
};

type LoadPlantReport = {
  id: string;
  employee_id: string;
  seed: string;
  amount:
    | number
    | string;
  status: string;
  report_date: string;
  created_at?: string;
};

type SSRPReport = {
  id: string;
  employee_id: string;
  activity: string;
  report_date: string;
  status: string;
  created_at?: string;
};

type PayrollRecord = {
  id: string;
  approved_plants:
    | number
    | string
    | null;
  rate_per_plant:
    | number
    | string
    | null;
  gross_salary:
    | number
    | string
    | null;
  bonus:
    | number
    | string
    | null;
  fine:
    | number
    | string
    | null;
  total_salary:
    | number
    | string
    | null;
  status: string | null;
  paid_at: string | null;
  payment_note:
    | string
    | null;
};

type SaleReport = {
  id: string;
  seed: string;
  quantity:
    | number
    | string;
  total_amount:
    | number
    | string;
  status: string;
  sale_date: string;
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
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
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
    String(
      profile.status ?? ""
    ).toUpperCase() !==
      "ACTIVE"
  ) {
    redirect("/login");
  }

  const role =
    String(
      profile.role ?? ""
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
// EMPLOYEE
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

  const [
    settingsResult,
    employeeResult,
    periodsResult,
  ] =
    await Promise.all([
      supabase
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
        .maybeSingle(),

      supabase
        .from(
          "employees"
        )
        .select(`
          id,
          profile_id,
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
        .maybeSingle(),

      supabase
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
            ascending: true,
          }
        ),
    ]);

  if (
    settingsResult.error
  ) {
    throw new Error(
      settingsResult.error
        .message
    );
  }

  if (
    employeeResult.error
  ) {
    throw new Error(
      employeeResult.error
        .message
    );
  }

  if (
    periodsResult.error
  ) {
    throw new Error(
      periodsResult.error
        .message
    );
  }

  const employee =
    employeeResult.data as
      | EmployeeRow
      | null;

  if (!employee) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel rounded-2xl border-yellow-500/20 p-6">
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

  const payrollRate =
    Number(
      settingsResult.data
        ?.payroll_rate ??
        0.3
    ) || 0.3;

  const ssrpRate =
    Number(
      settingsResult.data
        ?.ssrp_rate ??
        200
    ) || 200;

  const periods =
    (
      periodsResult.data ??
      []
    ) as PayrollPeriod[];

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

  let selectedPeriod:
    PayrollPeriod | null =
      null;

  if (
    requestedPeriodId
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          period.id ===
          requestedPeriodId
      ) ?? null;
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
        periods.length - 1
      ] ??
      null;
  }

  const today =
    getLocalDateString();

  const shiftPromise =
    supabase
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

  let loadReports:
    LoadPlantReport[] =
      [];

  let ssrpReports:
    SSRPReport[] =
      [];

  let payroll:
    PayrollRecord | null =
      null;

  let todayShift:
    any =
      null;

  if (
    selectedPeriod
  ) {
    const [
      loadResult,
      ssrpResult,
      payrollResult,
      shiftResult,
    ] =
      await Promise.all([
        supabase
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
              ascending: false,
            }
          ),

        supabase
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
              ascending: false,
            }
          ),

        supabase
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
          .maybeSingle(),

        shiftPromise,
      ]);

    if (
      loadResult.error
    ) {
      throw new Error(
        loadResult.error
          .message
      );
    }

    if (
      ssrpResult.error
    ) {
      throw new Error(
        ssrpResult.error
          .message
      );
    }

    if (
      payrollResult.error
    ) {
      throw new Error(
        payrollResult.error
          .message
      );
    }

    if (
      shiftResult.error
    ) {
      throw new Error(
        shiftResult.error
          .message
      );
    }

    loadReports =
      (
        loadResult.data ??
        []
      ) as LoadPlantReport[];

    ssrpReports =
      (
        ssrpResult.data ??
        []
      ) as SSRPReport[];

    payroll =
      payrollResult.data as
        | PayrollRecord
        | null;

    todayShift =
      shiftResult.data;
  } else {
    const shiftResult =
      await shiftPromise;

    if (
      shiftResult.error
    ) {
      throw new Error(
        shiftResult.error
          .message
      );
    }

    todayShift =
      shiftResult.data;
  }

  const approvedLoad =
    loadReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "APPROVED"
    );

  const pendingLoad =
    loadReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "PENDING"
    );

  const rejectedLoad =
    loadReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
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
          report.amount ??
          0
        ),
      0
    );

  const targetPlants =
    Number(
      employee.target_plants ??
      0
    );

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
          (
            approvedPlants /
            targetPlants
          ) * 100
        )
      : 0;

  const approvedSSRP =
    ssrpReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "APPROVED"
    ).length;

  const pendingSSRP =
    ssrpReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "PENDING"
    ).length;

  const rejectedSSRP =
    ssrpReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "REJECTED"
    ).length;

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

  const shiftRelation =
    todayShift
      ?.shift_types;

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

  const selectedPeriodIndex =
    selectedPeriod
      ? periods.findIndex(
          (period) =>
            period.id ===
            selectedPeriod?.id
        )
      : -1;

  const selectedPeriodNumber =
    selectedPeriodIndex >= 0
      ? selectedPeriodIndex +
        1
      : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-emerald-300/50">
            Employee Portal
          </p>

          <h1 className="mt-1 text-3xl font-bold">
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
              selectedPeriod
                ?.id ?? ""
            }
          />
        )}
      </div>

      {/* PERIOD */}

      {selectedPeriod && (
        <section className="glass-panel green-glow rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <IconBox
              icon={
                CalendarDays
              }
              accent="green"
            />

            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-emerald-300/35">
                Periode Aktif Tampilan
              </p>

              <p className="mt-1 text-lg font-bold">
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

      <section className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <IconBox
            icon={
              Users
            }
            accent="green"
          />

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {employee.name}
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {
                employee.seed ??
                "-"
              }
              {" • "}
              {
                employee.position ??
                "-"
              }
              {" • "}
              {
                employee.status
              }
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sprout}
          accent="green"
          title="Approved Plants"
          value={
            approvedPlants
              .toLocaleString(
                "en-US"
              )
          }
          description={`Periode #${selectedPeriodNumber}`}
        />

        <StatCard
          icon={Target}
          accent="red"
          title="Sisa Target"
          value={
            remainingPlants
              .toLocaleString(
                "en-US"
              )
          }
          description={`Target ${targetPlants.toLocaleString(
            "en-US"
          )}`}
        />

        <StatCard
          icon={BadgeCheck}
          accent="purple"
          title="SSRP Approved"
          value={
            String(
              approvedSSRP
            )
          }
          description={`${pendingSSRP} pending`}
        />

        <StatCard
          icon={
            CircleDollarSign
          }
          accent="blue"
          title={
            payroll
              ? "Gaji Saat Ini"
              : "Estimasi Gaji"
          }
          value={
            formatMoney(
              payrollTotal
            )
          }
          description={
            payroll
              ? payrollStatus
              : `${formatMoney(
                  payrollRate
                )} / plant`
          }
        />
      </div>

      {/* TARGET */}

      <section className="glass-panel rounded-2xl p-6">
        <SectionTitle
          icon={Target}
          accent="red"
          title="Target Saya"
          description="Progress Load Plant APPROVED pada periode yang dipilih."
        />

        <div className="mt-6 flex items-end justify-between">
          <p className="text-xl font-bold">
            {approvedPlants.toLocaleString(
              "en-US"
            )}
            {" / "}
            {targetPlants.toLocaleString(
              "en-US"
            )}
          </p>

          <p className="text-sm text-emerald-300/60">
            {progress.toFixed(
              1
            )}
            %
          </p>
        </div>

        <ProgressBar
          percentage={
            progress
          }
        />
      </section>

      {/* SHIFT */}

      <section className="glass-panel rounded-2xl p-6">
        <SectionTitle
          icon={Clock3}
          accent="blue"
          title="Shift Saya Hari Ini"
          description={
            formatDate(
              today
            )
          }
        />

        <div className="mt-5">
          {todayShift ? (
            <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-5">
              <p className="text-xl font-bold">
                {
                  shiftType
                    ?.name ??
                  "Shift"
                }
              </p>

              {shiftType
                ?.start_time &&
                shiftType
                  ?.end_time && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatTime(
                      shiftType
                        .start_time
                    )}
                    {" - "}
                    {formatTime(
                      shiftType
                        .end_time
                    )}
                  </p>
                )}
            </div>
          ) : (
            <EmptyText text="Belum ada shift untuk hari ini." />
          )}
        </div>

        <Link
          href="/dashboard/shifts/mine"
          prefetch={false}
          className="mt-4 inline-block text-xs text-emerald-300/60 hover:text-emerald-300"
        >
          Lihat Jadwal →
        </Link>
      </section>

      {/* REPORTS */}

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportCard
          title="Load Plant Saya"
          icon={Sprout}
          pending={
            pendingLoad.length
          }
          approved={
            approvedLoad.length
          }
          rejected={
            rejectedLoad.length
          }
          latest={
            latestLoad
              ? `${Number(
                  latestLoad.amount
                ).toLocaleString(
                  "en-US"
                )} Plants`
              : null
          }
          latestStatus={
            latestLoad?.status
          }
          historyHref="/dashboard/storage-reports/mine"
          submitHref="/dashboard/storage-reports/submit"
          submitLabel="+ Kirim Load Plant"
        />

        <ReportCard
          title="SSRP Saya"
          icon={ScrollText}
          pending={
            pendingSSRP
          }
          approved={
            approvedSSRP
          }
          rejected={
            rejectedSSRP
          }
          latest={
            latestSSRP
              ?.activity ??
            null
          }
          latestStatus={
            latestSSRP?.status
          }
          historyHref="/dashboard/ssrp/mine"
          submitHref="/dashboard/ssrp/create"
          submitLabel="+ Kirim SSRP"
        />
      </div>

      {/* PAYROLL */}

      <section className="glass-panel rounded-2xl p-6">
        <SectionTitle
          icon={
            CircleDollarSign
          }
          accent="green"
          title="Gaji Saya"
          description={`Periode #${selectedPeriodNumber}`}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PayrollItem
            label="Gaji Kotor"
            value={
              formatMoney(
                payrollGross
              )
            }
          />

          <PayrollItem
            label="Bonus"
            value={
              formatMoney(
                payrollBonus
              )
            }
          />

          <PayrollItem
            label="Denda"
            value={
              formatMoney(
                payrollFine
              )
            }
          />

          <PayrollItem
            label="Total"
            value={
              formatMoney(
                payrollTotal
              )
            }
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <StatusBadge
            status={
              payrollStatus
            }
          />

          <Link
            href="/dashboard/salary/mine"
            prefetch={false}
            className="text-xs text-emerald-300/60 hover:text-emerald-300"
          >
            Detail Gaji →
          </Link>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// MANAGEMENT
// ============================================================

async function ManagementDashboard({
  requestedPeriodId,
}: {
  requestedPeriodId: string;
}) {
  const supabase =
    await createClient();

  const [
    settingsResult,
    periodsResult,
    employeesResult,
    reportsResult,
    salesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "system_settings"
        )
        .select(`
          storage_capacity
        `)
        .limit(1)
        .maybeSingle(),

      supabase
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
            ascending: true,
          }
        ),

      supabase
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
            ascending: true,
          }
        ),

      supabase
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
        `),

      supabase
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
        `),
    ]);

  if (
    settingsResult.error
  ) {
    throw new Error(
      settingsResult.error
        .message
    );
  }

  if (
    periodsResult.error
  ) {
    throw new Error(
      periodsResult.error
        .message
    );
  }

  if (
    employeesResult.error
  ) {
    throw new Error(
      employeesResult.error
        .message
    );
  }

  if (
    reportsResult.error
  ) {
    throw new Error(
      reportsResult.error
        .message
    );
  }

  if (
    salesResult.error
  ) {
    throw new Error(
      salesResult.error
        .message
    );
  }

  const storageCapacity =
    Number(
      settingsResult.data
        ?.storage_capacity ??
        75000
    );

  const periods =
    (
      periodsResult.data ??
      []
    ) as PayrollPeriod[];

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

  let selectedPeriod:
    PayrollPeriod | null =
      null;

  if (
    requestedPeriodId
  ) {
    selectedPeriod =
      periods.find(
        (period) =>
          period.id ===
          requestedPeriodId
      ) ?? null;
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
        periods.length - 1
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
    selectedPeriodIndex >= 0
      ? selectedPeriodIndex +
        1
      : 0;

  const employees =
    (
      employeesResult.data ??
      []
    ) as EmployeeRow[];

  const activeEmployees =
    employees.filter(
      (employee) =>
        String(
          employee.status
        ).toUpperCase() ===
        "ACTIVE"
    );

  const reports =
    (
      reportsResult.data ??
      []
    ) as LoadPlantReport[];

  const approvedReports =
    reports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "APPROVED"
    );

  const pendingReports =
    reports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "PENDING"
    );

  const periodApprovedReports =
    selectedPeriod
      ? approvedReports.filter(
          (report) =>
            report.report_date >=
              selectedPeriod!
                .period_start &&
            report.report_date <=
              selectedPeriod!
                .period_end
        )
      : [];

  const salesReports =
    (
      salesResult.data ??
      []
    ) as SaleReport[];

  const approvedSales =
    salesReports.filter(
      (sale) =>
        String(
          sale.status
        ).toUpperCase() ===
        "APPROVED"
    );

  const pendingSales =
    salesReports.filter(
      (sale) =>
        String(
          sale.status
        ).toUpperCase() ===
        "PENDING"
    );

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
      String(
        report.seed ??
        ""
      ).toUpperCase() as
        keyof typeof storage;

    if (
      seed in storage
    ) {
      storage[seed] +=
        Number(
          report.amount ??
          0
        );
    }
  }

  for (
    const sale of
    approvedSales
  ) {
    const seed =
      String(
        sale.seed ??
        ""
      ).toUpperCase() as
        keyof typeof storage;

    if (
      seed in storage
    ) {
      storage[seed] -=
        Number(
          sale.quantity ??
          0
        );
    }
  }

  for (
    const seed of
    Object.keys(
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
          (
            storageTotal /
            storageCapacity
          ) * 100
        )
      : 0;

  const totalSalesRevenue =
    approvedSales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.total_amount ??
          0
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
          sale.quantity ??
          0
        ),
      0
    );

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
                  report.amount ??
                  0
                ),
              0
            );

        const target =
          Number(
            employee
              .target_plants ??
            0
          );

        return {
          ...employee,
          current,

          percentage:
            target > 0
              ? Math.min(
                  100,
                  (
                    current /
                    target
                  ) * 100
                )
              : 0,
        };
      }
    );

  const totalPeriodApproved =
    periodApprovedReports.reduce(
      (
        total,
        report
      ) =>
        total +
        Number(
          report.amount ??
          0
        ),
      0
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-emerald-300/50">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">
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
              selectedPeriod
                ?.id ?? ""
            }
          />
        )}
      </div>

      {/* PERIOD */}

      {selectedPeriod && (
        <section className="glass-panel-strong green-glow rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <IconBox
              icon={
                CalendarDays
              }
              accent="green"
            />

            <div className="flex-1">
              <p className="text-xs uppercase tracking-wide text-emerald-300/40">
                Target Periode Aktif Tampilan
              </p>

              <h2 className="mt-1 text-lg font-bold">
                Periode #
                {
                  selectedPeriodNumber
                }
              </h2>

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

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          accent="green"
          title="Total Pegawai"
          value={
            String(
              activeEmployees.length
            )
          }
          description="Pegawai aktif"
        />

        <StatCard
          icon={Database}
          accent="blue"
          title="Storage"
          value={`${storageTotal.toLocaleString(
            "en-US"
          )} / ${storageCapacity.toLocaleString(
            "en-US"
          )}`}
          description="Stock realtime"
        />

        <StatCard
          icon={
            CircleDollarSign
          }
          accent="green"
          title="Penjualan"
          value={
            formatMoney(
              totalSalesRevenue
            )
          }
          description={`${totalPlantsSold.toLocaleString(
            "en-US"
          )} plants terjual`}
        />

        <StatCard
          icon={BadgeCheck}
          accent="purple"
          title="Approved Periode"
          value={
            totalPeriodApproved.toLocaleString(
              "en-US"
            )
          }
          description={`Periode #${selectedPeriodNumber}`}
        />
      </div>

      {/* STORAGE + INFO */}

      <div className="grid gap-6 xl:grid-cols-3">

        {/* STORAGE */}

        <section className="glass-panel green-glow rounded-2xl p-6 xl:col-span-2">
          <SectionTitle
            icon={Leaf}
            accent="green"
            title="Real Time Storage"
            description="Semua Load Plant Approved dikurangi semua Penjualan Approved."
            right={`${storagePercentage.toFixed(
              1
            )}%`}
          />

          <ProgressBar
            percentage={
              storagePercentage
            }
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            <StorageItem
              name="POTATO"
              emoji="🥔"
              value={
                storage.POTATO
              }
            />

            <StorageItem
              name="ONION"
              emoji="🧅"
              value={
                storage.ONION
              }
            />

            <StorageItem
              name="CORN"
              emoji="🌽"
              value={
                storage.CORN
              }
            />

            <StorageItem
              name="WHEAT"
              emoji="🌾"
              value={
                storage.WHEAT
              }
            />

            <StorageItem
              name="CARROT"
              emoji="🥕"
              value={
                storage.CARROT
              }
            />
          </div>
        </section>

        {/* QUICK INFO */}

        <section className="glass-panel rounded-2xl p-6">
          <SectionTitle
            icon={Info}
            accent="blue"
            title="Quick Information"
          />

          <div className="mt-6 space-y-5">
            <QuickInfo
              icon={
                Database
              }
              accent="blue"
              label="Available Storage"
              value={`${availableStorage.toLocaleString(
                "en-US"
              )} Plants`}
            />

            <QuickInfo
              icon={
                PackageOpen
              }
              accent="yellow"
              label="Load Plant Pending"
              value={`${pendingReports.length} Laporan`}
            />

            <QuickInfo
              icon={Clock3}
              accent="green"
              label="Pending Penjualan"
              value={`${pendingSales.length} Laporan`}
            />

            <QuickInfo
              icon={
                CircleDollarSign
              }
              accent="green"
              label="Pendapatan"
              value={
                formatMoney(
                  totalSalesRevenue
                )
              }
            />
          </div>
        </section>
      </div>

      {/* TARGET */}

      <section className="glass-panel rounded-2xl p-6">
        <SectionTitle
          icon={Target}
          accent="red"
          title="Target Pegawai"
          description="Hanya Load Plant APPROVED pada periode yang dipilih."
          right={`Periode #${selectedPeriodNumber}`}
        />

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
                  target={
                    Number(
                      employee
                        .target_plants ??
                      0
                    )
                  }
                  percentage={
                    employee
                      .percentage
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

type Accent =
  | "green"
  | "blue"
  | "purple"
  | "red"
  | "yellow";

function getAccent(
  accent: Accent
) {
  switch (
    accent
  ) {
    case "blue":
      return {
        box:
          "border-sky-400/25 bg-sky-500/10 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.10)]",
      };

    case "purple":
      return {
        box:
          "border-violet-400/25 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.10)]",
      };

    case "red":
      return {
        box:
          "border-rose-400/25 bg-rose-500/10 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.10)]",
      };

    case "yellow":
      return {
        box:
          "border-amber-400/25 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.10)]",
      };

    default:
      return {
        box:
          "border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.10)]",
      };
  }
}

function IconBox({
  icon: Icon,
  accent,
}: {
  icon: LucideIcon;
  accent: Accent;
}) {
  const style =
    getAccent(
      accent
    );

  return (
    <div
      className={`
        flex
        h-11
        w-11
        shrink-0
        items-center
        justify-center
        rounded-xl
        border
        ${style.box}
      `}
    >
      <Icon
        size={20}
        strokeWidth={1.8}
      />
    </div>
  );
}

function StatCard({
  icon,
  accent,
  title,
  value,
  description,
}: {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="glass-panel green-glow-hover rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <IconBox
          icon={
            icon
          }
          accent={
            accent
          }
        />

        <div className="min-w-0">
          <p className="text-sm text-zinc-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-zinc-600">
            {
              description
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  accent,
  title,
  description,
  right,
}: {
  icon: LucideIcon;
  accent: Accent;
  title: string;
  description?: string;
  right?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <IconBox
          icon={
            icon
          }
          accent={
            accent
          }
        />

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-xs text-zinc-500">
              {
                description
              }
            </p>
          )}
        </div>
      </div>

      {right && (
        <p className="text-sm font-semibold text-zinc-300">
          {right}
        </p>
      )}
    </div>
  );
}

function ProgressBar({
  percentage,
}: {
  percentage: number;
}) {
  return (
    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-black/35 ring-1 ring-emerald-500/10">
      <div
        className="
          h-full
          rounded-full
          bg-gradient-to-r
          from-emerald-700
          via-emerald-400
          to-green-300
          shadow-[0_0_15px_rgba(52,211,153,0.35)]
        "
        style={{
          width:
            `${percentage}%`,
        }}
      />
    </div>
  );
}

function StorageItem({
  name,
  emoji,
  value,
}: {
  name: string;
  emoji: string;
  value: number;
}) {
  return (
    <div
      className="
        rounded-xl
        border
        border-emerald-500/15
        bg-black/20
        p-4
        transition
        hover:border-emerald-400/25
        hover:bg-emerald-950/20
      "
    >
      <p className="text-xs text-emerald-100/50">
        {name}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-lg">
          {emoji}
        </span>

        <p className="text-lg font-bold">
          {value.toLocaleString(
            "en-US"
          )}
        </p>
      </div>
    </div>
  );
}

function QuickInfo({
  icon,
  accent,
  label,
  value,
}: {
  icon: LucideIcon;
  accent: Accent;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="scale-90">
        <IconBox
          icon={
            icon
          }
          accent={
            accent
          }
        />
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-zinc-600">
          {label}
        </p>

        <p className="mt-0.5 text-sm font-semibold">
          {value}
        </p>
      </div>
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
  seed: string | null;
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
    <div className="rounded-xl border border-emerald-500/15 bg-black/20 p-4">
      <div className="flex items-center gap-4">
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-emerald-400/25
            bg-emerald-500/10
          "
        >
          <Sprout
            size={19}
            className="text-emerald-300"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-4">
            <div>
              <p className="font-semibold">
                {name}
              </p>

              <p className="mt-0.5 text-xs text-emerald-300/45">
                {seed ?? "-"}
              </p>
            </div>

            <div className="text-right">
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

          <ProgressBar
            percentage={
              percentage
            }
          />

          <p className="mt-2 text-right text-xs text-emerald-300/45">
            {percentage.toFixed(
              1
            )}
            %
          </p>
        </div>
      </div>
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
    <div className="rounded-xl border border-emerald-500/15 bg-black/20 p-4">
      <p className="text-xs text-zinc-600">
        {label}
      </p>

      <p className="mt-2 font-bold">
        {value}
      </p>
    </div>
  );
}

function ReportCard({
  title,
  icon,
  pending,
  approved,
  rejected,
  latest,
  latestStatus,
  historyHref,
  submitHref,
  submitLabel,
}: {
  title: string;
  icon: LucideIcon;
  pending: number;
  approved: number;
  rejected: number;
  latest: string | null;
  latestStatus?: string;
  historyHref: string;
  submitHref: string;
  submitLabel: string;
}) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <SectionTitle
        icon={
          icon
        }
        accent="green"
        title={
          title
        }
      />

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat
          label="Pending"
          value={
            pending
          }
        />

        <MiniStat
          label="Approved"
          value={
            approved
          }
        />

        <MiniStat
          label="Rejected"
          value={
            rejected
          }
        />
      </div>

      <div className="mt-4">
        {latest ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/15 bg-black/20 p-4">
            <p className="font-medium">
              {latest}
            </p>

            {latestStatus && (
              <StatusBadge
                status={
                  latestStatus
                }
              />
            )}
          </div>
        ) : (
          <EmptyText text="Belum ada laporan pada periode ini." />
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href={
            historyHref
          }
          prefetch={false}
          className="flex-1 rounded-xl border border-emerald-500/15 bg-black/20 px-4 py-3 text-center text-sm text-zinc-300 hover:bg-emerald-950/20"
        >
          Riwayat
        </Link>

        <Link
          href={
            submitHref
          }
          prefetch={false}
          className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-black hover:bg-emerald-400"
        >
          {
            submitLabel
          }
        </Link>
      </div>
    </section>
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
    <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-3 text-center">
      <p className="text-[11px] text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold">
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
  const normalized =
    String(
      status ?? ""
    ).toUpperCase();

  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    normalized ===
      "ACTIVE" ||
    normalized ===
      "APPROVED" ||
    normalized ===
      "PAID" ||
    normalized ===
      "OPEN"
  ) {
    style =
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
  }

  if (
    normalized ===
      "PENDING" ||
    normalized ===
      "UNPAID"
  ) {
    style =
      "border-amber-500/40 bg-amber-500/10 text-amber-300";
  }

  if (
    normalized ===
      "REJECTED" ||
    normalized ===
      "RESIGNED" ||
    normalized ===
      "VOID"
  ) {
    style =
      "border-red-500/40 bg-red-500/10 text-red-300";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
    >
      {normalized}
    </span>
  );
}

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-500/10 bg-black/20 px-4 py-7 text-center text-sm text-zinc-600">
      {text}
    </div>
  );
}

function FileTextIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <ScrollText
      size={
        size
      }
      className={
        className
      }
    />
  );
}

// ============================================================
// FORMAT
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