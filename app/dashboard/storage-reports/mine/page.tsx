import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MyLoadPlantPage() {
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
  } =
    await supabase
      .from("employees")
      .select(`
        id,
        name,
        seed,
        target_plants
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (!employee) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6 text-red-400">
        Akun belum terhubung ke pegawai.
      </div>
    );
  }

  const {
    data: reportsData,
    error,
  } =
    await supabase
      .from(
        "load_plant_reports"
      )
      .select(`
        id,
        amount,
        report_date,
        evidence_url,
        status,
        rejection_reason,
        reviewed_at,
        created_at
      `)
      .eq(
        "employee_id",
        employee.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const reports =
    reportsData ?? [];

  const pending =
    reports.filter(
      (report) =>
        report.status ===
        "PENDING"
    ).length;

  const approvedReports =
    reports.filter(
      (report) =>
        report.status ===
        "APPROVED"
    );

  const approved =
    approvedReports.length;

  const rejected =
    reports.filter(
      (report) =>
        report.status ===
        "REJECTED"
    ).length;

  const totalApproved =
    approvedReports.reduce(
      (total, report) =>
        total +
        Number(
          report.amount
        ),
      0
    );

  const target =
    Number(
      employee.target_plants
    );

  const percentage =
    target > 0
      ? Math.min(
          100,
          (totalApproved /
            target) *
            100
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-zinc-500">
            Laporan Saya
          </p>

          <h1 className="mt-1 depth-title text-2xl font-bold text-white">
            Riwayat Load Plant Saya
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            {employee.name} • {employee.seed}
          </p>
        </div>

        <Link
          href="/dashboard/storage-reports/submit"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          + Kirim Load Plant
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Pending"
          value={
            String(
              pending
            )
          }
        />

        <StatCard
          label="Approved"
          value={
            String(
              approved
            )
          }
        />

        <StatCard
          label="Rejected"
          value={
            String(
              rejected
            )
          }
        />

        <StatCard
          label="Total Approved"
          value={
            totalApproved.toLocaleString(
              "en-US"
            )
          }
        />
      </div>

      <div className="depth-surface rounded-xl p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            Target
          </span>

          <span className="font-semibold text-white">
            {totalApproved.toLocaleString(
              "en-US"
            )}
            {" / "}
            {target.toLocaleString(
              "en-US"
            )}
          </span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-white"
            style={{
              width:
                `${percentage}%`,
            }}
          />
        </div>

        <p className="mt-2 text-right text-xs text-zinc-500">
          {percentage.toFixed(
            1
          )}
          %
        </p>
      </div>

      <div className="overflow-hidden depth-surface rounded-xl">
        <div className="border-b border-emerald-500/10 px-5 py-4">
          <h2 className="font-semibold text-white">
            Laporan Load Plant
          </h2>
        </div>

        {reports.length ===
        0 ? (
          <div className="py-16 text-center text-sm text-zinc-600">
            Belum ada laporan Load Plant.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {reports.map(
              (report) => (
                <div
                  key={
                    report.id
                  }
                  className="p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="depth-number text-xl font-bold text-white">
                        {Number(
                          report.amount
                        ).toLocaleString(
                          "en-US"
                        )}{" "}
                        Plants
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(
                          report.report_date
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        report.status
                      }
                    />
                  </div>

                  {report.status ===
                    "REJECTED" &&
                    report.rejection_reason && (
                    <div className="mt-4 rounded-lg border border-red-900 bg-red-950/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-red-500">
                        Alasan Penolakan
                      </p>

                      <p className="mt-1 text-sm text-red-300">
                        {
                          report.rejection_reason
                        }
                      </p>
                    </div>
                  )}

                  {report.evidence_url && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-emerald-500/15 bg-black">
                      <img
                        src={
                          report.evidence_url
                        }
                        alt="Bukti Load Plant"
                        className="max-h-[500px] w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="depth-surface rounded-xl p-5">
      <p className="text-sm text-zinc-500">
        {label}
      </p>

      <p className="mt-2 depth-title text-2xl font-bold text-white">
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
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-400";

  if (
    status === "PENDING"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/30 text-yellow-400";
  }

  if (
    status === "APPROVED"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (
    status === "REJECTED"
  ) {
    style =
      "border-red-900 bg-red-950/30 text-red-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${style}`}
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
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}