import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeLoadPlantForm from "./employee-load-plant-form";

export default async function SubmitLoadPlantPage() {
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
  } =
    await supabase
      .from("profiles")
      .select(`
        role,
        status
      `)
      .eq("id", user.id)
      .maybeSingle();

  if (
    !profile ||
    profile.status !==
      "ACTIVE"
  ) {
    redirect("/login");
  }

  if (
    profile.role !==
    "EMPLOYEE"
  ) {
    redirect(
      "/dashboard/storage-reports"
    );
  }

  const {
    data: employee,
    error: employeeError,
  } =
    await supabase
      .from("employees")
      .select(`
        id,
        name,
        seed,
        status
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (employeeError) {
    throw new Error(
      employeeError.message
    );
  }

  if (!employee) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
        <h1 className="text-lg font-bold text-red-400">
          Akun belum terhubung
        </h1>

        <p className="mt-2 text-sm text-zinc-400">
          Akun belum terhubung ke Data Pegawai.
        </p>
      </div>
    );
  }

  if (
    employee.status !==
    "ACTIVE"
  ) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
        Employee dengan status {employee.status} tidak dapat mengirim Load Plant.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Laporan Saya
          </p>

          <h1 className="mt-1 depth-title text-2xl font-bold text-white">
            Kirim Load Plant
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Kirim hasil tanaman untuk direview Owner.
          </p>
        </div>

        <Link
          href="/dashboard/storage-reports/mine"
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-emerald-950/25"
        >
          Riwayat Load Plant Saya →
        </Link>
      </div>

      <div className="glass-panel depth-card rounded-2xl p-6">
        <EmployeeLoadPlantForm
          employeeId={
            employee.id
          }
          employeeName={
            employee.name
          }
          employeeSeed={
            employee.seed
          }
        />
      </div>
    </div>
  );
}