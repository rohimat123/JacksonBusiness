import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SSRPReport = {
  id: string;
  employee_id: string;
  activity: string;
  report_date: string;
  evidence_url: string | null;
  status: string;
  created_at: string;

  employees:
    | {
        name: string;
        forum_name: string | null;
        seed: string;
        position: string | null;
      }
    | {
        name: string;
        forum_name: string | null;
        seed: string;
        position: string | null;
      }[]
    | null;
};

export default async function SSRPPage() {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("ssrp_reports")
    .select(`
      id,
      employee_id,
      activity,
      report_date,
      evidence_url,
      status,
      created_at,
      employees (
        name,
        forum_name,
        seed,
        position
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  const reports =
    (data ?? []) as SSRPReport[];

  const pending =
    reports.filter(
      (item) =>
        item.status === "PENDING"
    ).length;

  const approved =
    reports.filter(
      (item) =>
        item.status === "APPROVED"
    ).length;

  const rejected =
    reports.filter(
      (item) =>
        item.status === "REJECTED"
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="depth-title text-2xl font-bold text-white">
            Laporan SSRP
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Monitoring aktivitas dan screenshot SSRP pegawai Jackson Farm.
          </p>
        </div>

        <Link
          href="/dashboard/ssrp/create"
          className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          + Tambah SSRP
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Pending"
          value={pending}
          description="Menunggu review"
        />

        <StatCard
          title="Approved"
          value={approved}
          description="SSRP diterima"
        />

        <StatCard
          title="Rejected"
          value={rejected}
          description="SSRP ditolak"
        />
      </div>

      <div className="overflow-hidden glass-panel depth-card rounded-2xl/50">
        <div className="border-b border-emerald-500/10 px-5 py-4">
          <h2 className="font-semibold text-white">
            Riwayat SSRP
          </h2>
        </div>

        {reports.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-zinc-500">
            Belum ada laporan SSRP.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-emerald-500/10 bg-zinc-900/40 text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Tanggal
                  </th>

                  <th className="px-5 py-4">
                    Pegawai
                  </th>

                  <th className="px-5 py-4">
                    Aktivitas
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Detail
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {reports.map(
                  (report) => {
                    const employee =
                      Array.isArray(
                        report.employees
                      )
                        ? report.employees[0]
                        : report.employees;

                    return (
                      <tr
                        key={report.id}
                        className="transition hover:bg-emerald-950/25/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-zinc-300">
                          {formatDate(
                            report.report_date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-200">
                            {employee?.name ??
                              "Unknown"}
                          </p>

                          <p className="mt-0.5 text-xs text-zinc-600">
                            {employee?.seed ??
                              "-"}
                          </p>
                        </td>

                        <td className="max-w-md px-5 py-4 text-zinc-400">
                          <p className="line-clamp-2">
                            {report.activity}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              report.status
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/ssrp/${report.id}`}
                            className="font-medium text-zinc-300 hover:text-white"
                          >
                            Lihat →
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="glass-panel depth-card rounded-2xl/50 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 depth-title text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (status === "APPROVED") {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (status === "PENDING") {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (status === "REJECTED") {
    style =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}

function formatDate(
  value: string
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
      `${value}T00:00:00`
    )
  );
}