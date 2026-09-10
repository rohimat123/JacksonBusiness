import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditEmployeeForm from "./edit-employee-form";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: employee, error } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      forum_name,
      seed,
      position,
      join_date,
      status,
      target_plants,
      starting_week,
      end_week
    `)
    .eq("id", id)
    .single();

  if (error || !employee) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <p className="text-sm text-zinc-500">
          Pegawai
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Edit Pegawai
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Ubah data pegawai Jackson Farm.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <EditEmployeeForm employee={employee} />
      </div>
    </div>
  );
}