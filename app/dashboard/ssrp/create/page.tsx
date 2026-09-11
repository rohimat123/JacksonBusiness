import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeSSRPForm from "./employee-ssrp-form";

export default async function CreateSSRPPage() {
  const supabase = await createClient();

  // ============================================================
  // AUTH
  // ============================================================

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  // ============================================================
  // PROFILE
  // ============================================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    redirect("/login");
  }

  const role = String(
    profile.role ?? ""
  ).toUpperCase();

  const profileStatus = String(
    profile.status ?? ""
  ).toUpperCase();

  if (profileStatus !== "ACTIVE") {
    redirect("/login");
  }

  // ============================================================
  // ACCESS
  //
  // EMPLOYEE:
  // ✓ Kirim SSRP sendiri
  //
  // MANAGER:
  // ✓ Kirim SSRP sendiri
  //
  // OWNER:
  // ✗ Tidak menggunakan form ini
  //   Owner melakukan review SSRP
  // ============================================================

  if (
    role !== "EMPLOYEE" &&
    role !== "MANAGER"
  ) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/ssrp"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke SSRP
        </Link>

        <div className="rounded-xl border border-yellow-900 bg-yellow-950/20 p-6">
          <h1 className="text-lg font-bold text-yellow-400">
            Tidak Memiliki Akses
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Form ini hanya digunakan oleh Employee dan Manager
            untuk mengirim SSRP miliknya sendiri.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // CARI DATA EMPLOYEE BERDASARKAN PROFILE LOGIN
  // ============================================================

  const {
    data: employee,
    error: employeeError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      profile_id,
      name,
      forum_name,
      seed,
      position,
      status
    `)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (employeeError) {
    throw new Error(
      `Gagal membaca Data Pegawai: ${employeeError.message}`
    );
  }

  // ============================================================
  // BELUM TERHUBUNG KE EMPLOYEE
  // ============================================================

  if (!employee) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/ssrp"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke SSRP
        </Link>

        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <h1 className="text-lg font-bold text-red-400">
            Akun Belum Terhubung
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Akun {profile.full_name ?? "ini"} belum terhubung
            ke Data Pegawai.
          </p>

          <p className="mt-2 text-xs text-zinc-600">
            Pastikan profile_id pada tabel employees sama
            dengan ID akun yang sedang login.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // VALIDASI EMPLOYEE ID
  // ============================================================

  if (!employee.id) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/ssrp"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke SSRP
        </Link>

        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <h1 className="text-lg font-bold text-red-400">
            Employee ID Tidak Ditemukan
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Data pegawai ditemukan, tetapi Employee ID tidak valid.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // EMPLOYEE STATUS
  // ============================================================

  const employeeStatus = String(
    employee.status ?? ""
  ).toUpperCase();

  if (employeeStatus !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/ssrp"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke SSRP
        </Link>

        <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
          <h1 className="text-lg font-bold text-red-400">
            Pegawai Tidak Aktif
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            {employee.name} memiliki status{" "}
            <span className="font-semibold text-red-300">
              {employee.status}
            </span>
            {" "}dan tidak dapat mengirim SSRP.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Laporan Saya
          </p>

          <h1 className="mt-1 depth-title text-2xl font-bold text-white">
            Kirim SSRP
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Kirim bukti aktivitas SSRP untuk direview Owner.
          </p>
        </div>

        <Link
          href="/dashboard/ssrp/mine"
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-emerald-950/25"
        >
          Riwayat SSRP Saya →
        </Link>
      </div>

      {/* INFO ROLE */}

      {role === "MANAGER" && (
        <div className="rounded-xl border border-blue-900/60 bg-blue-950/10 px-4 py-3">
          <p className="text-sm text-blue-300">
            Anda mengirim SSRP sebagai Manager.
            Laporan akan berstatus PENDING dan harus direview Owner.
          </p>
        </div>
      )}

      {/* FORM */}

      <div className="glass-panel depth-card rounded-2xl p-6">
        <EmployeeSSRPForm
          employeeId={String(employee.id)}
          employeeName={String(employee.name ?? "")}
          employeeSeed={String(employee.seed ?? "")}
        />
      </div>
    </div>
  );
}