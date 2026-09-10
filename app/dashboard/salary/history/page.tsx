import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PayrollPeriod = {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  status: string;
  closed_at: string | null;
};

type PayrollRecord = {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  approved_plants: number;
  gross_salary: number | string;
  bonus: number | string;
  fine: number | string;
  total_salary: number | string;
  status: string;
  payment_note: string | null;
  paid_by: string | null;
  paid_at: string | null;

  employees:
    | {
        name: string;
        seed: string;
      }
    | {
        name: string;
        seed: string;
      }[]
    | null;
};

export default async function SalaryHistoryPage() {
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
      status,
      closed_at
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

  // =========================================================
  // PAYROLL RECORDS
  // =========================================================

  const {
    data: recordsData,
    error: recordsError,
  } = await supabase
    .from("payroll_records")
    .select(`
      id,
      employee_id,
      period_start,
      period_end,
      approved_plants,
      gross_salary,
      bonus,
      fine,
      total_salary,
      status,
      payment_note,
      paid_by,
      paid_at,
      employees (
        name,
        seed
      )
    `)
    .order(
      "period_end",
      {
        ascending: false,
      }
    );

  if (recordsError) {
    throw new Error(
      recordsError.message
    );
  }

  const records =
    (recordsData ??
      []) as PayrollRecord[];

  // =========================================================
  // PAYERS
  // =========================================================

  const payerIds =
    Array.from(
      new Set(
        records
          .map(
            (record) =>
              record.paid_by
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  const payerMap: Record<
    string,
    string
  > = {};

  if (
    payerIds.length > 0
  ) {
    const {
      data: profiles,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name
      `)
      .in(
        "id",
        payerIds
      );

    for (
      const profile of
        profiles ?? []
    ) {
      payerMap[
        profile.id
      ] =
        profile.full_name ??
        "Unknown";
    }
  }

  // =========================================================
  // SUMMARY
  // =========================================================

  const paidRecords =
    records.filter(
      (record) =>
        record.status ===
        "PAID"
    );

  const totalPaid =
    paidRecords.reduce(
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

  const totalBonus =
    paidRecords.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.bonus
        ),
      0
    );

  const totalFine =
    paidRecords.reduce(
      (
        total,
        record
      ) =>
        total +
        Number(
          record.fine
        ),
      0
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <Link
          href="/dashboard/salary"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke Gaji
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white">
          Riwayat Gaji
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Arsip periode dan pembayaran payroll Jackson Farm.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Periode"
          value={String(
            periods.length
          )}
          description="OPEN + CLOSED"
        />

        <StatCard
          title="Pembayaran"
          value={String(
            paidRecords.length
          )}
          description="Record PAID"
        />

        <StatCard
          title="Total Dibayar"
          value={formatMoney(
            totalPaid
          )}
          description="Semua periode"
        />

        <StatCard
          title="Total Bonus / Denda"
          value={`${formatMoney(
            totalBonus
          )} / ${formatMoney(
            totalFine
          )}`}
          description="Semua pembayaran"
        />
      </div>

      {/* PERIOD HISTORY */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Riwayat Periode
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-4">
                  Periode
                </th>

                <th className="px-5 py-4">
                  Tanggal
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4 text-right">
                  Dibayar
                </th>

                <th className="px-5 py-4 text-right">
                  Payroll
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {periods.map(
                (period) => {
                  const periodRecords =
                    records.filter(
                      (record) =>
                        record.period_start ===
                          period.period_start &&
                        record.period_end ===
                          period.period_end
                    );

                  const periodPaid =
                    periodRecords
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

                  return (
                    <tr
                      key={
                        period.id
                      }
                      className="hover:bg-zinc-900/40"
                    >
                      <td className="px-5 py-4 font-medium text-white">
                        {
                          period.name
                        }
                      </td>

                      <td className="px-5 py-4 text-zinc-400">
                        {formatDate(
                          period.period_start
                        )}
                        {" - "}
                        {formatDate(
                          period.period_end
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <PeriodBadge
                          status={
                            period.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-right font-semibold text-white">
                        {formatMoney(
                          periodPaid
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-zinc-400">
                        {
                          periodRecords.length
                        }{" "}
                        record
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYMENT HISTORY */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            History Pembayaran
          </h2>
        </div>

        {paidRecords.length ===
        0 ? (
          <div className="px-6 py-16 text-center text-sm text-zinc-500">
            Belum ada pembayaran.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Pegawai
                  </th>

                  <th className="px-5 py-4">
                    Periode
                  </th>

                  <th className="px-5 py-4 text-right">
                    Plants
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
                    Dibayar
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {paidRecords.map(
                  (record) => {
                    const employee =
                      Array.isArray(
                        record.employees
                      )
                        ? record
                            .employees[0]
                        : record.employees;

                    return (
                      <tr
                        key={
                          record.id
                        }
                        className="hover:bg-zinc-900/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-white">
                            {employee?.name ??
                              "Unknown"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-600">
                            {employee?.seed ??
                              "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap text-zinc-400">
                          {formatDate(
                            record.period_start
                          )}
                          {" - "}
                          {formatDate(
                            record.period_end
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {formatNumber(
                            record.approved_plants
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {formatMoney(
                            Number(
                              record.gross_salary
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-green-400">
                          +{" "}
                          {formatMoney(
                            Number(
                              record.bonus
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-red-400">
                          -{" "}
                          {formatMoney(
                            Number(
                              record.fine
                            )
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-white">
                          {formatMoney(
                            Number(
                              record.total_salary
                            )
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-zinc-300">
                            {record.paid_by
                              ? payerMap[
                                  record.paid_by
                                ] ??
                                "Unknown"
                              : "Unknown"}
                          </p>

                          {record.paid_at && (
                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDateTime(
                                record.paid_at
                              )}
                            </p>
                          )}

                          {record.payment_note && (
                            <p className="mt-1 max-w-xs text-xs text-zinc-500">
                              {
                                record.payment_note
                              }
                            </p>
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
    </div>
  );
}

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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

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

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}