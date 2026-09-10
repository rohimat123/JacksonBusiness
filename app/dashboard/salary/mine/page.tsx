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
  approved_ssrp: number | string | null;
  rate_per_plant: number | string | null;
  ssrp_rate: number | string | null;
  gross_salary: number | string | null;
  bonus: number | string | null;
  fine: number | string | null;
  total_salary: number | string | null;
  status: string | null;
  payment_note: string | null;
  paid_at: string | null;
};

export default async function MySalaryPage() {
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

if (role === "OWNER") {
  redirect("/dashboard/salary");
}
if (
  role !== "EMPLOYEE" &&
  role !== "MANAGER"
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
      status
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
    .select("payroll_rate, ssrp_rate")
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

  // ==========================================================
  // PERIODS
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

  // ==========================================================
  // ALL PAYROLL
  // ==========================================================

  const {
    data: payrollData,
    error: payrollError,
  } = await supabase
    .from(
      "payroll_records"
    )
    .select("*")
    .eq(
      "employee_id",
      employee.id
    )
    .order(
      "period_start",
      {
        ascending: false,
      }
    );

  if (payrollError) {
    throw new Error(
      payrollError.message
    );
  }

  const payrollRecords =
    (payrollData ??
      []) as PayrollRecord[];

  // ==========================================================
  // CURRENT PAYROLL
  // ==========================================================

  const currentPayroll =
    activePeriod
      ? payrollRecords.find(
          (record) =>
            record.period_start ===
              activePeriod.period_start &&
            record.period_end ===
              activePeriod.period_end
        ) ?? null
      : payrollRecords[0] ??
        null;

  // ==========================================================
  // CURRENT VALUES
  // ==========================================================

  const approvedPlants =
    Number(
      currentPayroll
        ?.approved_plants ??
        0
    ) || 0;

  const rate =
    Number(
      currentPayroll
        ?.rate_per_plant ??
        currentPayrollRate
    ) || currentPayrollRate;

  const approvedSSRP =
    Number(
      currentPayroll
        ?.approved_ssrp ??
        0
    ) || 0;

  const ssrpRate =
    Number(
      currentPayroll
        ?.ssrp_rate ??
        currentSSRPRate
    ) || currentSSRPRate;

  const grossSalary =
    Number(
      currentPayroll
        ?.gross_salary ??
        0
    ) || 0;

  const bonus =
    Number(
      currentPayroll
        ?.bonus ??
        0
    ) || 0;

  const fine =
    Number(
      currentPayroll
        ?.fine ??
        0
    ) || 0;

  const totalSalary =
    Number(
      currentPayroll
        ?.total_salary ??
        0
    ) || 0;

  const payrollStatus =
    String(
      currentPayroll
        ?.status ??
        "UNPAID"
    ).toUpperCase();

  // ==========================================================
  // PERIOD NUMBER
  // ==========================================================

  const periodNumberMap =
    new Map<
      string,
      number
    >();

  [...periods]
    .sort(
      (
        a,
        b
      ) =>
        a.period_start.localeCompare(
          b.period_start
        )
    )
    .forEach(
      (
        period,
        index
      ) => {
        periodNumberMap.set(
          `${period.period_start}|${period.period_end}`,
          index + 1
        );
      }
    );

  const activePeriodNumber =
    activePeriod
      ? periodNumberMap.get(
          `${activePeriod.period_start}|${activePeriod.period_end}`
        ) ?? "-"
      : "-";

  // ==========================================================
  // HISTORY STATS
  // ==========================================================

  const paidRecords =
    payrollRecords.filter(
      (record) =>
        String(
          record.status
        ).toUpperCase() ===
        "PAID"
    );

  const totalReceived =
    paidRecords.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.total_salary ??
            0
        ),
      0
    );

  const totalApprovedPlants =
    payrollRecords.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.approved_plants ??
            0
        ),
      0
    );

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
          <h1 className="text-3xl font-bold text-white">
            Gaji Saya
          </h1>

          {currentPayroll && (
            <SalaryStatus
              status={
                payrollStatus
              }
            />
          )}
        </div>

        <p className="mt-2 text-sm text-zinc-500">
          Informasi gaji dan
          riwayat pembayaran kamu.
        </p>
      </div>

      {/* EMPLOYEE */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
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
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Periode Aktif
            </p>

            {activePeriod ? (
              <>
                <p className="mt-2 font-semibold text-white">
                  Periode #
                  {
                    activePeriodNumber
                  }
                </p>

                <p className="mt-1 text-sm text-zinc-400">
                  {formatDate(
                    activePeriod.period_start
                  )}
                  {" - "}
                  {formatDate(
                    activePeriod.period_end
                  )}
                </p>

                <p className="mt-1 text-xs font-semibold text-green-400">
                  {
                    activePeriod.status
                  }
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                Belum ada periode.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* CURRENT PAYROLL */}

      {!currentPayroll ? (
        <section className="rounded-2xl border border-yellow-900 bg-yellow-950/20 p-6">
          <p className="font-semibold text-yellow-400">
            Gaji Belum Dibuat
          </p>

          <p className="mt-2 text-sm leading-6 text-yellow-100/70">
            Payroll untuk periode
            ini belum dibuat oleh
            Owner / Manager.
          </p>
        </section>
      ) : (
        <>
          {/* SUMMARY */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Approved Plants"
              value={formatNumber(
                approvedPlants
              )}
              description="Plants periode ini"
            />

            <StatCard
              title="Rate"
              value={formatMoney(
                rate
              )}
              description="Per plant"
            />

            <StatCard
              title="Gaji Kotor"
              value={formatMoney(
                grossSalary
              )}
              description="Plants + SSRP"
            />

            <StatCard
              title="Total Gaji"
              value={formatMoney(
                totalSalary
              )}
              description={
                payrollStatus
              }
            />
          </div>

          {/* PAYROLL DETAIL */}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60">
            <div className="border-b border-zinc-800 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-white">
                    Detail Gaji
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Perhitungan
                    payroll periode
                    aktif.
                  </p>
                </div>

                <SalaryStatus
                  status={
                    payrollStatus
                  }
                />
              </div>
            </div>

            <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
              <DetailItem
                label="Approved Plants"
                value={`${formatNumber(
                  approvedPlants
                )} Plants`}
              />

              <DetailItem
                label="Rate / Plant"
                value={formatMoney(
                  rate
                )}
              />

              <DetailItem
                label="Approved SSRP"
                value={`${formatNumber(
                  approvedSSRP
                )} SSRP`}
              />

              <DetailItem
                label="Rate / SSRP"
                value={formatMoney(
                  ssrpRate
                )}
              />

              <DetailItem
                label="Gaji Kotor"
                value={formatMoney(
                  grossSalary
                )}
              />

              <DetailItem
                label="Bonus"
                value={`+ ${formatMoney(
                  bonus
                )}`}
                valueClass="text-green-400"
              />

              <DetailItem
                label="Denda"
                value={`- ${formatMoney(
                  fine
                )}`}
                valueClass="text-red-400"
              />

              <DetailItem
                label="Total Dibayar"
                value={formatMoney(
                  totalSalary
                )}
                valueClass="text-white"
              />

              <DetailItem
                label="Status"
                value={
                  payrollStatus
                }
              />

              <DetailItem
                label="Tanggal Dibayar"
                value={
                  currentPayroll.paid_at
                    ? formatDateTime(
                        currentPayroll.paid_at
                      )
                    : "-"
                }
              />
            </div>
          </section>

          {/* CALCULATION */}

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="font-semibold text-white">
              Perhitungan
            </h2>

            <div className="mt-5 space-y-4">
              <CalculationRow
                label={`${formatNumber(
                  approvedPlants
                )} Plants × ${formatMoney(
                  rate
                )}`}
                value={formatMoney(
                  grossSalary
                )}
              />

              <CalculationRow
                label="Bonus"
                value={`+ ${formatMoney(
                  bonus
                )}`}
                valueClass="text-green-400"
              />

              <CalculationRow
                label="Denda"
                value={`- ${formatMoney(
                  fine
                )}`}
                valueClass="text-red-400"
              />

              <div className="border-t border-zinc-800 pt-4">
                <CalculationRow
                  label="Total Gaji"
                  value={formatMoney(
                    totalSalary
                  )}
                  bold
                />
              </div>
            </div>
          </section>

          {/* PAYMENT STATUS */}

          <PaymentInformation
            status={
              payrollStatus
            }
            total={
              totalSalary
            }
            paidAt={
              currentPayroll.paid_at
            }
          />

          {/* NOTE */}

          {currentPayroll.payment_note && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
              <p className="text-xs uppercase tracking-wide text-zinc-600">
                Catatan Pembayaran
              </p>

              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {
                  currentPayroll.payment_note
                }
              </p>
            </section>
          )}
        </>
      )}

      {/* LIFETIME SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Periode"
          value={String(
            payrollRecords.length
          )}
          description="Payroll tercatat"
        />

        <StatCard
          title="Sudah Dibayar"
          value={String(
            paidRecords.length
          )}
          description="Periode PAID"
        />

        <StatCard
          title="Total Diterima"
          value={formatMoney(
            totalReceived
          )}
          description={`${formatNumber(
            totalApprovedPlants
          )} approved plants`}
        />
      </div>

      {/* HISTORY */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h2 className="font-semibold text-white">
            Riwayat Gaji
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Semua payroll yang
            tercatat untuk akun
            kamu.
          </p>
        </div>

        {payrollRecords.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-zinc-600">
              Belum ada riwayat
              payroll.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-6 py-4">
                    Periode
                  </th>

                  <th className="px-6 py-4 text-right">
                    Plants
                  </th>

                  <th className="px-6 py-4 text-right">
                    Kotor
                  </th>

                  <th className="px-6 py-4 text-right">
                    Bonus
                  </th>

                  <th className="px-6 py-4 text-right">
                    Denda
                  </th>

                  <th className="px-6 py-4 text-right">
                    Total
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Dibayar
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {payrollRecords.map(
                  (record) => {
                    const recordStatus =
                      String(
                        record.status ??
                          "UNPAID"
                      ).toUpperCase();

                    const periodNumber =
                      periodNumberMap.get(
                        `${record.period_start}|${record.period_end}`
                      );

                    return (
                      <tr
                        key={
                          record.id
                        }
                        className="transition hover:bg-zinc-900/50"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <p className="font-medium text-white">
                            {periodNumber
                              ? `Periode #${periodNumber}`
                              : "Periode"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {formatDate(
                              record.period_start
                            )}
                            {" - "}
                            {formatDate(
                              record.period_end
                            )}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-right text-zinc-300">
                          {formatNumber(
                            Number(
                              record.approved_plants ??
                                0
                            )
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-zinc-300">
                          {formatMoney(
                            Number(
                              record.gross_salary ??
                                0
                            )
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-green-400">
                          +
                          {formatMoney(
                            Number(
                              record.bonus ??
                                0
                            )
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-red-400">
                          -
                          {formatMoney(
                            Number(
                              record.fine ??
                                0
                            )
                          )}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold text-white">
                          {formatMoney(
                            Number(
                              record.total_salary ??
                                0
                            )
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <SalaryStatus
                            status={
                              recordStatus
                            }
                          />
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-xs text-zinc-500">
                          {record.paid_at
                            ? formatDateTime(
                                record.paid_at
                              )
                            : "-"}
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white">
          Informasi Gaji
        </h2>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
          Gaji dihitung berdasarkan
          jumlah Load Plant yang
          sudah APPROVED pada periode
          payroll. Rate dasar sistem
          adalah {formatMoney(
            currentPayrollRate
          )} per plant dan {formatMoney(
            currentSSRPRate
          )} per SSRP APPROVED,
          kemudian Owner / Manager
          dapat menambahkan bonus
          atau denda sebelum payroll
          dibayarkan.
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
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

// ============================================================
// DETAIL ITEM
// ============================================================

function DetailItem({
  label,
  value,
  valueClass = "text-zinc-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-zinc-950/70 p-5">
      <p className="text-xs uppercase tracking-wide text-zinc-600">
        {label}
      </p>

      <p
        className={`mt-2 font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// CALCULATION
// ============================================================

function CalculationRow({
  label,
  value,
  valueClass = "text-zinc-300",
  bold = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <p
        className={
          bold
            ? "font-semibold text-white"
            : "text-sm text-zinc-500"
        }
      >
        {label}
      </p>

      <p
        className={`${
          bold
            ? "text-xl font-bold"
            : "text-sm font-semibold"
        } ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// PAYMENT INFO
// ============================================================

function PaymentInformation({
  status,
  total,
  paidAt,
}: {
  status: string;
  total: number;
  paidAt: string | null;
}) {
  if (
    status === "PAID"
  ) {
    return (
      <section className="rounded-2xl border border-green-900 bg-green-950/20 p-6">
        <p className="font-semibold text-green-400">
          Gaji Sudah Dibayar
        </p>

        <p className="mt-2 text-sm leading-6 text-green-100/70">
          Payroll sebesar{" "}
          <span className="font-semibold text-white">
            {formatMoney(
              total
            )}
          </span>{" "}
          sudah ditandai PAID.
        </p>

        {paidAt && (
          <p className="mt-2 text-xs text-green-300/60">
            Dibayar pada{" "}
            {formatDateTime(
              paidAt
            )}
          </p>
        )}
      </section>
    );
  }

  if (
    status === "VOID"
  ) {
    return (
      <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
        <p className="font-semibold text-red-400">
          Payroll VOID
        </p>

        <p className="mt-2 text-sm leading-6 text-red-100/70">
          Payroll periode ini
          dibatalkan dan tidak dapat
          dibayarkan.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-yellow-900 bg-yellow-950/20 p-6">
      <p className="font-semibold text-yellow-400">
        Menunggu Pembayaran
      </p>

      <p className="mt-2 text-sm leading-6 text-yellow-100/70">
        Payroll sebesar{" "}
        <span className="font-semibold text-white">
          {formatMoney(
            total
          )}
        </span>{" "}
        belum ditandai PAID oleh
        Owner / Manager.
      </p>
    </section>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function SalaryStatus({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(
      status
    ).toUpperCase();

  if (
    normalized === "PAID"
  ) {
    return (
      <span className="inline-flex rounded-full border border-green-900 bg-green-950/30 px-3 py-1 text-xs font-semibold text-green-400">
        PAID
      </span>
    );
  }

  if (
    normalized === "VOID"
  ) {
    return (
      <span className="inline-flex rounded-full border border-red-900 bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-400">
        VOID
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-yellow-900 bg-yellow-950/30 px-3 py-1 text-xs font-semibold text-yellow-400">
      UNPAID
    </span>
  );
}

// ============================================================
// DATE
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

function formatDateTime(
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

      hour:
        "2-digit",

      minute:
        "2-digit",

      timeZone:
        "Asia/Jakarta",
    }
  ).format(
    new Date(
      value
    )
  );
}

// ============================================================
// NUMBER / MONEY
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