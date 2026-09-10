import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewActions from "./review-actions";

export default async function LoadPlantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("load_plant_reports")
    .select(`
      id,
      employee_id,
      seed,
      amount,
      report_date,
      status,
      evidence_url,
      reviewed_at,
      rejection_reason,
      employees (
        name,
        forum_name,
        position
      )
    `)
    .eq("id", id)
    .single();

  if (error || !report) {
    notFound();
  }

  const employeeRelation = Array.isArray(report.employees)
    ? report.employees[0]
    : report.employees;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/storage-reports"
        className="text-sm text-zinc-500 transition hover:text-white"
      >
        ← Kembali ke Load Plant
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Detail Laporan
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            {employeeRelation?.name ?? "Unknown"}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>
              {report.seed}
            </Badge>

            <StatusBadge
              status={report.status}
            />
          </div>
        </div>

        {report.status === "PENDING" && (
          <ReviewActions
            reportId={report.id}
          />
        )}
      </div>

      {/* ========================= */}
      {/* SUMMARY */}
      {/* ========================= */}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          title="Jumlah Plant"
          value={Number(report.amount).toLocaleString("en-US")}
        />

        <StatCard
          title="Tanggal"
          value={formatDate(report.report_date)}
        />

        <StatCard
          title="Status"
          value={report.status}
        />
      </div>

      {/* ========================= */}
      {/* INFORMATION */}
      {/* ========================= */}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="font-semibold">
            Informasi Pegawai
          </h2>

          <div className="mt-6 space-y-5">
            <Info
              label="Nama"
              value={employeeRelation?.name ?? "-"}
            />

            <Info
              label="Forum Name"
              value={employeeRelation?.forum_name ?? "-"}
            />

            <Info
              label="Jabatan"
              value={employeeRelation?.position ?? "-"}
            />

            <Info
              label="Seed"
              value={report.seed}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="font-semibold">
            Informasi Laporan
          </h2>

          <div className="mt-6 space-y-5">
            <Info
              label="Jumlah"
              value={`${Number(report.amount).toLocaleString(
                "en-US"
              )} Plants`}
            />

            <Info
              label="Tanggal"
              value={formatDate(report.report_date)}
            />

            <Info
              label="Status"
              value={report.status}
            />

            {report.reviewed_at && (
              <Info
                label="Reviewed At"
                value={new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(
                  new Date(report.reviewed_at)
                )}
              />
            )}
          </div>
        </section>
      </div>

      {/* ========================= */}
      {/* REJECTION */}
      {/* ========================= */}

      {report.rejection_reason && (
        <section className="mt-6 rounded-2xl border border-red-900 bg-red-950/20 p-6">
          <h2 className="font-semibold text-red-300">
            Alasan Penolakan
          </h2>

          <p className="mt-3 text-sm text-red-200">
            {report.rejection_reason}
          </p>
        </section>
      )}

      {/* ========================= */}
      {/* SCREENSHOT */}
      {/* ========================= */}

      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Bukti Screenshot
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Bukti Load Plant yang dikirim.
            </p>
          </div>

          {report.evidence_url && (
            <a
              href={report.evidence_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              Buka Full Image
            </a>
          )}
        </div>

        <div className="mt-5">
          {report.evidence_url ? (
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
              <img
                src={report.evidence_url}
                alt={`Bukti Load Plant ${employeeRelation?.name ?? ""}`}
                className="max-h-[700px] w-full object-contain"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
              <p className="text-sm text-zinc-600">
                Belum ada screenshot.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// =========================================================
// COMPONENTS
// =========================================================

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

function Info({
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
  let className =
    "border-yellow-900 bg-yellow-950/30 text-yellow-400";

  if (status === "APPROVED") {
    className =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  if (status === "REJECTED") {
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(
    new Date(`${date}T00:00:00`)
  );
}