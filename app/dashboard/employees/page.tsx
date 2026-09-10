import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeesPage() {
  const supabase = await createClient();

  // ============================================================
  // EMPLOYEES
  // ============================================================

  const {
    data: employees,
    error,
  } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      forum_name,
      seed,
      position,
      join_date,
      status,
      target_plants
    `)
    .order("name", {
      ascending: true,
    });

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold">
          Data Pegawai
        </h1>

        <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/20 p-5 text-red-300">
          Gagal membaca data pegawai.
        </div>
      </div>
    );
  }

  // ============================================================
  // SYSTEM SETTINGS
  // ============================================================

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

  // ============================================================
  // STATISTICS
  // ============================================================

  const activeEmployees =
    employees?.filter(
      (employee) =>
        String(
          employee.status
        ).toUpperCase() ===
        "ACTIVE"
    ).length ?? 0;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Pegawai
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Data Pegawai
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Kelola data pegawai Jackson Farm.
          </p>
        </div>

        <Link
          href="/dashboard/employees/create"
          className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          + Tambah Pegawai
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Pegawai"
          value={String(
            employees?.length ??
              0
          )}
        />

        <StatCard
          title="Pegawai Aktif"
          value={String(
            activeEmployees
          )}
        />

        <StatCard
          title="Target Default"
          value={defaultTargetPlants.toLocaleString(
            "en-US"
          )}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-zinc-800 bg-zinc-900">
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-4">
                  Nama
                </th>

                <th className="px-5 py-4">
                  Seed
                </th>

                <th className="px-5 py-4">
                  Forum Name
                </th>

                <th className="px-5 py-4">
                  Jabatan
                </th>

                <th className="px-5 py-4">
                  Join Date
                </th>

                <th className="px-5 py-4">
                  Target
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4 text-right">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {employees &&
              employees.length >
                0 ? (
                employees.map(
                  (employee) => (
                    <tr
                      key={
                        employee.id
                      }
                      className="border-b border-zinc-800/70 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">
                          {
                            employee.name
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {
                          employee.seed
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {employee.forum_name ||
                          "-"}
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {
                          employee.position
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {formatDate(
                          employee.join_date
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-zinc-300">
                        {Number(
                          employee.target_plants
                        ).toLocaleString(
                          "en-US"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            employee.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/dashboard/employees/${employee.id}`}
                          className="text-sm font-medium text-zinc-300 transition hover:text-white"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm text-zinc-600"
                  >
                    Belum ada data
                    pegawai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let className =
    "border-zinc-700 bg-zinc-900 text-zinc-300";

  if (
    String(
      status
    ).toUpperCase() ===
    "ACTIVE"
  ) {
    className =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    String(
      status
    ).toUpperCase() ===
    "RESIGNED"
  ) {
    className =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T00:00:00`
    )
  );
}