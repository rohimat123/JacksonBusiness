"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  applicationId: string;
  applicantName: string;
  currentRole: string;
};

export default function ApplicationActions({
  applicationId,
  applicantName,
  currentRole,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const normalizedRole = currentRole.toUpperCase();

  async function hireWorker() {
    setMessage("");

    const seed = window.prompt(
      `Seed ${applicantName}:\n\nPOTATO / ONION / CORN / WHEAT / CARROT`,
      "ONION"
    );

    if (seed === null) {
      return;
    }

    const normalizedSeed = seed.trim().toUpperCase();

    const validSeeds = [
      "POTATO",
      "ONION",
      "CORN",
      "WHEAT",
      "CARROT",
    ];

    if (!validSeeds.includes(normalizedSeed)) {
      setMessage(
        "Seed tidak valid. Pilih POTATO, ONION, CORN, WHEAT, atau CARROT."
      );
      return;
    }

    const confirmed = window.confirm(
      `Hire ${applicantName} sebagai WORKER?\n\nSeed: ${normalizedSeed}\nPosition: Worker`
    );

    if (!confirmed) {
      return;
    }

    await hire(
      "WORKER",
      normalizedSeed,
      "Worker"
    );
  }

  async function hireManager() {
    if (normalizedRole !== "OWNER") {
      return;
    }

    const confirmed = window.confirm(
      `Hire ${applicantName} sebagai MANAGER?`
    );

    if (!confirmed) {
      return;
    }

    await hire(
      "MANAGER",
      "",
      "MANAGER"
    );
  }

  async function hire(
    hireAs: "WORKER" | "MANAGER",
    seed: string,
    position: string
  ) {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/applications/hire",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            applicationId,
            hireAs,
            seed: seed.toUpperCase(),
            position,
          }),
        }
      );

      const raw = await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
      } = {};

      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error(
            `Server mengembalikan response tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Hire gagal."
        );
      }

      setMessage(
        result.message ?? "Hire berhasil."
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Hire gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    const confirmed = window.confirm(
      `Tolak lamaran ${applicantName}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/applications/reject",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            applicationId,
          }),
        }
      );

      const raw = await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
      } = {};

      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error(
            `Server mengembalikan response tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Reject gagal."
        );
      }

      setMessage(
        result.message ?? "Application ditolak."
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Reject gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={hireWorker}
          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
        >
          {loading
            ? "Processing..."
            : "Hire Worker"}
        </button>

        {normalizedRole === "OWNER" && (
          <button
            type="button"
            disabled={loading}
            onClick={hireManager}
            className="rounded-lg border border-blue-900 bg-blue-950/20 px-3 py-2 text-xs font-semibold text-blue-400 disabled:opacity-50"
          >
            Hire Manager
          </button>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={reject}
          className="rounded-lg border border-red-900 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {message && (
        <p className="text-xs text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}