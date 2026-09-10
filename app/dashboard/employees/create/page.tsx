import AddEmployeeForm from "./employee-form";
import { createClient } from "@/lib/supabase/server";

export default async function CreateEmployeePage() {
  const supabase = await createClient();

  const {
    data: settings,
    error: settingsError,
  } = await supabase
    .from("system_settings")
    .select(`
      default_target_plants
    `)
    .limit(1)
    .maybeSingle();

  if (settingsError) {
    console.error(
      "Gagal membaca system settings:",
      settingsError.message
    );
  }

  const defaultTargetPlants =
    Number(
      settings?.default_target_plants ??
        40000
    );

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <p className="text-sm text-zinc-500">
          Pegawai
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Tambah Pegawai
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Tambahkan pegawai baru ke Jackson Farm.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <AddEmployeeForm
          defaultTargetPlants={
            defaultTargetPlants
          }
        />
      </div>
    </div>
  );
}