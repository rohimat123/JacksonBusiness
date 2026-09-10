"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewActions({
  reportId,
}: {
  reportId: string;
}) {
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

  async function reviewReport(
    action:
      | "APPROVE"
      | "REJECT",
    reason?: string
  ) {
    try {
      setLoading(true);
      setErrorMessage("");

      const response =
        await fetch(
          `/api/storage-reports/${reportId}/review`,
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
                reason:
                  reason ??
                  "",
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Gagal melakukan review."
        );
      }

      router.refresh();
    } catch (error) {
      console.error(
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan."
      );
    } finally {
      setLoading(false);
    }
  }

  async function approveReport() {
    const confirmed =
      window.confirm(
        "Approve laporan ini?"
      );

    if (!confirmed) {
      return;
    }

    await reviewReport(
      "APPROVE"
    );
  }

  async function rejectReport() {
    const reason =
      window.prompt(
        "Masukkan alasan penolakan:"
      );

    if (
      !reason ||
      !reason.trim()
    ) {
      return;
    }

    await reviewReport(
      "REJECT",
      reason.trim()
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={rejectReport}
          className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Memproses..."
            : "Reject"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={approveReport}
          className="rounded-xl border border-green-900 bg-green-950/20 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Memproses..."
            : "Approve"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-3 rounded-lg border border-red-900 bg-red-950/20 px-4 py-3">
          <p className="text-sm text-red-400">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}