"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewAction =
  | "APPROVE"
  | "REJECT";

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

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  // ==========================================================
  // REVIEW
  // ==========================================================

  async function reviewReport(
    action: ReviewAction,
    reason = ""
  ) {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await fetch(
          `/api/ssrp/${reportId}/review`,
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
                reason,
              }),
          }
        );

      // ======================================================
      // RESPONSE AS TEXT FIRST
      // ======================================================

      const rawResponse =
        await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
        status?: string;
      } = {};

      if (rawResponse) {
        try {
          result =
            JSON.parse(
              rawResponse
            );
        } catch {
          console.error(
            "SSRP NON JSON RESPONSE:",
            rawResponse
          );

          throw new Error(
            `API SSRP mengembalikan response tidak valid. HTTP ${response.status}.`
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
        result.success !== true
      ) {
        throw new Error(
          result.error ??
            "Review SSRP gagal."
        );
      }

      setSuccessMessage(
        result.message ??
          (
            action ===
            "APPROVE"
              ? "SSRP berhasil disetujui."
              : "SSRP berhasil ditolak."
          )
      );

      router.refresh();
    } catch (
      error: unknown
    ) {
      console.error(
        "SSRP REVIEW CLIENT ERROR:",
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
  // APPROVE
  // ==========================================================

  async function approveReport() {
    if (loading) {
      return;
    }

    const confirmed =
      window.confirm(
        "Approve laporan SSRP ini?"
      );

    if (!confirmed) {
      return;
    }

    await reviewReport(
      "APPROVE"
    );
  }

  // ==========================================================
  // REJECT
  // ==========================================================

  async function rejectReport() {
    if (loading) {
      return;
    }

    const reason =
      window.prompt(
        "Masukkan alasan penolakan SSRP:"
      );

    if (
      reason === null
    ) {
      return;
    }

    const cleanReason =
      reason.trim();

    if (!cleanReason) {
      setErrorMessage(
        "Alasan penolakan wajib diisi."
      );

      return;
    }

    await reviewReport(
      "REJECT",
      cleanReason
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={
            rejectReport
          }
          className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Memproses..."
            : "Reject"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={
            approveReport
          }
          className="rounded-xl border border-green-900 bg-green-950/20 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Memproses..."
            : "Approve"}
        </button>
      </div>

      {successMessage && (
        <div className="mt-3 rounded-xl border border-green-900 bg-green-950/20 px-4 py-3 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-xl border border-red-900 bg-red-950/20 px-4 py-3">
          <p className="text-sm font-semibold text-red-400">
            Review SSRP gagal
          </p>

          <p className="mt-1 text-sm text-red-300">
            {errorMessage}
          </p>
        </div>
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
    typeof error === "string"
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