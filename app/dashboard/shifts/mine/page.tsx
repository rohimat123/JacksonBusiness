import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

type Employee = {
  id: string;
  profile_id: string | null;
  name: string;
  forum_name: string | null;
  seed: string;
  position: string | null;
  status: string;
};

type ShiftType = {
  id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  sort_order: number | null;
};

type ShiftAssignment = {
  id: string;
  employee_id: string;
  shift_type_id: string;
  shift_date: string;
  note: string | null;
  shift_types:
    | ShiftType
    | ShiftType[]
    | null;
};

export default async function MyShiftPage({
  searchParams,
}: PageProps) {
  const supabase =
    await createClient();

  const params =
    await searchParams;

  // ==========================================================
  // AUTH
  // ==========================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ==========================================================
  // PROFILE
  // ==========================================================

  const {
    data: profile,
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

  if (
    !profile ||
    String(
      profile.status
    ).toUpperCase() !==
      "ACTIVE"
  ) {
    redirect("/login");
  }

  const role =
    String(
      profile.role
    ).toUpperCase();

  // Owner / Manager jangan pakai halaman personal
  if (
    role === "OWNER" ||
    role === "MANAGER"
  ) {
    redirect(
      "/dashboard/shifts/admin"
    );
  }

  // ==========================================================
  // EMPLOYEE LINK
  // ==========================================================

  const {
    data: employeeData,
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

  if (!employeeData) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-red-900 bg-red-950/20 p-6">
          <p className="text-sm font-semibold text-red-400">
            Data Pegawai Tidak Ditemukan
          </p>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Akun kamu belum terhubung
            dengan data pegawai.
            Hubungi Owner untuk
            menghubungkan akun ini.
          </p>
        </div>
      </div>
    );
  }

  const employee =
    employeeData as Employee;

  // ==========================================================
  // WEEK
  // ==========================================================

  const requestedDate =
    params?.date;

  const selectedDate =
    isValidDateString(
      requestedDate
    )
      ? requestedDate!
      : getJakartaDate();

  const weekStart =
    getMonday(
      selectedDate
    );

  const weekEnd =
    addDays(
      weekStart,
      6
    );

  const previousWeek =
    addDays(
      weekStart,
      -7
    );

  const nextWeek =
    addDays(
      weekStart,
      7
    );

  const today =
    getJakartaDate();

  // ==========================================================
  // SHIFTS
  // ==========================================================

  const {
    data: assignmentsData,
    error:
      assignmentsError,
  } = await supabase
    .from(
      "shift_assignments"
    )
    .select(`
      id,
      employee_id,
      shift_type_id,
      shift_date,
      note,

      shift_types (
        id,
        name,
        start_time,
        end_time,
        sort_order
      )
    `)
    .eq(
      "employee_id",
      employee.id
    )
    .gte(
      "shift_date",
      weekStart
    )
    .lte(
      "shift_date",
      weekEnd
    )
    .order(
      "shift_date",
      {
        ascending: true,
      }
    );

  if (
    assignmentsError
  ) {
    throw new Error(
      assignmentsError.message
    );
  }

  const assignments =
    (assignmentsData ??
      []) as ShiftAssignment[];

  // ==========================================================
  // MAP SHIFT PER DATE
  // ==========================================================

  const assignmentMap =
    new Map<
      string,
      ShiftAssignment
    >();

  for (
    const assignment of
      assignments
  ) {
    assignmentMap.set(
      assignment.shift_date,
      assignment
    );
  }

  // ==========================================================
  // 7 DAYS
  // ==========================================================

  const days =
    Array.from(
      {
        length: 7,
      },
      (_, index) => {
        const date =
          addDays(
            weekStart,
            index
          );

        return {
          date,

          assignment:
            assignmentMap.get(
              date
            ) ?? null,
        };
      }
    );

  // ==========================================================
  // NEXT SHIFT
  // ==========================================================

  const upcoming =
    assignments.find(
      (assignment) =>
        assignment.shift_date >=
        today
    );

  const upcomingType =
    upcoming
      ? getRelationObject(
          upcoming.shift_types
        )
      : null;

  // ==========================================================
  // STATS
  // ==========================================================

  const totalScheduled =
    assignments.length;

  const totalOff =
    Math.max(
      0,
      7 -
        totalScheduled
    );

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Pekerjaan Saya
          </p>

          <h1 className="mt-1 text-3xl font-bold text-white">
            Jadwal Saya
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Lihat jadwal kerja
            kamu selama satu
            minggu.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/shifts/mine?date=${previousWeek}`}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            ← Minggu Sebelumnya
          </Link>

          <Link
            href="/dashboard/shifts/mine"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Minggu Ini
          </Link>

          <Link
            href={`/dashboard/shifts/mine?date=${nextWeek}`}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900"
          >
            Minggu Berikutnya →
          </Link>
        </div>
      </div>

      {/* EMPLOYEE */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Pegawai
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              {employee.name}
            </h2>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-400">
                {employee.seed}
              </span>

              {employee.position && (
                <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-400">
                  {
                    employee.position
                  }
                </span>
              )}

              <span className="rounded-full border border-green-900 bg-green-950/20 px-3 py-1 text-green-400">
                {employee.status}
              </span>
            </div>
          </div>

          <div className="md:text-right">
            <p className="text-xs uppercase tracking-wide text-zinc-600">
              Minggu
            </p>

            <p className="mt-2 font-semibold text-white">
              {formatDate(
                weekStart
              )}
              {" - "}
              {formatDate(
                weekEnd
              )}
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Shift Minggu Ini"
          value={String(
            totalScheduled
          )}
          description="Jadwal kerja"
        />

        <StatCard
          title="Tanpa Jadwal"
          value={String(
            totalOff
          )}
          description="Hari tanpa shift"
        />

        <StatCard
          title="Shift Berikutnya"
          value={
            upcoming
              ? formatShortDate(
                  upcoming.shift_date
                )
              : "-"
          }
          description={
            upcomingType
              ?.name ??
            "Belum ada jadwal"
          }
        />
      </div>

      {/* NEXT SHIFT */}

      {upcoming &&
        upcomingType && (
          <section className="rounded-2xl border border-green-900/60 bg-green-950/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-500">
              Shift Berikutnya
            </p>

            <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {
                    upcomingType.name
                  }
                </h2>

                <p className="mt-2 text-sm text-zinc-400">
                  {formatFullDate(
                    upcoming.shift_date
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-5 py-4">
                <p className="text-xs text-zinc-600">
                  Jam Kerja
                </p>

                <p className="mt-1 text-lg font-semibold text-white">
                  {formatShiftTime(
                    upcomingType.start_time,
                    upcomingType.end_time,
                    upcomingType.name
                  )}
                </p>
              </div>
            </div>

            {upcoming.note && (
              <div className="mt-5 border-t border-green-900/40 pt-4">
                <p className="text-xs text-zinc-600">
                  Catatan
                </p>

                <p className="mt-1 text-sm text-zinc-300">
                  {upcoming.note}
                </p>
              </div>
            )}
          </section>
        )}

      {/* 7 DAYS */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h2 className="font-semibold text-white">
            Jadwal 7 Hari
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Jadwal yang sudah
            ditentukan oleh
            Owner / Manager.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-7">
          {days.map(
            ({
              date,
              assignment,
            }) => {
              const shift =
                assignment
                  ? getRelationObject(
                      assignment.shift_types
                    )
                  : null;

              const isToday =
                date ===
                today;

              return (
                <div
                  key={date}
                  className={`min-h-[220px] border-b border-zinc-800 p-5 md:border-r xl:border-b-0 ${
                    isToday
                      ? "bg-zinc-800/50"
                      : "bg-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {getDayName(
                          date
                        )}
                      </p>

                      <p className="mt-1 text-lg font-bold text-white">
                        {getDayNumber(
                          date
                        )}
                      </p>
                    </div>

                    {isToday && (
                      <span className="rounded-full border border-green-900 bg-green-950/30 px-2 py-1 text-[10px] font-semibold text-green-400">
                        HARI INI
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    {shift ? (
                      <>
                        <span className="inline-flex rounded-lg border border-blue-900 bg-blue-950/20 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                          {
                            shift.name
                          }
                        </span>

                        <p className="mt-3 text-sm font-semibold text-white">
                          {formatShiftTime(
                            shift.start_time,
                            shift.end_time,
                            shift.name
                          )}
                        </p>

                        {assignment
                          ?.note && (
                          <p className="mt-3 text-xs leading-5 text-zinc-500">
                            {
                              assignment.note
                            }
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-600">
                          Tidak Ada Shift
                        </span>

                        <p className="mt-3 text-xs leading-5 text-zinc-600">
                          Belum ada jadwal
                          kerja untuk hari
                          ini.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* INFORMATION */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-semibold text-white">
          Informasi Jadwal
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Jadwal hanya dapat
          diatur oleh Owner atau
          Manager. Jika ada
          kesalahan jadwal atau
          kamu berhalangan hadir,
          hubungi Owner / Manager.
        </p>
      </section>
    </div>
  );
}

// ============================================================
// COMPONENT
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// RELATION
// ============================================================

function getRelationObject<
  T,
>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value;
}

// ============================================================
// JAKARTA DATE
// ============================================================

function getJakartaDate() {
  return new Intl.DateTimeFormat(
    "en-CA",
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
  ).format(
    new Date()
  );
}

// ============================================================
// MONDAY
// ============================================================

function getMonday(
  dateString: string
) {
  const date =
    parseISODate(
      dateString
    );

  const day =
    date.getUTCDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setUTCDate(
    date.getUTCDate() +
      difference
  );

  return formatISODate(
    date
  );
}

// ============================================================
// ADD DAYS
// ============================================================

function addDays(
  dateString: string,
  amount: number
) {
  const date =
    parseISODate(
      dateString
    );

  date.setUTCDate(
    date.getUTCDate() +
      amount
  );

  return formatISODate(
    date
  );
}

// ============================================================
// PARSE
// ============================================================

function parseISODate(
  dateString: string
) {
  const [
    year,
    month,
    day,
  ] =
    dateString
      .split("-")
      .map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

// ============================================================
// ISO
// ============================================================

function formatISODate(
  date: Date
) {
  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

// ============================================================
// VALID DATE
// ============================================================

function isValidDateString(
  value?: string
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return false;
  }

  const date =
    parseISODate(
      value
    );

  return (
    formatISODate(
      date
    ) === value
  );
}

// ============================================================
// DATE FORMAT
// ============================================================

function formatDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      dateString
    )
  );
}

function formatShortDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      dateString
    )
  );
}

function formatFullDate(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      dateString
    )
  );
}

function getDayName(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday:
        "short",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      dateString
    )
  );
}

function getDayNumber(
  dateString: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "short",

      timeZone:
        "UTC",
    }
  ).format(
    parseISODate(
      dateString
    )
  );
}

// ============================================================
// SHIFT TIME
// ============================================================

function formatShiftTime(
  start:
    | string
    | null,
  end:
    | string
    | null,
  name:
    | string
    | null
) {
  const normalizedName =
    String(
      name ?? ""
    ).toLowerCase();

  if (
    normalizedName.includes(
      "manager"
    ) &&
    normalizedName.includes(
      "selling"
    )
  ) {
    if (
      !start &&
      !end
    ) {
      return "Manager Selling";
    }
  }

  if (
    !start &&
    !end
  ) {
    return "-";
  }

  return `${formatTime(
    start
  )} - ${formatTime(
    end
  )}`;
}

function formatTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "--:--";
  }

  return value.slice(
    0,
    5
  );
}