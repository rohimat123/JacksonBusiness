"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string;
  join_date: string;
  status: string;
  target_plants: number;
  starting_week: string | null;
  end_week: string | null;
};

export default function EditEmployeeForm({
  employee,
}: {
  employee: Employee;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(employee.name);
  const [forumName, setForumName] = useState(employee.forum_name ?? "");
  const [seed, setSeed] = useState(employee.seed);
  const [position, setPosition] = useState(employee.position);
  const [joinDate, setJoinDate] = useState(employee.join_date);
  const [targetPlants, setTargetPlants] = useState(
    String(employee.target_plants)
  );
  const [startingWeek, setStartingWeek] = useState(
    employee.starting_week ?? ""
  );
  const [endWeek, setEndWeek] = useState(
    employee.end_week ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("employees")
      .update({
        name: name.trim(),
        forum_name: forumName.trim() || null,
        seed,
        position,
        join_date: joinDate,
        target_plants: Number(targetPlants),
        starting_week: startingWeek || null,
        end_week: endWeek || null,
      })
      .eq("id", employee.id);

    if (error) {
      console.error(error);
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/employees/${employee.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nama IC">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Forum Name">
          <input
            type="text"
            value={forumName}
            onChange={(e) => setForumName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Seed">
          <select
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className={inputClass}
          >
            <option value="POTATO">POTATO</option>
            <option value="ONION">ONION</option>
            <option value="CORN">CORN</option>
            <option value="WHEAT">WHEAT</option>
            <option value="CARROT">CARROT</option>
          </select>
        </Field>

        <Field label="Jabatan">
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={inputClass}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="MANAGER">MANAGER</option>
            <option value="MANAGEMENT">MANAGEMENT</option>
            <option value="OWNER">OWNER</option>
          </select>
        </Field>

        <Field label="Tanggal Join">
          <input
            type="date"
            required
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Target Plant">
          <input
            type="number"
            min="0"
            required
            value={targetPlants}
            onChange={(e) => setTargetPlants(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Starting Week">
          <input
            type="date"
            value={startingWeek}
            onChange={(e) => setStartingWeek(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="End Week">
          <input
            type="date"
            value={endWeek}
            onChange={(e) => setEndWeek(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </label>

      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500";