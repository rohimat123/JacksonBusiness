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
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function review(
    action:
      | "APPROVE"
      | "REJECT",
    reason = ""
  ) {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/sales/${reportId}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
              reason,
            }),
          }
        );

      const text =
        await response.text();

      let result: any = {};

      try {
        result =
          text
            ? JSON.parse(text)
            : {};
      } catch {
        throw new Error(
          `API response tidak valid. HTTP ${response.status}`
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Review gagal."
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

  async function approve() {
    if (
      !window.confirm(
        "Approve penjualan ini?"
      )
    ) {
      return;
    }

    await review(
      "APPROVE"
    );
  }

  async function reject() {
    const reason =
      window.prompt(
        "Alasan penolakan:"
      );

    if (!reason?.trim()) {
      return;
    }

    await review(
      "REJECT",
      reason.trim()
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          disabled={loading}
          onClick={reject}
          className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 disabled:opacity-50"
        >
          Reject
        </button>

        <button
          disabled={loading}
          onClick={approve}
          className="rounded-xl border border-green-900 bg-green-950/20 px-5 py-3 text-sm font-semibold text-green-400 disabled:opacity-50"
        >
          {loading
            ? "Memproses..."
            : "Approve"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}