"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EmployeeActions({
  employeeId,
  currentStatus,
}: {
  employeeId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function changeStatus(status: "ACTIVE" | "RESIGNED") {
    const message =
      status === "RESIGNED"
        ? "Yakin ingin mengubah pegawai ini menjadi RESIGNED?"
        : "Aktifkan kembali pegawai ini?";

    if (!window.confirm(message)) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("employees")
      .update({
        status,
      })
      .eq("id", employeeId);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-3">
        {currentStatus === "ACTIVE" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => changeStatus("RESIGNED")}
            className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/40 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Resign Pegawai"}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => changeStatus("ACTIVE")}
            className="rounded-xl border border-green-900 bg-green-950/20 px-5 py-3 text-sm font-semibold text-green-400 transition hover:bg-green-950/40 disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Aktifkan Kembali"}
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="mt-3 max-w-sm text-sm text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
}