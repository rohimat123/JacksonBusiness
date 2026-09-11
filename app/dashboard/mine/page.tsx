import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Employee = {
  id: string;
  profile_id: string | null;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string | null;
  status: string;
  target_plants: number | string | null;
};

type PayrollPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
};

type PayrollRecord = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  approved_plants: number | string | null;
  rate_per_plant: number | string | null;
  gross_salary: number | string | null;
  bonus: number | string | null;
  fine: number | string | null;
  total_salary: number | string | null;
  status: string | null;
  paid_at: string | null;
};

type LoadPlantReport = {
  id: string;
  employee_id: string;
  amount: number;
  status: string;
  report_date: string;
};

type SSRPReport = {
  id: string;
  employee_id: string;
  status: string;
  report_date: string;
};

type ShiftType = {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
};

type ShiftAssignment = {
  id: string;
  employee_id: string;
  shift_date: string;
  note: string | null;
  shift_types:
    | ShiftType
    | ShiftType[]
    | null;
};

export default async function MyDashboardPage() {
  const supabase =
    await createClient();

  // ==========================================================
  // AUTH
  // ==========================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    String(
      profile.status
    ).toUpperCase() !==
      "ACTIVE"
  ) {
    redirect("/login");
  }

  const role =
    String(
      profile.role
    ).toUpperCase();

  // Owner / Manager kembali ke dashboard utama
  if (
    role === "OWNER" ||
    role === "MANAGER"
  ) {
    redirect("/dashboard");
  }

  // ==========================================================
  // EMPLOYEE
  // ==========================================================

  const {
    data: employeeData,
    error: employeeError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      profile_id,
      name,
      forum_name,
      seed,
      position,
      status,
      target_plants
    `)
    .eq(
      "profile_id",
      user.id
    )
    .maybeSingle();

  if (employeeError) {
    throw new Error(
      employeeError.message
    );
  }

  if (!employeeData) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
          <p className="font-semibold text-red-400">
            Data Pegawai Tidak Ditemukan
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            Akun ini belum
            terhubung ke data
            pegawai.
          </p>
        </div>
      </div>
    );
  }

  const employee =
    employeeData as Employee;

  // ==========================================================
  // SYSTEM SETTINGS
  // ==========================================================

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("system_settings")
    .select("default_target_plants")
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    throw new Error(
      settingsError.message
    );
  }

  const defaultTargetPlants =
    Math.max(
      0,
      Number(
        settings?.default_target_plants ??
          40000
      ) || 40000
    );

  // ==========================================================
  // PERIOD
  // ==========================================================

  const {
    data: periodsData,
    error: periodsError,
  } = await supabase
    .from("payroll_periods")
    .select(`
      id,
      period_start,
      period_end,
      status
    `)
    .order(
      "period_start",
      {
        ascending: false,
      }
    );

  if (periodsError) {
    throw new Error(
      periodsError.message
    );
  }

  const periods =
    (periodsData ??
      []) as PayrollPeriod[];

  const activePeriod =
    periods.find(
      (period) =>
        String(
          period.status
        ).toUpperCase() ===
        "OPEN"
    ) ??
    periods[0] ??
    null;

  const periodNumberMap =
    new Map<string, number>();

  [...periods]
    .sort(
      (a, b) =>
        a.period_start.localeCompare(
          b.period_start
        )
    )
    .forEach(
      (period, index) => {
        periodNumberMap.set(
          `${period.period_start}|${period.period_end}`,
          index + 1
        );
      }
    );

  const periodNumber =
    activePeriod
      ? periodNumberMap.get(
          `${activePeriod.period_start}|${activePeriod.period_end}`
        ) ?? "-"
      : "-";

  // ==========================================================
  // PERIOD STATE
  // ==========================================================

  const today =
    getJakartaDate();

  const periodNotStarted =
    activePeriod
      ? today <
        activePeriod.period_start
      : false;

  const periodFinished =
    activePeriod
      ? today >
        activePeriod.period_end
      : false;

  const periodRunning =
    Boolean(
      activePeriod &&
        !periodNotStarted &&
        !periodFinished
    );

  // ==========================================================
  // LOAD PLANT
  // ==========================================================

  let loadReports:
    LoadPlantReport[] = [];

  if (activePeriod) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "load_plant_reports"
      )
      .select(`
        id,
        employee_id,
        amount,
        status,
        report_date
      `)
      .eq(
        "employee_id",
        employee.id
      )
      .gte(
        "report_date",
        activePeriod.period_start
      )
      .lte(
        "report_date",
        activePeriod.period_end
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    loadReports =
      (data ??
        []) as LoadPlantReport[];
  }

  const approvedLoads =
    loadReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "APPROVED"
    );

  const pendingLoads =
    loadReports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "PENDING"
    );

  const approvedPlants =
    approvedLoads.reduce(
      (total, report) =>
        total +
        Number(
          report.amount ??
            0
        ),
      0
    );

  const pendingPlants =
    pendingLoads.reduce(
      (total, report) =>
        total +
        Number(
          report.amount ??
            0
        ),
      0
    );

  // ==========================================================
  // TARGET
  // ==========================================================

  const target =
    Math.max(
      0,
      Number(
        employee.target_plants ??
          defaultTargetPlants
      ) || defaultTargetPlants
    );

  const remaining =
    Math.max(
      0,
      target -
        approvedPlants
    );

  const targetPercentage =
    target > 0
      ? Math.min(
          100,
          (
            approvedPlants /
            target
          ) * 100
        )
      : 0;

  const targetReached =
    approvedPlants >=
    target;

  // ==========================================================
  // SSRP
  // ==========================================================

  let ssrpReports:
    SSRPReport[] = [];

  if (activePeriod) {
    const {
      data,
      error,
    } = await supabase
      .from("ssrp_reports")
      .select(`
        id,
        employee_id,
        status,
        report_date
      `)
      .eq(
        "employee_id",
        employee.id
      )
      .gte(
        "report_date",
        activePeriod.period_start
      )
      .lte(
        "report_date",
        activePeriod.period_end
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    ssrpReports =
      (data ??
        []) as SSRPReport[];
  }

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

  // ==========================================================
  // PAYROLL
  // ==========================================================

  let currentPayroll:
    PayrollRecord | null =
    null;

  if (activePeriod) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "payroll_records"
      )
      .select("*")
      .eq(
        "employee_id",
        employee.id
      )
      .eq(
        "period_start",
        activePeriod.period_start
      )
      .eq(
        "period_end",
        activePeriod.period_end
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        error.message
      );
    }

    currentPayroll =
      data as PayrollRecord | null;
  }

  const salaryStatus =
    String(
      currentPayroll
        ?.status ??
        "BELUM DIBUAT"
    ).toUpperCase();

  const salaryTotal =
    Number(
      currentPayroll
        ?.total_salary ??
        0
    ) || 0;

  const salaryBonus =
    Number(
      currentPayroll
        ?.bonus ??
        0
    ) || 0;

  // ==========================================================
  // NEXT SHIFT
  // ==========================================================

  const {
    data: shiftData,
    error: shiftError,
  } = await supabase
    .from(
      "shift_assignments"
    )
    .select(`
      id,
      employee_id,
      shift_date,
      note,

      shift_types (
        id,
        name,
        start_time,
        end_time
      )
    `)
    .eq(
      "employee_id",
      employee.id
    )
    .gte(
      "shift_date",
      today
    )
    .order(
      "shift_date",
      {
        ascending: true,
      }
    )
    .limit(1);

  if (shiftError) {
    throw new Error(
      shiftError.message
    );
  }

  const nextShift =
    (
      shiftData ??
      []
    )[0] as
      | ShiftAssignment
      | undefined;

  const nextShiftType =
    nextShift
      ? getRelationObject(
          nextShift.shift_types
        )
      : null;

  // ==========================================================
  // TODAY SHIFT
  // ==========================================================

  const todayShift =
    nextShift?.shift_date ===
    today
      ? nextShift
      : null;

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Employee Portal
          </p>

          <h1 className="mt-1 depth-title text-3xl font-bold text-white">
            Dashboard Saya
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Selamat datang,{" "}
            <span className="font-medium text-zinc-300">
              {employee.name}
            </span>
            .
          </p>
        </div>

        {activePeriod && (
          <div className="rounded-xl border border-emerald-500/15 bg-zinc-900/60 px-4 py-3 lg:text-right">
            <p className="text-xs text-zinc-600">
              Periode Aktif
            </p>

            <p className="mt-1 font-semibold text-white">
              Periode #
              {periodNumber}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              {formatDate(
                activePeriod.period_start
              )}
              {" - "}
              {formatDate(
                activePeriod.period_end
              )}
            </p>
          </div>
        )}
      </div>

      {/* EMPLOYEE CARD */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-2 depth-number text-xl font-bold text-white">
              {employee.name}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>
                {
                  employee.seed
                }
              </Badge>

              {employee.position && (
                <Badge>
                  {
                    employee.position
                  }
                </Badge>
              )}

              <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-semibold text-green-400">
                {
                  employee.status
                }
              </span>
            </div>

            {employee.forum_name && (
              <p className="mt-3 text-xs text-zinc-600">
                Forum:{" "}
                {
                  employee.forum_name
                }
              </p>
            )}
          </div>

          <PeriodState
            period={
              activePeriod
            }
            notStarted={
              periodNotStarted
            }
            running={
              periodRunning
            }
            finished={
              periodFinished
            }
          />
        </div>
      </section>

      {/* MAIN STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Progress Target"
          value={`${targetPercentage.toFixed(
            1
          )}%`}
          description={`${formatNumber(
            approvedPlants
          )} / ${formatNumber(
            target
          )} Plants`}
        />

        <StatCard
          title="Sisa Target"
          value={formatNumber(
            remaining
          )}
          description={
            targetReached
              ? "Target tercapai"
              : "Plants lagi"
          }
        />

        <StatCard
          title="Gaji Periode"
          value={formatMoney(
            salaryTotal
          )}
          description={
            salaryStatus
          }
        />

        <StatCard
          title="SSRP Approved"
          value={String(
            approvedSSRP
          )}
          description={`${pendingSSRP} pending`}
        />
      </div>

      {/* TARGET */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Target Periode
            </p>

            <p className="mt-2 depth-title text-2xl font-bold text-white">
              {formatNumber(
                approvedPlants
              )}
              {" / "}
              {formatNumber(
                target
              )}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="depth-title text-2xl font-bold text-white">
              {targetPercentage.toFixed(
                1
              )}
              %
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Load Plant APPROVED
            </p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full ${
              targetReached
                ? "bg-green-500"
                : "bg-white"
            }`}
            style={{
              width:
                `${targetPercentage}%`,
            }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            Pending:{" "}
            {formatNumber(
              pendingPlants
            )}{" "}
            Plants
          </p>

          <Link
            href="/dashboard/targets/mine"
            className="text-sm font-semibold text-zinc-300 transition hover:text-white"
          >
            Lihat Target →
          </Link>
        </div>
      </section>

      {/* GRID */}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* SHIFT */}

        <section className="glass-panel depth-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">
                {todayShift
                  ? "Shift Hari Ini"
                  : "Shift Berikutnya"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Jadwal kerja kamu.
              </p>
            </div>

            <Link
              href="/dashboard/shifts/mine"
              className="text-sm font-medium text-zinc-400 hover:text-white"
            >
              Lihat →
            </Link>
          </div>

          {nextShift &&
          nextShiftType ? (
            <div className="mt-6 depth-surface rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-600">
                    {todayShift
                      ? "Hari Ini"
                      : formatFullDate(
                          nextShift.shift_date
                        )}
                  </p>

                  <p className="mt-2 depth-number text-xl font-bold text-white">
                    {
                      nextShiftType.name
                    }
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    {formatShiftTime(
                      nextShiftType.start_time,
                      nextShiftType.end_time
                    )}
                  </p>
                </div>

                {todayShift && (
                  <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-semibold text-green-400">
                    HARI INI
                  </span>
                )}
              </div>

              {nextShift.note && (
                <p className="mt-4 border-t border-emerald-500/10 pt-4 text-sm text-zinc-500">
                  {
                    nextShift.note
                  }
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 depth-surface rounded-xl p-8 text-center">
              <p className="text-sm text-zinc-600">
                Belum ada shift
                berikutnya.
              </p>
            </div>
          )}
        </section>

        {/* SALARY */}

        <section className="glass-panel depth-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">
                Gaji Saya
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Payroll periode aktif.
              </p>
            </div>

            <Link
              href="/dashboard/salary/mine"
              className="text-sm font-medium text-zinc-400 hover:text-white"
            >
              Detail →
            </Link>
          </div>

          {currentPayroll ? (
            <div className="mt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-600">
                    Total Gaji
                  </p>

                  <p className="mt-2 depth-title text-3xl font-bold text-white">
                    {formatMoney(
                      salaryTotal
                    )}
                  </p>
                </div>

                <SalaryBadge
                  status={
                    salaryStatus
                  }
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniCard
                  label="Plants"
                  value={formatNumber(
                    Number(
                      currentPayroll.approved_plants ??
                        0
                    )
                  )}
                />

                <MiniCard
                  label="Bonus"
                  value={`+${formatMoney(
                    salaryBonus
                  )}`}
                />
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-yellow-900/60 bg-yellow-950/10 p-5">
              <p className="font-medium text-yellow-400">
                Belum Ada Payroll
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Owner belum membuat
                payroll periode ini.
              </p>
            </div>
          )}
        </section>

        {/* LOAD PLANT */}

        <section className="glass-panel depth-card rounded-2xl p-6">
          <div>
            <h2 className="font-semibold text-white">
              Load Plant
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Laporan periode aktif.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniCard
              label="Approved"
              value={String(
                approvedLoads.length
              )}
            />

            <MiniCard
              label="Pending"
              value={String(
                pendingLoads.length
              )}
            />

            <MiniCard
              label="Plants"
              value={formatNumber(
                approvedPlants
              )}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard/storage-reports/submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              + Kirim Load Plant
            </Link>

            <Link
              href="/dashboard/storage-reports/mine"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Riwayat
            </Link>
          </div>
        </section>

        {/* SSRP */}

        <section className="glass-panel depth-card rounded-2xl p-6">
          <div>
            <h2 className="font-semibold text-white">
              Laporan SSRP
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Status SSRP periode
              aktif.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniCard
              label="Approved"
              value={String(
                approvedSSRP
              )}
            />

            <MiniCard
              label="Pending"
              value={String(
                pendingSSRP
              )}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard/ssrp/create"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              + Kirim SSRP
            </Link>

            <Link
              href="/dashboard/ssrp/mine"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Riwayat
            </Link>
          </div>
        </section>
      </div>

      {/* QUICK LINKS */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <h2 className="font-semibold text-white">
          Akses Cepat
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickLink
            href="/dashboard/shifts/mine"
            title="Jadwal Saya"
            description="Lihat jadwal kerja"
          />

          <QuickLink
            href="/dashboard/targets/mine"
            title="Target Saya"
            description="Lihat progress target"
          />

          <QuickLink
            href="/dashboard/salary/mine"
            title="Gaji Saya"
            description="Payroll & riwayat gaji"
          />

          <QuickLink
            href="/dashboard/information"
            title="Informasi & Rules"
            description="Peraturan Jackson Farm"
          />
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
    <div className="glass-panel depth-card rounded-2xl p-5">
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

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="depth-surface rounded-xl p-4">
      <p className="text-xs text-zinc-600">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
      {children}
    </span>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="depth-surface rounded-xl p-4 transition hover:border-emerald-500/25 hover:bg-emerald-950/25"
    >
      <p className="font-semibold text-white">
        {title}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>

      <p className="mt-3 text-sm text-zinc-400">
        Buka →
      </p>
    </Link>
  );
}

// ============================================================
// PERIOD STATE
// ============================================================

function PeriodState({
  period,
  notStarted,
  running,
  finished,
}: {
  period:
    | PayrollPeriod
    | null;
  notStarted: boolean;
  running: boolean;
  finished: boolean;
}) {
  if (!period) {
    return (
      <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-500">
        BELUM ADA PERIODE
      </span>
    );
  }

  if (notStarted) {
    return (
      <div className="md:text-right">
        <span className="rounded-full border border-purple-900 bg-purple-950/20 px-3 py-1 text-xs font-semibold text-purple-400">
          BELUM DIMULAI
        </span>

        <p className="mt-2 text-xs text-zinc-600">
          Mulai{" "}
          {formatDate(
            period.period_start
          )}
        </p>
      </div>
    );
  }

  if (running) {
    return (
      <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-semibold text-green-400">
        PERIODE BERJALAN
      </span>
    );
  }

  if (finished) {
    return (
      <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-semibold text-red-400">
        PERIODE BERAKHIR
      </span>
    );
  }

  return null;
}

// ============================================================
// SALARY BADGE
// ============================================================

function SalaryBadge({
  status,
}: {
  status: string;
}) {
  if (status === "PAID") {
    return (
      <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs font-semibold text-green-400">
        PAID
      </span>
    );
  }

  if (status === "VOID") {
    return (
      <span className="rounded-full border border-red-900 bg-red-950/20 px-3 py-1 text-xs font-semibold text-red-400">
        VOID
      </span>
    );
  }

  return (
    <span className="rounded-full border border-yellow-900 bg-yellow-950/20 px-3 py-1 text-xs font-semibold text-yellow-400">
      UNPAID
    </span>
  );
}

// ============================================================
// RELATION
// ============================================================

function getRelationObject<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

// ============================================================
// DATE
// ============================================================

function getJakartaDate() {
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

function parseISODate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
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

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      value
    )
  );
}

function formatFullDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      value
    )
  );
}

// ============================================================
// SHIFT
// ============================================================

function formatShiftTime(
  start:
    | string
    | null,
  end:
    | string
    | null
) {
  if (
    !start &&
    !end
  ) {
    return "Tidak ada jam khusus";
  }

  return `${formatTime(
    start
  )} - ${formatTime(
    end
  )}`;
}

function formatTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "--:--";
  }

  return value.slice(
    0,
    5
  );
}

// ============================================================
// NUMBER
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
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        value % 1 === 0
          ? 0
          : 2,

      maximumFractionDigits:
        2,
    }
  ).format(value);
}