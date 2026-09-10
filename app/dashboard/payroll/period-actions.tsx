"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  periodId: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
};

export default function PeriodActions({
  periodId,
  periodName,
  periodStart,
  periodEnd,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  // =========================================================
  // CHECK PERIOD END
  // =========================================================

  const canCloseNormally =
    useMemo(() => {
      const today =
        new Date();

      const todayOnly =
        new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        );

      const periodEndDate =
        new Date(
          `${periodEnd}T00:00:00Z`
        );

      return (
        todayOnly.getTime() >=
        periodEndDate.getTime()
      );
    }, [periodEnd]);

  // =========================================================
  // NORMAL CLOSE
  // =========================================================

  async function closePeriod() {
    if (!canCloseNormally) {
      setErrorMessage(
        `Periode belum selesai. Periode berakhir ${formatDate(
          periodEnd
        )}.`
      );

      return;
    }

    await processClose(false);
  }

  // =========================================================
  // FORCE CLOSE
  // =========================================================

  async function forceClosePeriod() {
    const confirmed =
      window.confirm(
        `FORCE CLOSE ${periodName}?\n\n${formatDate(
          periodStart
        )} - ${formatDate(
          periodEnd
        )}\n\nPeriode belum selesai. Tindakan ini akan menutup periode lebih awal.`
      );

    if (!confirmed) {
      return;
    }

    const secondConfirm =
      window.prompt(
        'Ketik "FORCE CLOSE" untuk melanjutkan:'
      );

    if (
      secondConfirm !==
      "FORCE CLOSE"
    ) {
      setErrorMessage(
        'Force Close dibatalkan. Ketik persis "FORCE CLOSE".'
      );

      return;
    }

    await processClose(true);
  }

  // =========================================================
  // PROCESS CLOSE
  // =========================================================

  async function processClose(
    force: boolean
  ) {
    setLoading(true);
    setErrorMessage("");

    try {
      const supabase =
        createClient();

      // ======================================================
      // AUTH
      // ======================================================

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "Session login tidak ditemukan."
        );
      }

      // ======================================================
      // OWNER CHECK
      // ======================================================

      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(`
            role,
            status
          `)
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (
        !profile ||
        profile.role !==
          "OWNER" ||
        profile.status !==
          "ACTIVE"
      ) {
        throw new Error(
          "Hanya OWNER ACTIVE yang dapat menutup periode."
        );
      }

      // ======================================================
      // SYSTEM SETTINGS
      // ======================================================

      const {
        data: settings,
        error: settingsError,
      } =
        await supabase
          .from(
            "system_settings"
          )
          .select(`
            payroll_period_days
          `)
          .limit(1)
          .maybeSingle();

      if (settingsError) {
        throw settingsError;
      }

      const payrollPeriodDays =
        Math.max(
          1,
          Number(
            settings
              ?.payroll_period_days ??
              14
          ) || 14
        );

      // ======================================================
      // GET CURRENT PERIOD
      // ======================================================

      const {
        data: currentPeriod,
        error: currentPeriodError,
      } =
        await supabase
          .from(
            "payroll_periods"
          )
          .select(`
            id,
            name,
            period_start,
            period_end,
            status
          `)
          .eq(
            "id",
            periodId
          )
          .maybeSingle();

      if (
        currentPeriodError
      ) {
        throw currentPeriodError;
      }

      if (
        !currentPeriod
      ) {
        throw new Error(
          "Periode tidak ditemukan."
        );
      }

      if (
        currentPeriod.status !==
        "OPEN"
      ) {
        throw new Error(
          "Periode ini sudah ditutup."
        );
      }

      // ======================================================
      // DATE CHECK AGAIN
      // ======================================================

      if (!force) {
        const today =
          new Date();

        const todayOnly =
          new Date(
            Date.UTC(
              today.getUTCFullYear(),
              today.getUTCMonth(),
              today.getUTCDate()
            )
          );

        const endDate =
          new Date(
            `${currentPeriod.period_end}T00:00:00Z`
          );

        if (
          todayOnly.getTime() <
          endDate.getTime()
        ) {
          throw new Error(
            `Periode belum selesai. Berakhir ${formatDate(
              currentPeriod.period_end
            )}.`
          );
        }
      }

      // ======================================================
      // CHECK UNPAID PAYROLL > $0
      // ======================================================

      const {
        data: unpaidRecords,
        error: unpaidError,
      } =
        await supabase
          .from(
            "payroll_records"
          )
          .select(`
            id,
            employee_id,
            total_salary,
            status
          `)
          .eq(
            "period_start",
            currentPeriod.period_start
          )
          .eq(
            "period_end",
            currentPeriod.period_end
          )
          .eq(
            "status",
            "UNPAID"
          )
          .gt(
            "total_salary",
            0
          );

      if (unpaidError) {
        throw unpaidError;
      }

      if (
        (unpaidRecords ?? [])
          .length > 0
      ) {
        throw new Error(
          `Masih ada ${
            unpaidRecords?.length ??
            0
          } payroll dengan gaji yang belum dibayar.`
        );
      }

      // ======================================================
      // CHECK OTHER OPEN PERIOD
      // ======================================================

      const {
        data: openPeriods,
        error: openPeriodsError,
      } =
        await supabase
          .from(
            "payroll_periods"
          )
          .select(`
            id,
            name,
            period_start,
            period_end
          `)
          .eq(
            "status",
            "OPEN"
          )
          .neq(
            "id",
            periodId
          );

      if (
        openPeriodsError
      ) {
        throw openPeriodsError;
      }

      if (
        (openPeriods ?? [])
          .length > 0
      ) {
        throw new Error(
          `Ada periode OPEN lain: ${
            openPeriods?.[0]
              ?.name ??
            "Unknown"
          }. Tutup atau perbaiki periode tersebut terlebih dahulu.`
        );
      }

      // ======================================================
      // CONFIRM NORMAL CLOSE
      // ======================================================

      if (!force) {
        const confirmed =
          window.confirm(
            `Tutup ${currentPeriod.name}?\n\n${formatDate(
              currentPeriod.period_start
            )} - ${formatDate(
              currentPeriod.period_end
            )}\n\nPeriode baru ${payrollPeriodDays} hari berikutnya akan otomatis dibuat.`
          );

        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      // ======================================================
      // CLOSE PERIOD
      // ======================================================

      const {
        data: closedPeriod,
        error: closeError,
      } =
        await supabase
          .from(
            "payroll_periods"
          )
          .update({
            status:
              "CLOSED",

            closed_by:
              user.id,

            closed_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentPeriod.id
          )
          .eq(
            "status",
            "OPEN"
          )
          .select("id")
          .maybeSingle();

      if (closeError) {
        throw closeError;
      }

      if (!closedPeriod) {
        throw new Error(
          "Periode gagal ditutup atau sudah diproses."
        );
      }

      // ======================================================
      // NEXT PERIOD
      // ======================================================

      const nextStart =
        addDays(
          currentPeriod.period_end,
          1
        );

      const nextEnd =
        addDays(
          nextStart,
          payrollPeriodDays -
            1
        );

      const currentNumber =
        getPeriodNumber(
          currentPeriod.name
        );

      const nextName =
        `Periode #${
          currentNumber + 1
        }`;

      // ======================================================
      // CHECK DUPLICATE NEXT PERIOD
      // ======================================================

      const {
        data: existingNext,
        error: existingNextError,
      } =
        await supabase
          .from(
            "payroll_periods"
          )
          .select(`
            id,
            status
          `)
          .eq(
            "period_start",
            nextStart
          )
          .eq(
            "period_end",
            nextEnd
          )
          .maybeSingle();

      if (
        existingNextError
      ) {
        throw existingNextError;
      }

      if (existingNext) {
        if (
          existingNext.status !==
          "OPEN"
        ) {
          const {
            error:
              reopenError,
          } =
            await supabase
              .from(
                "payroll_periods"
              )
              .update({
                status:
                  "OPEN",
                closed_by:
                  null,
                closed_at:
                  null,
              })
              .eq(
                "id",
                existingNext.id
              );

          if (reopenError) {
            throw reopenError;
          }
        }
      } else {
        const {
          error:
            insertError,
        } =
          await supabase
            .from(
              "payroll_periods"
            )
            .insert({
              name:
                nextName,

              period_start:
                nextStart,

              period_end:
                nextEnd,

              status:
                "OPEN",
            });

        if (insertError) {
          throw insertError;
        }
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menutup periode."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={
            closePeriod
          }
          disabled={
            loading ||
            !canCloseNormally
          }
          className="rounded-xl border border-red-900 bg-red-950/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "Memproses..."
            : canCloseNormally
              ? "Tutup Periode"
              : "Belum Bisa Ditutup"}
        </button>

        {!canCloseNormally && (
          <button
            type="button"
            onClick={
              forceClosePeriod
            }
            disabled={
              loading
            }
            className="rounded-xl border border-orange-900 bg-orange-950/20 px-4 py-2.5 text-sm font-semibold text-orange-400 transition hover:bg-orange-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Force Close
          </button>
        )}
      </div>

      {!canCloseNormally && (
        <p className="max-w-sm text-right text-xs text-zinc-600">
          Periode berakhir{" "}
          {formatDate(
            periodEnd
          )}
        </p>
      )}

      {errorMessage && (
        <div className="max-w-md rounded-lg border border-red-900 bg-red-950/30 px-3 py-2 text-right text-xs text-red-300">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function addDays(
  dateString: string,
  days: number
) {
  const date =
    new Date(
      `${dateString}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getPeriodNumber(
  name: string
) {
  const match =
    name.match(
      /(\d+)/
    );

  if (!match) {
    return 0;
  }

  return Number(
    match[1]
  );
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