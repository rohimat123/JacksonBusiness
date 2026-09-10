import { createClient } from "@/lib/supabase/server";
import LoadPlantForm from "./load-plant-form";

export default async function CreateLoadPlantPage() {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      seed,
      status
    `)
    .eq("status", "ACTIVE")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <p className="text-sm text-zinc-500">
          Laporan
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Tambah Load Plant
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Masukkan laporan plant pegawai Jackson Farm.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <LoadPlantForm employees={employees ?? []} />
      </div>
    </div>
  );
}