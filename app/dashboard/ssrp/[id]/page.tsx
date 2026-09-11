import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewActions from "./review-actions";

export default async function SSRPDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  const {
    data: report,
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
      reviewed_at,
      rejection_reason,
      created_at,
      employees (
        name,
        forum_name,
        seed,
        position
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (
    error ||
    !report
  ) {
    notFound();
  }

  const employee =
    Array.isArray(
      report.employees
    )
      ? report.employees[0]
      : report.employees;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/ssrp"
            className="text-sm text-zinc-500 hover:text-white"
          >
            ← Kembali ke SSRP
          </Link>

          <h1 className="mt-4 depth-title text-2xl font-bold text-white">
            Detail SSRP
          </h1>
        </div>

        {report.status ===
          "PENDING" && (
          <ReviewActions
            reportId={
              report.id
            }
          />
        )}
      </div>

      <section className="glass-panel depth-card rounded-2xl/50 p-6">
        <p className="text-xs uppercase tracking-wider text-zinc-600">
          Status
        </p>

        <div className="mt-2">
          <StatusBadge
            status={
              report.status
            }
          />
        </div>

        {report.reviewed_at && (
          <p className="mt-3 text-xs text-zinc-500">
            Direview:{" "}
            {new Date(
              report.reviewed_at
            ).toLocaleString(
              "id-ID"
            )}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-panel depth-card rounded-2xl/50 p-6">
          <h2 className="font-semibold text-white">
            Pegawai
          </h2>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Nama"
              value={
                employee?.name ??
                "Unknown"
              }
            />

            <InfoRow
              label="Forum"
              value={
                employee?.forum_name ??
                "-"
              }
            />

            <InfoRow
              label="Seed"
              value={
                employee?.seed ??
                "-"
              }
            />

            <InfoRow
              label="Position"
              value={
                employee?.position ??
                "-"
              }
            />
          </div>
        </section>

        <section className="glass-panel depth-card rounded-2xl/50 p-6">
          <h2 className="font-semibold text-white">
            Informasi SSRP
          </h2>

          <div className="mt-5 space-y-4">
            <InfoRow
              label="Tanggal"
              value={formatDate(
                report.report_date
              )}
            />

            <InfoRow
              label="Aktivitas"
              value={
                report.activity
              }
            />
          </div>
        </section>
      </div>

      {report.status ===
        "REJECTED" &&
        report.rejection_reason && (
          <section className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Alasan Penolakan
            </p>

            <p className="mt-3 text-sm text-red-200">
              {
                report.rejection_reason
              }
            </p>
          </section>
        )}

      <section className="glass-panel depth-card rounded-2xl/50 p-6">
        <h2 className="font-semibold text-white">
          Screenshot SSRP
        </h2>

        <div className="mt-5">
          {report.evidence_url ? (
            <div className="overflow-hidden rounded-xl border border-emerald-500/15 bg-black">
              <img
                src={
                  report.evidence_url
                }
                alt="Screenshot SSRP"
                className="max-h-[700px] w-full object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              Tidak ada screenshot.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-zinc-900 pb-3 last:border-0">
      <p className="text-xs uppercase tracking-wider text-zinc-600">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">
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
      month: "2-digit",
      year: "numeric",
    }
  ).format(
    new Date(
      `${value}T00:00:00`
    )
  );
}