"use client";

import {
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

type PayrollApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;

  action?: string;
  payrollId?: string;
  status?: string;

  approvedPlants?: number;
  grossSalary?: number;
  bonus?: number;
  fine?: number;
  totalSalary?: number;
};

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

  const normalizedStatus =
    String(
      status
    ).toUpperCase();

  // =========================================================
  // SEND API ACTION
  // =========================================================

  async function sendAction(
    action:
      | "GENERATE"
      | "PAY"
      | "VOID",
    options?: {
      bonus?: number;
      fine?: number;
      paymentNote?: string;
    }
  ) {
    if (loading) {
      return;
    }

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
                  options?.bonus ??
                  bonus,

                fine:
                  options?.fine ??
                  fine,

                paymentNote:
                  options
                    ?.paymentNote ??
                  "",
              }),
          }
        );

      // Pakai text dulu supaya
      // kalau endpoint error HTML,
      // browser tidak meledak di response.json()
      const raw =
        await response.text();

      let result:
        PayrollApiResponse =
        {};

      if (raw) {
        try {
          result =
            JSON.parse(
              raw
            );
        } catch {
          throw new Error(
            `API Payroll mengembalikan response tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            `Request Payroll gagal. HTTP ${response.status}.`
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
        error instanceof Error
          ? error.message
          : "Aksi Payroll gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // EDIT / GENERATE
  // =========================================================

  async function editPayroll() {
    if (
      loading ||
      normalizedStatus ===
        "PAID" ||
      normalizedStatus ===
        "VOID"
    ) {
      return;
    }

    const bonusInput =
      window.prompt(
        `Bonus untuk ${employeeName}:`,
        String(
          bonus
        )
      );

    if (
      bonusInput ===
      null
    ) {
      return;
    }

    const fineInput =
      window.prompt(
        `Denda untuk ${employeeName}:`,
        String(
          fine
        )
      );

    if (
      fineInput ===
      null
    ) {
      return;
    }

    const newBonus =
      Number(
        bonusInput
      );

    const newFine =
      Number(
        fineInput
      );

    if (
      Number.isNaN(
        newBonus
      ) ||
      newBonus < 0
    ) {
      setErrorMessage(
        "Bonus tidak valid."
      );

      return;
    }

    if (
      Number.isNaN(
        newFine
      ) ||
      newFine < 0
    ) {
      setErrorMessage(
        "Denda tidak valid."
      );

      return;
    }

    const previewTotal =
      Math.max(
        0,
        grossSalary +
          newBonus -
          newFine
      );

    const confirmed =
      window.confirm(
        `Simpan payroll ${employeeName}?\n\n` +
          `Plants: ${formatNumber(
            approvedPlants
          )}\n` +
          `Rate: ${formatMoney(
            rate
          )}\n` +
          `Gaji Kotor: ${formatMoney(
            grossSalary
          )}\n` +
          `Bonus: ${formatMoney(
            newBonus
          )}\n` +
          `Denda: ${formatMoney(
            newFine
          )}\n` +
          `Total: ${formatMoney(
            previewTotal
          )}`
      );

    if (
      !confirmed
    ) {
      return;
    }

    // Backend sendiri yang menentukan:
    // belum ada record = PAYROLL_GENERATE
    // sudah ada record = PAYROLL_UPDATE
    await sendAction(
      "GENERATE",
      {
        bonus:
          newBonus,

        fine:
          newFine,
      }
    );
  }

  // =========================================================
  // PAY
  // =========================================================

  async function payPayroll() {
    if (
      loading ||
      normalizedStatus ===
        "PAID" ||
      normalizedStatus ===
        "VOID"
    ) {
      return;
    }

    if (
      totalSalary <=
      0
    ) {
      setErrorMessage(
        "Belum ada gaji yang bisa dibayar."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Bayar gaji ${employeeName} sebesar ${formatMoney(
          totalSalary
        )}?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const note =
      window.prompt(
        "Catatan pembayaran (opsional):",
        ""
      );

    if (
      note === null
    ) {
      return;
    }

    await sendAction(
      "PAY",
      {
        paymentNote:
          note.trim(),
      }
    );
  }

  // =========================================================
  // VOID
  // =========================================================

  async function voidPayroll() {
    if (
      loading ||
      normalizedStatus ===
        "PAID" ||
      normalizedStatus ===
        "VOID"
    ) {
      return;
    }

    const reason =
      window.prompt(
        `Alasan VOID payroll ${employeeName}:`,
        ""
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

    const confirmed =
      window.confirm(
        `VOID payroll ${employeeName}?\n\n` +
          `Payroll akan dibatalkan dan total gaji menjadi $0.\n\n` +
          `Alasan: ${reason.trim()}`
      );

    if (
      !confirmed
    ) {
      return;
    }

    await sendAction(
      "VOID",
      {
        paymentNote:
          reason.trim(),
      }
    );
  }

  // =========================================================
  // BUTTON STATE
  // =========================================================

  const locked =
    loading ||
    normalizedStatus ===
      "PAID" ||
    normalizedStatus ===
      "VOID";

  const paymentDisabled =
    locked ||
    totalSalary <= 0;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {/* ATUR */}

        <button
          type="button"
          onClick={
            editPayroll
          }
          disabled={
            locked
          }
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "..."
            : "Atur"}
        </button>

        {/* PAY */}

        <button
          type="button"
          onClick={
            payPayroll
          }
          disabled={
            paymentDisabled
          }
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "..."
            : normalizedStatus ===
                "PAID"
              ? "Dibayar"
              : normalizedStatus ===
                  "VOID"
                ? "VOID"
                : totalSalary <=
                    0
                  ? "Belum Ada Gaji"
                  : "Bayar"}
        </button>

        {/* VOID */}

        {normalizedStatus ===
          "UNPAID" &&
          totalSalary >
            0 && (
            <button
              type="button"
              onClick={
                voidPayroll
              }
              disabled={
                loading
              }
              className="rounded-lg border border-red-900 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              VOID
            </button>
          )}
      </div>

      {errorMessage && (
        <p className="max-w-xs text-right text-xs text-red-400">
          {
            errorMessage
          }
        </p>
      )}

      {successMessage && (
        <p className="max-w-xs text-right text-xs text-green-400">
          {
            successMessage
          }
        </p>
      )}
    </div>
  );
}

// =========================================================
// HELPERS
// =========================================================

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

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(value);
}