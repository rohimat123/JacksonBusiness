"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string;
  name: string;
  seed: string;
};

type ShiftType = {
  id: string;
  name: string;
};

type Assignment = {
  id: string;
  employee_id: string;
  shift_type_id: string;
  shift_date: string;
  note: string | null;
};

type Props = {
  employees: Employee[];
  shiftTypes: ShiftType[];
  selectedDate: string;
  assignments: Assignment[];
};

export default function ShiftActions({
  employees,
  shiftTypes,
  selectedDate,
  assignments,
}: Props) {
  const router = useRouter();

  const [employeeId, setEmployeeId] = useState("");
  const [shiftTypeId, setShiftTypeId] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function saveShift() {
    if (!employeeId) {
      setErrorMessage("Pilih pegawai terlebih dahulu.");
      return;
    }

    if (!shiftTypeId) {
      setErrorMessage("Pilih shift terlebih dahulu.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Session login tidak ditemukan.");
      }

      const { error } = await supabase
        .from("shift_assignments")
        .upsert(
          {
            employee_id: employeeId,
            shift_type_id: shiftTypeId,
            shift_date: selectedDate,
            note: note.trim() || null,
            created_by: user.id,
          },
          {
            onConflict: "employee_id,shift_date",
          }
        );

      if (error) {
        throw error;
      }

      setEmployeeId("");
      setShiftTypeId("");
      setNote("");

      setSuccessMessage("Jadwal berhasil disimpan.");

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan jadwal."
      );
    } finally {
      setLoading(false);
    }
  }

  async function editAssignment(assignment: Assignment) {
    const currentShift = shiftTypes.find(
      (shift) => shift.id === assignment.shift_type_id
    );

    const selected = window.prompt(
      `Ubah shift.\n\nMasukkan nama shift persis:\n${shiftTypes
        .map((shift) => shift.name)
        .join("\n")}`,
      currentShift?.name ?? ""
    );

    if (selected === null) {
      return;
    }

    const newShift = shiftTypes.find(
      (shift) =>
        shift.name.toLowerCase() === selected.trim().toLowerCase()
    );

    if (!newShift) {
      setErrorMessage("Nama shift tidak ditemukan.");
      return;
    }

    const newNote = window.prompt(
      "Catatan:",
      assignment.note ?? ""
    );

    if (newNote === null) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("shift_assignments")
        .update({
          shift_type_id: newShift.id,
          note: newNote.trim() || null,
        })
        .eq("id", assignment.id);

      if (error) {
        throw error;
      }

      setSuccessMessage("Jadwal berhasil diubah.");

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah jadwal."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteAssignment(assignment: Assignment) {
    const employee = employees.find(
      (item) => item.id === assignment.employee_id
    );

    const confirmed = window.confirm(
      `Hapus jadwal ${employee?.name ?? "pegawai"} pada ${selectedDate}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("shift_assignments")
        .delete()
        .eq("id", assignment.id);

      if (error) {
        throw error;
      }

      setSuccessMessage("Jadwal berhasil dihapus.");

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus jadwal."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyYesterday() {
    const sourceDate = moveDate(selectedDate, -1);

    const confirmed = window.confirm(
      `Copy semua jadwal dari ${sourceDate} ke ${selectedDate}?`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Session login tidak ditemukan.");
      }

      const { data: sourceRows, error: sourceError } = await supabase
        .from("shift_assignments")
        .select(`
          employee_id,
          shift_type_id,
          note
        `)
        .eq("shift_date", sourceDate);

      if (sourceError) {
        throw sourceError;
      }

      if (!sourceRows || sourceRows.length === 0) {
        throw new Error(
          `Tidak ada jadwal pada ${sourceDate}.`
        );
      }

      const payload = sourceRows.map((row) => ({
        employee_id: row.employee_id,
        shift_type_id: row.shift_type_id,
        shift_date: selectedDate,
        note: row.note,
        created_by: user.id,
      }));

      const { error: upsertError } = await supabase
        .from("shift_assignments")
        .upsert(payload, {
          onConflict: "employee_id,shift_date",
        });

      if (upsertError) {
        throw upsertError;
      }

      setSuccessMessage(
        `${sourceRows.length} jadwal berhasil dicopy dari ${sourceDate}.`
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal copy jadwal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="depth-surface rounded-xl">
        <div className="flex flex-col gap-3 border-b border-emerald-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Atur Jadwal
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Tambah atau ubah shift pegawai untuk tanggal {selectedDate}.
            </p>
          </div>

          <button
            type="button"
            onClick={copyYesterday}
            disabled={loading}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
          >
            Copy Jadwal Kemarin
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Pegawai
            </label>

            <select
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(event.target.value)
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">
                Pilih Pegawai
              </option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name} — {employee.seed}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Shift
            </label>

            <select
              value={shiftTypeId}
              onChange={(event) =>
                setShiftTypeId(event.target.value)
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="">
                Pilih Shift
              </option>

              {shiftTypes.map((shift) => (
                <option
                  key={shift.id}
                  value={shift.id}
                >
                  {shift.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Catatan
            </label>

            <input
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Opsional..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={saveShift}
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading
                ? "Memproses..."
                : "Simpan Jadwal"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-green-900/50 bg-green-950/20 px-4 py-3 text-sm text-green-400">
              {successMessage}
            </div>
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="depth-surface rounded-xl p-5">
          <h3 className="font-semibold text-white">
            Edit / Hapus Jadwal
          </h3>

          <div className="mt-4 space-y-2">
            {assignments.map((assignment) => {
              const employee = employees.find(
                (item) => item.id === assignment.employee_id
              );

              const shift = shiftTypes.find(
                (item) => item.id === assignment.shift_type_id
              );

              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-3 rounded-lg border border-emerald-500/15 bg-zinc-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">
                      {employee?.name ?? "Unknown"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {shift?.name ?? "-"}
                      {assignment.note
                        ? ` • ${assignment.note}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        editAssignment(assignment)
                      }
                      disabled={loading}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAssignment(assignment)
                      }
                      disabled={loading}
                      className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function moveDate(
  date: string,
  amount: number
) {
  const value = new Date(
    `${date}T00:00:00`
  );

  value.setDate(
    value.getDate() + amount
  );

  const year =
    value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    value.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}