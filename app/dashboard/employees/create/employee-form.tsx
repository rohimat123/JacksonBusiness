"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AddEmployeeForm({
  defaultTargetPlants,
}: {
  defaultTargetPlants: number;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] =
    useState("");

  const [
    forumName,
    setForumName,
  ] = useState("");

  const [seed, setSeed] =
    useState("POTATO");

  const [
    position,
    setPosition,
  ] = useState("EMPLOYEE");

  const [
    joinDate,
    setJoinDate,
  ] = useState("");

  const [
    targetPlants,
    setTargetPlants,
  ] = useState(
    String(
      defaultTargetPlants
    )
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const parsedTarget =
      Number(targetPlants);

    if (
      !Number.isFinite(
        parsedTarget
      ) ||
      parsedTarget < 0
    ) {
      setErrorMessage(
        "Target plant tidak valid."
      );

      setLoading(false);
      return;
    }

    const {
      error,
    } = await supabase
      .from("employees")
      .insert({
        name:
          name.trim(),

        forum_name:
          forumName.trim() ||
          null,

        seed,

        position,

        join_date:
          joinDate,

        status:
          "ACTIVE",

        target_plants:
          parsedTarget,
      });

    if (error) {
      console.error(
        error
      );

      setErrorMessage(
        error.message
      );

      setLoading(false);
      return;
    }

    router.push(
      "/dashboard/employees"
    );

    router.refresh();
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nama IC">
          <input
            type="text"
            required
            value={name}
            onChange={(
              e
            ) =>
              setName(
                e.target.value
              )
            }
            placeholder="Contoh: Aiyana Amadahi"
            className={
              inputClass
            }
          />
        </Field>

        <Field label="Forum Name">
          <input
            type="text"
            value={
              forumName
            }
            onChange={(
              e
            ) =>
              setForumName(
                e.target.value
              )
            }
            placeholder="Contoh: Kacha"
            className={
              inputClass
            }
          />
        </Field>

        <Field label="Seed">
          <select
            value={seed}
            onChange={(
              e
            ) =>
              setSeed(
                e.target.value
              )
            }
            className={
              inputClass
            }
          >
            <option value="POTATO">
              POTATO
            </option>

            <option value="ONION">
              ONION
            </option>

            <option value="CORN">
              CORN
            </option>

            <option value="WHEAT">
              WHEAT
            </option>

            <option value="CARROT">
              CARROT
            </option>
          </select>
        </Field>

        <Field label="Jabatan">
          <select
            value={
              position
            }
            onChange={(
              e
            ) =>
              setPosition(
                e.target.value
              )
            }
            className={
              inputClass
            }
          >
            <option value="EMPLOYEE">
              EMPLOYEE
            </option>

            <option value="MANAGER">
              MANAGER
            </option>

            <option value="MANAGEMENT">
              MANAGEMENT
            </option>

            <option value="OWNER">
              OWNER
            </option>
          </select>
        </Field>

        <Field label="Tanggal Join">
          <input
            type="date"
            required
            value={
              joinDate
            }
            onChange={(
              e
            ) =>
              setJoinDate(
                e.target.value
              )
            }
            className={
              inputClass
            }
          />
        </Field>

        <Field label="Target Plant">
          <input
            type="number"
            min="0"
            required
            value={
              targetPlants
            }
            onChange={(
              e
            ) =>
              setTargetPlants(
                e.target.value
              )
            }
            className={
              inputClass
            }
          />

          <p className="mt-2 text-xs text-zinc-500">
            Default dari
            Settings:{" "}
            {defaultTargetPlants.toLocaleString(
              "en-US"
            )}
          </p>
        </Field>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {
            errorMessage
          }
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() =>
            router.back()
          }
          disabled={
            loading
          }
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Batal
        </button>

        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading
            ? "Menyimpan..."
            : "Simpan Pegawai"}
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
  children:
    React.ReactNode;
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