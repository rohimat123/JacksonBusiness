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

type LoadPlantReport = {
  id: string;
  employee_id: string;
  seed: string;
  amount: number;
  status: string;
  report_date: string;
  created_at: string;
};

export default async function MyTargetPage() {
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

  // ==========================================================
  // PROFILE
  // ==========================================================

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
    .eq(
      "id",
      user.id
    )
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

  if (
    role === "OWNER" ||
    role === "MANAGER"
  ) {
    redirect(
      "/dashboard/targets"
    );
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

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Akun kamu belum
            terhubung dengan data
            pegawai. Hubungi Owner.
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
    error: periodError,
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

  if (periodError) {
    throw new Error(
      periodError.message
    );
  }

  const periods =
    (periodsData ??
      []) as PayrollPeriod[];

  const currentPeriod =
    periods.find(
      (period) =>
        String(
          period.status
        ).toUpperCase() ===
        "OPEN"
    ) ??
    periods[0] ??
    null;

  if (!currentPeriod) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-sm text-zinc-500">
            Pekerjaan Saya
          </p>

          <h1 className="mt-1 depth-title text-3xl font-bold text-white">
            Target Saya
          </h1>
        </div>

        <div className="rounded-2xl border border-yellow-900 bg-yellow-950/20 p-6">
          <p className="font-semibold text-yellow-400">
            Belum Ada Periode
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            Owner belum membuat
            periode payroll.
          </p>
        </div>
      </div>
    );
  }

  const periodStart =
    currentPeriod.period_start;

  const periodEnd =
    currentPeriod.period_end;

  // ==========================================================
  // DATE / PERIOD STATE
  // ==========================================================

  const today =
    getJakartaDate();

  const periodNotStarted =
    today <
    periodStart;

  const periodFinished =
    today >
    periodEnd;

  const periodRunning =
    !periodNotStarted &&
    !periodFinished;

  const daysTotal =
    getDaysBetween(
      periodStart,
      periodEnd
    ) + 1;

  let daysRemaining = 0;

  if (periodNotStarted) {
    daysRemaining =
      daysTotal;
  } else if (
    periodRunning
  ) {
    daysRemaining =
      getDaysBetween(
        today,
        periodEnd
      ) + 1;
  }

  // ==========================================================
  // LOAD PLANT
  // ==========================================================

  const {
    data: reportsData,
    error: reportsError,
  } = await supabase
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
      periodStart
    )
    .lte(
      "report_date",
      periodEnd
    )
    .order(
      "report_date",
      {
        ascending: false,
      }
    );

  if (reportsError) {
    throw new Error(
      reportsError.message
    );
  }

  const reports =
    (reportsData ??
      []) as LoadPlantReport[];

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

  const rejectedReports =
    reports.filter(
      (report) =>
        String(
          report.status
        ).toUpperCase() ===
        "REJECTED"
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

  const approvedPlants =
    approvedReports.reduce(
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

  const pendingPlants =
    pendingReports.reduce(
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

  const remaining =
    Math.max(
      0,
      target -
        approvedPlants
    );

  const rawPercentage =
    target > 0
      ? (
          approvedPlants /
          target
        ) * 100
      : 0;

  const percentage =
    Math.min(
      100,
      rawPercentage
    );

  const targetReached =
    approvedPlants >=
    target;

  // ==========================================================
  // DAILY TARGET
  // ==========================================================

  let neededPerDay = 0;

  if (
    !targetReached &&
    !periodFinished &&
    daysRemaining > 0
  ) {
    neededPerDay =
      Math.ceil(
        remaining /
          daysRemaining
      );
  }

  // ==========================================================
  // ESTIMATE WITH PENDING
  // ==========================================================

  const estimatedPlants =
    approvedPlants +
    pendingPlants;

  const estimatedPercentage =
    target > 0
      ? Math.min(
          100,
          (
            estimatedPlants /
            target
          ) * 100
        )
      : 0;

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div>
        <p className="text-sm text-zinc-500">
          Pekerjaan Saya
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="depth-title text-3xl font-bold text-white">
            Target Saya
          </h1>

          <StatusBadge
            reached={
              targetReached
            }
            notStarted={
              periodNotStarted
            }
            finished={
              periodFinished
            }
          />
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          Progress target dihitung
          dari Load Plant yang sudah
          APPROVED.
        </p>
      </div>

      {/* EMPLOYEE */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-2 depth-number text-xl font-bold text-white">
              {employee.name}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                {
                  employee.seed
                }
              </span>

              {employee.position && (
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">
                  {
                    employee.position
                  }
                </span>
              )}

              <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-xs text-green-400">
                {
                  employee.status
                }
              </span>
            </div>
          </div>

          <div className="lg:text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Periode
            </p>

            <p className="mt-2 font-semibold text-white">
              {formatDate(
                periodStart
              )}
              {" - "}
              {formatDate(
                periodEnd
              )}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Status Database:{" "}
              <span className="font-semibold text-green-400">
                {
                  currentPeriod.status
                }
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Target"
          value={formatNumber(
            target
          )}
          description="Plants"
        />

        <StatCard
          title="Approved"
          value={formatNumber(
            approvedPlants
          )}
          description="Plants masuk progress"
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
          title={
            periodNotStarted
              ? "Durasi Periode"
              : "Sisa Waktu"
          }
          value={
            periodFinished
              ? "0 Hari"
              : `${daysRemaining} Hari`
          }
          description={
            periodNotStarted
              ? `Mulai ${formatDate(
                  periodStart
                )}`
              : `${daysTotal} hari / periode`
          }
        />
      </div>

      {/* PROGRESS */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">
              Progress Target
            </p>

            <p className="mt-2 depth-title text-3xl font-bold text-white">
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
            <p className="depth-title text-3xl font-bold text-white">
              {percentage.toFixed(
                1
              )}
              %
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Progress Approved
            </p>
          </div>
        </div>

        <div className="mt-6 h-4 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full ${
              targetReached
                ? "bg-green-500"
                : "bg-white"
            }`}
            style={{
              width:
                `${percentage}%`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs text-zinc-600">
          <span>
            0
          </span>

          <span>
            {formatNumber(
              target
            )}
          </span>
        </div>
      </section>

      {/* PERIOD STATUS */}

      {targetReached ? (
        <section className="rounded-2xl border border-green-900 bg-green-950/20 p-6">
          <p className="font-semibold text-green-400">
            Target Tercapai 🎉
          </p>

          <p className="mt-2 text-sm leading-6 text-green-200/70">
            Kamu sudah mencapai
            target dengan total{" "}
            <span className="font-semibold text-white">
              {formatNumber(
                approvedPlants
              )}{" "}
              plants
            </span>
            .
          </p>
        </section>
      ) : periodNotStarted ? (
        <section className="rounded-2xl border border-purple-900 bg-purple-950/20 p-6">
          <p className="font-semibold text-purple-400">
            Periode Belum Dimulai
          </p>

          <p className="mt-2 text-sm leading-6 text-purple-200/70">
            Periode target akan
            dimulai pada{" "}
            <span className="font-semibold text-white">
              {formatDate(
                periodStart
              )}
            </span>
            {" "}dan berlangsung
            selama{" "}
            <span className="font-semibold text-white">
              {daysTotal} hari
            </span>
            .
          </p>

          <p className="mt-2 text-sm leading-6 text-purple-200/70">
            Untuk mencapai target{" "}
            {formatNumber(
              target
            )}{" "}
            plants dalam satu
            periode, rata-rata yang
            dibutuhkan sekitar{" "}
            <span className="font-semibold text-white">
              {formatNumber(
                neededPerDay
              )}{" "}
              plants / hari
            </span>
            .
          </p>
        </section>
      ) : periodFinished ? (
        <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
          <p className="font-semibold text-red-400">
            Periode Sudah Berakhir
          </p>

          <p className="mt-2 text-sm leading-6 text-red-200/70">
            Target belum tercapai.
            Masih kurang{" "}
            <span className="font-semibold text-white">
              {formatNumber(
                remaining
              )}{" "}
              plants
            </span>
            .
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-blue-900 bg-blue-950/20 p-6">
          <p className="font-semibold text-blue-400">
            Target Masih Berjalan
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-200/70">
            Masih ada{" "}
            <span className="font-semibold text-white">
              {daysRemaining} hari
            </span>{" "}
            sampai periode
            berakhir.
          </p>

          <p className="mt-2 text-sm leading-6 text-blue-200/70">
            Untuk mencapai target,
            rata-rata kamu perlu
            sekitar{" "}
            <span className="font-semibold text-white">
              {formatNumber(
                neededPerDay
              )}{" "}
              plants / hari
            </span>
            .
          </p>
        </section>
      )}

      {/* PENDING */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Laporan Pending
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Pending belum masuk
              progress sampai
              disetujui Owner.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SmallStat
              label="Laporan"
              value={String(
                pendingReports.length
              )}
            />

            <SmallStat
              label="Plants"
              value={formatNumber(
                pendingPlants
              )}
            />

            <SmallStat
              label="Estimasi"
              value={`${estimatedPercentage.toFixed(
                1
              )}%`}
            />
          </div>
        </div>

        {pendingPlants > 0 && (
          <p className="mt-5 border-t border-emerald-500/10 pt-4 text-sm text-zinc-500">
            Jika seluruh laporan
            pending disetujui,
            progress menjadi{" "}
            <span className="font-semibold text-white">
              {formatNumber(
                estimatedPlants
              )}
              {" / "}
              {formatNumber(
                target
              )}
            </span>
            .
          </p>
        )}
      </section>

      {/* HISTORY */}

      <section className="overflow-hidden glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-5">
          <h2 className="font-semibold text-white">
            Riwayat Load Plant Periode Ini
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Approved:{" "}
            {
              approvedReports.length
            }
            {" • "}
            Pending:{" "}
            {
              pendingReports.length
            }
            {" • "}
            Rejected:{" "}
            {
              rejectedReports.length
            }
          </p>
        </div>

        {reports.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-zinc-600">
              Belum ada Load Plant
              pada periode ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-500/10 bg-zinc-950/40 text-xs uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-6 py-4">
                    Tanggal
                  </th>

                  <th className="px-6 py-4">
                    Seed
                  </th>

                  <th className="px-6 py-4 text-right">
                    Plants
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right">
                    Masuk Progress
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {reports.map(
                  (
                    report
                  ) => {
                    const reportStatus =
                      String(
                        report.status
                      ).toUpperCase();

                    return (
                      <tr
                        key={
                          report.id
                        }
                        className="hover:bg-emerald-950/25/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-zinc-300">
                          {formatDate(
                            report.report_date
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                            {
                              report.seed
                            }
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-white">
                          {formatNumber(
                            Number(
                              report.amount
                            )
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <ReportStatus
                            status={
                              reportStatus
                            }
                          />
                        </td>

                        <td className="px-6 py-4 text-right">
                          {reportStatus ===
                          "APPROVED" ? (
                            <span className="font-semibold text-green-400">
                              +
                              {formatNumber(
                                Number(
                                  report.amount
                                )
                              )}
                            </span>
                          ) : (
                            <span className="text-zinc-600">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* INFO */}

      <section className="rounded-2xl border border-emerald-500/15 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white">
          Cara Progress Dihitung
        </h2>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
          Hanya laporan Load Plant
          dengan status APPROVED
          yang menambah progress
          target. Laporan PENDING
          belum dihitung dan laporan
          REJECTED tidak menambah
          progress. Penjualan hasil
          tanaman juga tidak
          mengurangi progress target.
        </p>
      </section>
    </div>
  );
}

// ============================================================
// STAT CARD
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

// ============================================================
// SMALL STAT
// ============================================================

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[100px] depth-surface rounded-xl px-4 py-3">
      <p className="text-xs text-zinc-600">
        {label}
      </p>

      <p className="mt-1 font-bold text-white">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// TARGET STATUS
// ============================================================

function StatusBadge({
  reached,
  notStarted,
  finished,
}: {
  reached: boolean;
  notStarted: boolean;
  finished: boolean;
}) {
  if (reached) {
    return (
      <span className="rounded-full border border-green-900 bg-green-950/30 px-3 py-1 text-xs font-semibold text-green-400">
        TERCAPAI
      </span>
    );
  }

  if (notStarted) {
    return (
      <span className="rounded-full border border-purple-900 bg-purple-950/30 px-3 py-1 text-xs font-semibold text-purple-400">
        BELUM DIMULAI
      </span>
    );
  }

  if (finished) {
    return (
      <span className="rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-400">
        TIDAK TERCAPAI
      </span>
    );
  }

  return (
    <span className="rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-400">
      BERJALAN
    </span>
  );
}

// ============================================================
// REPORT STATUS
// ============================================================

function ReportStatus({
  status,
}: {
  status: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-950 text-zinc-400";

  if (
    status ===
    "APPROVED"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    status ===
    "PENDING"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status ===
    "REJECTED"
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
// CURRENT JAKARTA DATE
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

// ============================================================
// DATE HELPERS
// ============================================================

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

function getDaysBetween(
  start: string,
  end: string
) {
  const startDate =
    parseISODate(
      start
    );

  const endDate =
    parseISODate(
      end
    );

  return Math.floor(
    (
      endDate.getTime() -
      startDate.getTime()
    ) /
      86400000
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