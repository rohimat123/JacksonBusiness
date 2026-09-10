"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PayrollActionButtons({
  payrollId,
  status,
}: {
  payrollId: string;
  status: string;
}) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function run(
    action:
      | "PAY"
      | "VOID",
    note = ""
  ) {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/payroll/${payrollId}/action`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
              note,
            }),
          }
        );

      const text =
        await response.text();

      const result =
        text
          ? JSON.parse(text)
          : {};

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Aksi gagal."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi error."
      );
    } finally {
      setLoading(false);
    }
  }

  const upper =
    status.toUpperCase();

  if (
    upper === "PAID" ||
    upper === "VOID"
  ) {
    return null;
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={() => {
            const note =
              window.prompt(
                "Catatan VOID (opsional):"
              );

            if (
              note === null
            ) {
              return;
            }

            run(
              "VOID",
              note.trim()
            );
          }}
          className="rounded-lg border border-red-900 px-3 py-2 text-xs font-semibold text-red-400"
        >
          VOID
        </button>

        <button
          disabled={loading}
          onClick={() => {
            if (
              window.confirm(
                "Tandai payroll sebagai PAID?"
              )
            ) {
              run("PAY");
            }
          }}
          className="rounded-lg border border-green-900 px-3 py-2 text-xs font-semibold text-green-400"
        >
          {loading
            ? "..."
            : "PAY"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}