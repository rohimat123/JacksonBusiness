import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeActions from "./employee-actions";

export default async function EmployeeDetailPage({
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
      end_week,
      created_at
    `)
    .eq("id", id)
    .single();

  if (error || !employee) {
    notFound();
  }

  const daysWorked = calculateDaysWorked(employee.join_date);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/employees"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Kembali ke Data Pegawai
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Detail Pegawai
          </p>

          <h1 className="mt-1 depth-title text-3xl font-bold">
            {employee.name}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{employee.seed}</Badge>

            <Badge>{employee.position}</Badge>

            <StatusBadge status={employee.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
  <Link
    href={`/dashboard/employees/${employee.id}/edit`}
    className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
  >
    Edit Pegawai
  </Link>

  <EmployeeActions
    employeeId={employee.id}
    currentStatus={employee.status}
  />
</div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Target Plant"
          value={Number(employee.target_plants).toLocaleString("en-US")}
          description="Target periode"
        />

        <StatCard
          title="Hari Bekerja"
          value={`${daysWorked} Hari`}
          description={`Join ${formatDate(employee.join_date)}`}
        />

        <StatCard
          title="Status"
          value={employee.status}
          description="Status kepegawaian"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="glass-panel depth-card rounded-2xl p-6">
          <h2 className="font-semibold">
            Informasi Pegawai
          </h2>

          <div className="mt-6 space-y-5">
            <Information
              label="Nama IC"
              value={employee.name}
            />

            <Information
              label="Forum Name"
              value={employee.forum_name || "-"}
            />

            <Information
              label="Seed"
              value={employee.seed}
            />

            <Information
              label="Jabatan"
              value={employee.position}
            />

            <Information
              label="Tanggal Join"
              value={formatDate(employee.join_date)}
            />
          </div>
        </section>

        <section className="glass-panel depth-card rounded-2xl p-6">
          <h2 className="font-semibold">
            Periode & Target
          </h2>

          <div className="mt-6 space-y-5">
            <Information
              label="Target"
              value={`${Number(employee.target_plants).toLocaleString(
                "en-US"
              )} Plants`}
            />

            <Information
              label="Starting Week"
              value={
                employee.starting_week
                  ? formatDate(employee.starting_week)
                  : "-"
              }
            />

            <Information
              label="End Week"
              value={
                employee.end_week
                  ? formatDate(employee.end_week)
                  : "-"
              }
            />

            <Information
              label="Lama Bekerja"
              value={`${daysWorked} Hari`}
            />
          </div>
        </section>
      </div>

      <section className="mt-6 glass-panel depth-card rounded-2xl p-6">
        <div>
          <h2 className="font-semibold">
            Progress Target
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Data plant akan dihitung otomatis dari laporan Load Plant.
          </p>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="depth-title text-3xl font-bold">
              0
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              dari{" "}
              {Number(employee.target_plants).toLocaleString("en-US")} Plants
            </p>
          </div>

          <p className="text-sm text-zinc-400">
            0%
          </p>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: "0%" }}
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="glass-panel depth-card rounded-2xl p-5">
      <p className="text-sm text-zinc-500">{title}</p>

      <p className="mt-2 depth-title text-2xl font-bold">{value}</p>

      <p className="mt-2 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function Information({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-sm text-zinc-200">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? "border-green-900 bg-green-950/30 text-green-400"
          : "border-red-900 bg-red-950/30 text-red-400"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function calculateDaysWorked(joinDate: string) {
  const start = new Date(`${joinDate}T00:00:00`);
  const today = new Date();

  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const difference = today.getTime() - start.getTime();

  return Math.max(
    0,
    Math.floor(difference / 86400000) + 1
  );
}