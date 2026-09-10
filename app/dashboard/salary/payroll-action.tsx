"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type Props = {
  employeeId: string;
  employeeName: string;

  periodStart: string;
  periodEnd: string;

  approvedPlants: number;

  rate: number;

  grossSalary: number;

  bonus: number;

  fine: number;

  totalSalary: number;

  status: string;
};

type PayrollAction =
  | "GENERATE"
  | "PAY"
  | "VOID";

export default function PayrollActions({
  employeeId,
  employeeName,
  periodStart,
  periodEnd,
  approvedPlants,
  rate,
  grossSalary,
  bonus,
  fine,
  totalSalary,
  status,
}: Props) {
  const router =
    useRouter();

  const [
    bonusValue,
    setBonusValue,
  ] =
    useState(
      String(
        Number(
          bonus ?? 0
        )
      )
    );

  const [
    fineValue,
    setFineValue,
  ] =
    useState(
      String(
        Number(
          fine ?? 0
        )
      )
    );

  const [
    note,
    setNote,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  useEffect(
    () => {
      setBonusValue(
        String(
          Number(
            bonus ?? 0
          )
        )
      );

      setFineValue(
        String(
          Number(
            fine ?? 0
          )
        )
      );
    },
    [
      bonus,
      fine,
    ]
  );

  const upperStatus =
    String(
      status
    ).toUpperCase();

  const numericBonus =
    Math.max(
      0,
      Number(
        bonusValue
      ) || 0
    );

  const numericFine =
    Math.max(
      0,
      Number(
        fineValue
      ) || 0
    );

  const previewTotal =
    Math.max(
      0,
      Number(
        grossSalary
      ) +
        numericBonus -
        numericFine
    );

  // ==========================================================
  // REQUEST
  // ==========================================================

  async function sendAction(
    action: PayrollAction
  ) {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          "/api/payroll/action",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action,

                employeeId,

                periodStart,

                periodEnd,

                bonus:
                  numericBonus,

                fine:
                  numericFine,

                paymentNote:
                  note.trim(),
              }),
          }
        );

      const raw =
        await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
        status?: string;
        action?: string;
      } = {};

      if (raw) {
        try {
          result =
            JSON.parse(
              raw
            );
        } catch {
          console.error(
            "PAYROLL NON JSON RESPONSE:",
            raw
          );

          throw new Error(
            `API Payroll mengembalikan response tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            `Request gagal. HTTP ${response.status}.`
        );
      }

      if (
        result.success !==
        true
      ) {
        throw new Error(
          result.error ??
            "Aksi Payroll gagal."
        );
      }

      setSuccessMessage(
        result.message ??
          "Payroll berhasil diproses."
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      console.error(
        "PAYROLL CLIENT ERROR:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // GENERATE
  // ==========================================================

  async function generatePayroll() {
    if (loading) {
      return;
    }

    const confirmed =
      window.confirm(
        `Simpan payroll ${employeeName}?\n\n` +
          `Plants: ${formatNumber(
            approvedPlants
          )}\n` +
          `Gaji Kotor: ${formatMoney(
            grossSalary
          )}\n` +
          `Bonus: ${formatMoney(
            numericBonus
          )}\n` +
          `Denda: ${formatMoney(
            numericFine
          )}\n` +
          `Total: ${formatMoney(
            previewTotal
          )}`
      );

    if (!confirmed) {
      return;
    }

    await sendAction(
      "GENERATE"
    );
  }

  // ==========================================================
  // PAY
  // ==========================================================

  async function payPayroll() {
    if (loading) {
      return;
    }

    const confirmed =
      window.confirm(
        `Tandai gaji ${employeeName} sebagai PAID?\n\nTotal: ${formatMoney(
          totalSalary
        )}`
      );

    if (!confirmed) {
      return;
    }

    await sendAction(
      "PAY"
    );
  }

  // ==========================================================
  // VOID
  // ==========================================================

  async function voidPayroll() {
    if (loading) {
      return;
    }

    const reason =
      window.prompt(
        `Alasan VOID payroll ${employeeName}:`,
        note
      );

    if (
      reason === null
    ) {
      return;
    }

    if (
      !reason.trim()
    ) {
      setErrorMessage(
        "Alasan VOID wajib diisi."
      );

      return;
    }

    setNote(
      reason.trim()
    );

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          "/api/payroll/action",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "VOID",

                employeeId,

                periodStart,

                periodEnd,

                bonus:
                  numericBonus,

                fine:
                  numericFine,

                paymentNote:
                  reason.trim(),
              }),
          }
        );

      const raw =
        await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
      } = {};

      try {
        result =
          raw
            ? JSON.parse(
                raw
              )
            : {};
      } catch {
        throw new Error(
          `API Payroll mengembalikan response tidak valid. HTTP ${response.status}.`
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "VOID Payroll gagal."
        );
      }

      setSuccessMessage(
        result.message ??
          "Payroll berhasil di-VOID."
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      console.error(
        "PAYROLL VOID ERROR:",
        error
      );

      setErrorMessage(
        getErrorMessage(
          error
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // PAID
  // ==========================================================

  if (
    upperStatus ===
    "PAID"
  ) {
    return (
      <div className="text-right">
        <span className="inline-flex rounded-lg border border-green-900 bg-green-950/20 px-3 py-2 text-xs font-semibold text-green-400">
          Sudah Dibayar
        </span>
      </div>
    );
  }

  // ==========================================================
  // VOID
  // ==========================================================

  if (
    upperStatus ===
    "VOID"
  ) {
    return (
      <div className="text-right">
        <span className="inline-flex rounded-lg border border-red-900 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400">
          Payroll VOID
        </span>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="ml-auto w-full max-w-[270px] space-y-3 text-left">
      {/* BONUS / FINE */}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-600">
            Bonus
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={
              bonusValue
            }
            onChange={(
              event
            ) =>
              setBonusValue(
                event
                  .target
                  .value
              )
            }
            disabled={
              loading
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-green-400 outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-zinc-600">
            Denda
          </label>

          <input
            type="number"
            min="0"
            step="1"
            value={
              fineValue
            }
            onChange={(
              event
            ) =>
              setFineValue(
                event
                  .target
                  .value
              )
            }
            disabled={
              loading
            }
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-red-400 outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* NOTE */}

      <input
        type="text"
        value={note}
        onChange={(
          event
        ) =>
          setNote(
            event.target
              .value
          )
        }
        disabled={
          loading
        }
        placeholder="Catatan payroll..."
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-50"
      />

      {/* PREVIEW */}

      <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="flex justify-between gap-3 text-[11px]">
          <span className="text-zinc-600">
            Preview
          </span>

          <span className="font-semibold text-white">
            {formatMoney(
              previewTotal
            )}
          </span>
        </div>
      </div>

      {/* BUTTONS */}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={
            voidPayroll
          }
          disabled={
            loading
          }
          className="rounded-lg border border-red-900 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          VOID
        </button>

        <button
          type="button"
          onClick={
            generatePayroll
          }
          disabled={
            loading
          }
          className="rounded-lg border border-blue-900 bg-blue-950/20 px-3 py-2 text-xs font-semibold text-blue-400 transition hover:bg-blue-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "..."
            : upperStatus ===
                "UNPAID"
              ? "Generate / Update"
              : "Generate"}
        </button>

        <button
          type="button"
          onClick={
            payPayroll
          }
          disabled={
            loading ||
            Number(
              totalSalary
            ) <= 0
          }
          className="rounded-lg border border-green-900 bg-green-950/20 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-950/40 disabled:cursor-not-allowed disabled:opacity-30"
        >
          PAY
        </button>
      </div>

      {/* MESSAGE */}

      {successMessage && (
        <p className="text-xs leading-5 text-green-400">
          {
            successMessage
          }
        </p>
      )}

      {errorMessage && (
        <p className="text-xs leading-5 text-red-400">
          {
            errorMessage
          }
        </p>
      )}
    </div>
  );
}

// ============================================================
// ERROR
// ============================================================

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  if (
    error &&
    typeof error ===
      "object" &&
    "message" in error
  ) {
    return String(
      (
        error as {
          message?: unknown;
        }
      ).message ??
        "Terjadi kesalahan."
    );
  }

  return "Terjadi kesalahan.";
}

// ============================================================
// FORMAT
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
        0,

      maximumFractionDigits:
        2,
    }
  ).format(value);
}