"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  updateSettings,
} from "./actions";

type Settings = {
  id: string;

  system_name: string;

  storage_capacity: number | string;

  payroll_rate: number | string;

  ssrp_rate: number | string;

  default_target_plants: number | string;

  payroll_period_days: number | string;
};

export default function SettingsForm({
  settings,
}: {
  settings: Settings;
}) {
  const [
    systemName,
    setSystemName,
  ] = useState(
    String(
      settings.system_name ?? ""
    )
  );

  const [
    storageCapacity,
    setStorageCapacity,
  ] = useState(
    String(
      settings.storage_capacity ?? 75000
    )
  );

  const [
    payrollRate,
    setPayrollRate,
  ] = useState(
    String(
      settings.payroll_rate ?? 0.3
    )
  );

  const [
    ssrpRate,
    setSsrpRate,
  ] = useState(
    String(
      settings.ssrp_rate ?? 200
    )
  );

  const [
    defaultTarget,
    setDefaultTarget,
  ] = useState(
    String(
      settings.default_target_plants ?? 40000
    )
  );

  const [
    periodDays,
    setPeriodDays,
  ] = useState(
    String(
      settings.payroll_period_days ?? 14
    )
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");

    const storageValue =
      Number(
        storageCapacity
      );

    const rateValue =
      Number(
        payrollRate
      );

    const ssrpRateValue =
      Number(
        ssrpRate
      );

    const targetValue =
      Number(
        defaultTarget
      );

    const daysValue =
      Number(
        periodDays
      );

    if (
      !systemName.trim()
    ) {
      setMessage(
        "Nama sistem tidak boleh kosong."
      );

      return;
    }

    if (
      !Number.isFinite(
        storageValue
      ) ||
      storageValue < 1
    ) {
      setMessage(
        "Storage capacity tidak valid."
      );

      return;
    }

    if (
      !Number.isFinite(
        rateValue
      ) ||
      rateValue < 0
    ) {
      setMessage(
        "Payroll rate tidak valid."
      );

      return;
    }

    if (
      !Number.isFinite(
        ssrpRateValue
      ) ||
      ssrpRateValue < 0
    ) {
      setMessage(
        "SSRP rate tidak valid."
      );

      return;
    }

    if (
      !Number.isFinite(
        targetValue
      ) ||
      targetValue < 0
    ) {
      setMessage(
        "Default target tidak valid."
      );

      return;
    }

    if (
      !Number.isFinite(
        daysValue
      ) ||
      daysValue < 1
    ) {
      setMessage(
        "Payroll period tidak valid."
      );

      return;
    }

    startTransition(
      async () => {
        const result =
          await updateSettings({
            id:
              settings.id,

            system_name:
              systemName.trim(),

            storage_capacity:
              storageValue,

            payroll_rate:
              rateValue,

            ssrp_rate:
              ssrpRateValue,

            default_target_plants:
              targetValue,

            payroll_period_days:
              daysValue,
          });

        if (
          !result.success
        ) {
          setMessage(
            result.error ??
              "Gagal menyimpan settings."
          );

          return;
        }

        setMessage(
          "Settings berhasil disimpan."
        );
      }
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      <section className="glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-4">
          <h2 className="font-semibold text-white">
            General Settings
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Pengaturan utama Jackson Farm.
          </p>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          <Field
            label="Nama Sistem"
            description="Nama yang digunakan pada sistem."
          >
            <input
              value={
                systemName
              }
              onChange={(
                e
              ) =>
                setSystemName(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
            />
          </Field>

          <Field
            label="Storage Capacity"
            description="Kapasitas maksimum storage."
          >
            <input
              type="number"
              min="1"
              value={
                storageCapacity
              }
              onChange={(
                e
              ) =>
                setStorageCapacity(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
            />
          </Field>

          <Field
            label="Payroll Rate"
            description="Gaji per 1 approved plant."
          >
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-500">
                $
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  payrollRate
                }
                onChange={(
                  e
                ) =>
                  setPayrollRate(
                    e.target.value
                  )
                }
                className="w-full rounded-r-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
              />
            </div>
          </Field>

          <Field
            label="SSRP Rate"
            description="Gaji per 1 SSRP yang sudah APPROVED."
          >
            <div className="flex">
              <span className="flex items-center rounded-l-lg border border-r-0 border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-500">
                $
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  ssrpRate
                }
                onChange={(
                  e
                ) =>
                  setSsrpRate(
                    e.target.value
                  )
                }
                className="w-full rounded-r-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
              />
            </div>
          </Field>

          <Field
            label="Default Target Plants"
            description="Target default pegawai per periode."
          >
            <input
              type="number"
              min="0"
              value={
                defaultTarget
              }
              onChange={(
                e
              ) =>
                setDefaultTarget(
                  e.target.value
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
            />
          </Field>

          <Field
            label="Payroll Period"
            description="Lama satu periode payroll."
          >
            <div className="flex">
              <input
                type="number"
                min="1"
                value={
                  periodDays
                }
                onChange={(
                  e
                ) =>
                  setPeriodDays(
                    e.target.value
                  )
                }
                className="w-full rounded-l-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-600"
              />

              <span className="flex items-center rounded-r-lg border border-l-0 border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-500">
                Hari
              </span>
            </div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-900 bg-blue-950/20 p-6">
        <h3 className="font-semibold text-blue-400">
          Settings System
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Nilai di halaman ini disimpan ke database
          system_settings.
        </p>
      </section>

      {message && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-sm text-white">
          {message}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            isPending
          }
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Menyimpan..."
            : "Simpan Settings"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;

  description: string;

  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>

      <p className="mb-3 mt-1 text-xs text-zinc-600">
        {description}
      </p>

      {children}
    </div>
  );
}