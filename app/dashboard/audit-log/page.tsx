import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    action?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

// ============================================================
// PAGE
// ============================================================

export default async function AuditLogPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  // ==========================================================
  // NORMAL CLIENT - UNTUK AUTH
  // ==========================================================

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      full_name,
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    String(profile.status).toUpperCase() !== "ACTIVE"
  ) {
    redirect("/login");
  }

  if (
    String(profile.role).toUpperCase() !== "OWNER"
  ) {
    redirect("/dashboard");
  }

  // ==========================================================
  // SERVICE ROLE
  // ==========================================================

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL tidak ditemukan di .env.local"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di .env.local"
    );
  }

  const admin = createSupabaseAdmin(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const currentPage = Math.max(
    Number(params?.page ?? 1) || 1,
    1
  );

  const from =
    (currentPage - 1) *
    PAGE_SIZE;

  const to =
    from +
    PAGE_SIZE -
    1;

  const selectedAction =
    String(
      params?.action ?? ""
    ).trim();

  // ==========================================================
  // MAIN LOG QUERY
  // ==========================================================

  let logsQuery = admin
    .from("audit_logs")
    .select(
      `
      id,
      actor_id,
      actor_name,
      actor_role,
      action,
      entity_type,
      entity_id,
      description,
      metadata,
      created_at
      `,
      {
        count: "exact",
      }
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    )
    .range(
      from,
      to
    );

  if (selectedAction) {
    logsQuery =
      logsQuery.eq(
        "action",
        selectedAction
      );
  }

  const {
    data: logsData,
    count,
    error: logsError,
  } = await logsQuery;

  if (logsError) {
    throw new Error(
      `Audit Log Query Error: ${logsError.message}`
    );
  }

  const logs =
    logsData ?? [];

  const total =
    count ?? 0;

  const totalPages =
    Math.max(
      Math.ceil(
        total /
          PAGE_SIZE
      ),
      1
    );

  // ==========================================================
  // ACTION OPTIONS
  // ==========================================================

  const {
    data: actionData,
    error: actionError,
  } = await admin
    .from("audit_logs")
    .select("action")
    .order(
      "action",
      {
        ascending: true,
      }
    );

  if (actionError) {
    throw new Error(
      actionError.message
    );
  }

  const actions =
    Array.from(
      new Set(
        (
          actionData ??
          []
        )
          .map(
            (item) =>
              String(
                item.action
              )
          )
          .filter(Boolean)
      )
    );

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const today =
    getJakartaDate();

  const tomorrow =
    addDays(
      today,
      1
    );

  const todayStart =
    `${today}T00:00:00+07:00`;

  const tomorrowStart =
    `${tomorrow}T00:00:00+07:00`;

  const {
    count: todayCount,
    error: todayError,
  } = await admin
    .from("audit_logs")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    )
    .gte(
      "created_at",
      todayStart
    )
    .lt(
      "created_at",
      tomorrowStart
    );

  if (todayError) {
    throw new Error(
      todayError.message
    );
  }

  const {
    count: totalCount,
    error: totalError,
  } = await admin
    .from("audit_logs")
    .select(
      "id",
      {
        count: "exact",
        head: true,
      }
    );

  if (totalError) {
    throw new Error(
      totalError.message
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div>
        <p className="text-sm text-zinc-500">
          Administration
        </p>

        <h1 className="mt-1 depth-title text-3xl font-bold text-white">
          Audit Log
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Riwayat aktivitas penting di Jackson Farm.
        </p>
      </div>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Log"
          value={formatNumber(
            totalCount ?? 0
          )}
          description="Semua aktivitas"
        />

        <StatCard
          title="Hari Ini"
          value={formatNumber(
            todayCount ?? 0
          )}
          description="Aktivitas hari ini"
        />

        <StatCard
          title="Jenis Action"
          value={formatNumber(
            actions.length
          )}
          description="Action tercatat"
        />
      </div>

      {/* FILTER */}

      <section className="glass-panel depth-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/audit-log"
            className={`rounded-lg border px-4 py-2 text-sm transition ${
              !selectedAction
                ? "border-white bg-white text-black"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-emerald-950/25"
            }`}
          >
            Semua
          </Link>

          {actions.map(
            (action) => (
              <Link
                key={action}
                href={`/dashboard/audit-log?action=${encodeURIComponent(
                  action
                )}`}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  selectedAction === action
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-emerald-950/25"
                }`}
              >
                {formatAction(
                  action
                )}
              </Link>
            )
          )}
        </div>
      </section>

      {/* LOGS */}

      <section className="overflow-hidden glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Aktivitas
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {formatNumber(
                  total
                )}{" "}
                log ditemukan.
              </p>
            </div>

            {selectedAction && (
              <ActionBadge
                action={
                  selectedAction
                }
              />
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-600">
              Belum ada Audit Log.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {logs.map(
              (log) => (
                <div
                  key={log.id}
                  className="px-6 py-5 transition hover:bg-emerald-950/25/50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ActionBadge
                          action={
                            log.action
                          }
                        />

                        {log.entity_type && (
                          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-[10px] font-semibold uppercase text-zinc-500">
                            {log.entity_type}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm font-medium text-zinc-200">
                        {log.description ||
                          formatAction(
                            log.action
                          )}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600">
                        <span>
                          Oleh:{" "}
                          <strong className="font-medium text-zinc-400">
                            {log.actor_name ??
                              "Unknown"}
                          </strong>
                        </span>

                        {log.actor_role && (
                          <span>
                            Role:{" "}
                            <strong className="font-medium text-zinc-400">
                              {log.actor_role}
                            </strong>
                          </span>
                        )}

                        {log.entity_id && (
                          <span>
                            ID:{" "}
                            <code className="text-zinc-500">
                              {shortId(
                                log.entity_id
                              )}
                            </code>
                          </span>
                        )}
                      </div>

                      {hasMetadata(
                        log.metadata
                      ) && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-300">
                            Lihat Metadata
                          </summary>

                          <pre className="mt-3 overflow-x-auto depth-surface rounded-xl p-4 text-xs leading-6 text-zinc-500">
                            {JSON.stringify(
                              log.metadata,
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      )}
                    </div>

                    <div className="shrink-0 text-left lg:text-right">
                      <p className="text-xs font-medium text-zinc-400">
                        {formatDateTime(
                          log.created_at
                        )}
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-700">
                        WIB
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* PAGINATION */}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            Halaman{" "}
            {currentPage} dari{" "}
            {totalPages}
          </p>

          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildPageUrl(
                  currentPage - 1,
                  selectedAction
                )}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 hover:bg-emerald-950/25"
              >
                ← Sebelumnya
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-emerald-500/15 bg-zinc-950 px-4 py-2 text-sm text-zinc-700">
                ← Sebelumnya
              </span>
            )}

            {currentPage < totalPages ? (
              <Link
                href={buildPageUrl(
                  currentPage + 1,
                  selectedAction
                )}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 hover:bg-emerald-950/25"
              >
                Berikutnya →
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-lg border border-emerald-500/15 bg-zinc-950 px-4 py-2 text-sm text-zinc-700">
                Berikutnya →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

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
    <div className="glass-panel depth-card rounded-2xl p-6">
      <p className="text-sm text-zinc-400">
        {title}
      </p>

      <p className="mt-3 depth-title text-3xl font-bold text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

function ActionBadge({
  action,
}: {
  action: string;
}) {
  const upper =
    String(
      action
    ).toUpperCase();

  let style =
    "border-zinc-700 bg-zinc-950 text-zinc-400";

  if (
    upper.includes("APPROVE") ||
    upper.includes("PAY") ||
    upper.includes("CREATE") ||
    upper.includes("ASSIGN")
  ) {
    style =
      "border-green-900 bg-green-950/20 text-green-400";
  }

  if (
    upper.includes("REJECT") ||
    upper.includes("DELETE") ||
    upper.includes("VOID")
  ) {
    style =
      "border-red-900 bg-red-950/20 text-red-400";
  }

  if (
    upper.includes("UPDATE") ||
    upper.includes("EDIT") ||
    upper.includes("GENERATE")
  ) {
    style =
      "border-blue-900 bg-blue-950/20 text-blue-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${style}`}
    >
      {formatAction(
        action
      )}
    </span>
  );
}

// ============================================================
// HELPERS
// ============================================================

function formatAction(
  value: string
) {
  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function shortId(
  value: string
) {
  if (
    value.length <= 16
  ) {
    return value;
  }

  return `${value.slice(
    0,
    8
  )}...${value.slice(
    -4
  )}`;
}

function hasMetadata(
  value: unknown
) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  return (
    Object.keys(
      value as Record<
        string,
        unknown
      >
    ).length > 0
  );
}

function buildPageUrl(
  page: number,
  action: string
) {
  const params =
    new URLSearchParams();

  params.set(
    "page",
    String(page)
  );

  if (action) {
    params.set(
      "action",
      action
    );
  }

  return `/dashboard/audit-log?${params.toString()}`;
}

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(value);
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone:
        "Asia/Jakarta",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",
    }
  ).format(
    new Date(value)
  );
}

// ============================================================
// JAKARTA DATE
// ============================================================

function getJakartaDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Jakarta",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function addDays(
  value: string,
  amount: number
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  date.setDate(
    date.getDate() +
      amount
  );

  const nextYear =
    date.getFullYear();

  const nextMonth =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const nextDay =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${nextYear}-${nextMonth}-${nextDay}`;
}