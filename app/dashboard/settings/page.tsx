import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (
    String(
      profile.role
    ).toUpperCase() !==
    "OWNER"
  ) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
        <h1 className="text-lg font-bold text-red-400">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-red-300">
          Hanya OWNER yang dapat membuka Settings.
        </p>
      </div>
    );
  }

  const {
    data: settings,
    error:
      settingsError,
  } =
    await supabase
      .from(
        "system_settings"
      )
      .select(`
        id,
        system_name,
        storage_capacity,
        payroll_rate,
        ssrp_rate,
        default_target_plants,
        payroll_period_days
      `)
      .limit(1)
      .maybeSingle();

  if (
    settingsError
  ) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
        <h1 className="font-bold text-red-400">
          Gagal membaca Settings
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          {
            settingsError.message
          }
        </p>
      </div>
    );
  }

  if (
    !settings
  ) {
    return (
      <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-6">
        <h1 className="font-bold text-yellow-400">
          Settings belum tersedia
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Data system_settings belum ditemukan.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Administration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-white">
          Settings
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Pengaturan utama sistem Jackson Farm.
        </p>
      </div>

      <SettingsForm
        settings={{
          id:
            String(
              settings.id
            ),

          system_name:
            String(
              settings.system_name ??
                "Jackson Farm"
            ),

          storage_capacity:
            Number(
              settings.storage_capacity ??
                75000
            ),

          payroll_rate:
            Number(
              settings.payroll_rate ??
                0.3
            ),

          ssrp_rate:
            Number(
              settings.ssrp_rate ??
                200
            ),

          default_target_plants:
            Number(
              settings.default_target_plants ??
                40000
            ),

          payroll_period_days:
            Number(
              settings.payroll_period_days ??
                14
            ),
        }}
      />
    </div>
  );
}