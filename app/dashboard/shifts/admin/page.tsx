import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

type PageProps = {
  searchParams?: Promise<{
    date?: string;
    success?: string;
    error?: string;
  }>;
};

// ============================================================
// PAGE
// ============================================================

export default async function AdminShiftPage({
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
    profile.status !== "ACTIVE"
  ) {
    redirect("/login");
  }

  const role = String(profile.role).toUpperCase();

  if (
    role !== "OWNER" &&
    role !== "MANAGER"
  ) {
    redirect("/dashboard/shifts/mine");
  }

  // ==========================================================
  // WEEK
  // ==========================================================

  const requestedDate = params?.date;

  const selectedDate =
    isValidDateString(requestedDate)
      ? requestedDate!
      : getJakartaDate();

  const weekStart =
    getMonday(selectedDate);

  const weekEnd =
    addDays(weekStart, 6);

  // ==========================================================
  // EMPLOYEES
  // ==========================================================

  const {
    data: employeesData,
    error: employeesError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      forum_name,
      seed,
      position,
      status
    `)
    .eq("status", "ACTIVE")
    .order("name", {
      ascending: true,
    });

  if (employeesError) {
    throw new Error(
      employeesError.message
    );
  }

  const employees =
    employeesData ?? [];

  // ==========================================================
  // SHIFT TYPES
  // ==========================================================

  const {
    data: shiftTypesData,
    error: shiftTypesError,
  } = await supabase
    .from("shift_types")
    .select(`
      id,
      name,
      start_time,
      end_time,
      sort_order
    `)
    .order("sort_order", {
      ascending: true,
    });

  if (shiftTypesError) {
    throw new Error(
      shiftTypesError.message
    );
  }

  const shiftTypes =
    shiftTypesData ?? [];

  // ==========================================================
  // SHIFT ASSIGNMENTS
  // ==========================================================

  const {
    data: assignmentsData,
    error: assignmentsError,
  } = await supabase
    .from("shift_assignments")
    .select(`
      id,
      employee_id,
      shift_type_id,
      shift_date,
      note,
      employees (
        id,
        name,
        forum_name,
        seed,
        position,
        status
      ),
      shift_types (
        id,
        name,
        start_time,
        end_time,
        sort_order
      )
    `)
    .gte(
      "shift_date",
      weekStart
    )
    .lte(
      "shift_date",
      weekEnd
    )
    .order("shift_date", {
      ascending: true,
    });

  if (assignmentsError) {
    throw new Error(
      assignmentsError.message
    );
  }

  const assignments =
    assignmentsData ?? [];

  // ==========================================================
  // STATS
  // ==========================================================

  const scheduledEmployeeIds =
    new Set(
      assignments.map(
        (item) =>
          item.employee_id
      )
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            Management
          </p>

          <h1 className="mt-1 depth-title text-3xl font-bold text-white">
            Jadwal / Shift
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Atur jadwal kerja pegawai Jackson Farm.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/shifts/admin?date=${addDays(
              weekStart,
              -7
            )}`}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-emerald-950/25"
          >
            ← Minggu Sebelumnya
          </Link>

          <Link
            href="/dashboard/shifts/admin"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-emerald-950/25"
          >
            Minggu Ini
          </Link>

          <Link
            href={`/dashboard/shifts/admin?date=${addDays(
              weekStart,
              7
            )}`}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:bg-emerald-950/25"
          >
            Minggu Berikutnya →
          </Link>
        </div>
      </div>

      {/* MESSAGE */}

      {params?.success && (
        <div className="rounded-xl border border-green-900 bg-green-950/20 px-5 py-4 text-sm text-green-400">
          {params.success}
        </div>
      )}

      {params?.error && (
        <div className="rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm text-red-400">
          {params.error}
        </div>
      )}

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Pegawai Aktif"
          value={String(
            employees.length
          )}
          description="Pegawai aktif"
        />

        <StatCard
          title="Jadwal Minggu Ini"
          value={String(
            assignments.length
          )}
          description="Total assignment"
        />

        <StatCard
          title="Pegawai Terjadwal"
          value={String(
            scheduledEmployeeIds.size
          )}
          description="Sudah punya shift"
        />

        <StatCard
          title="Jenis Shift"
          value={String(
            shiftTypes.length
          )}
          description="Shift tersedia"
        />
      </div>

      {/* ASSIGN SHIFT */}

      <section className="glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-5">
          <h2 className="text-lg font-semibold text-white">
            Assign Shift
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Jika pegawai sudah memiliki jadwal pada tanggal yang
            sama, shift akan otomatis diperbarui.
          </p>
        </div>

        <form
          action={saveShift}
          className="grid gap-5 p-6 lg:grid-cols-2"
        >
          <input
            type="hidden"
            name="return_date"
            value={selectedDate}
          />

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Pegawai
            </label>

            <select
              name="employee_id"
              required
              defaultValue=""
              className="w-full depth-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
            >
              <option
                value=""
                disabled
              >
                Pilih pegawai
              </option>

              {employees.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name} — {employee.seed}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Jenis Shift
            </label>

            <select
              name="shift_type_id"
              required
              defaultValue=""
              className="w-full depth-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
            >
              <option
                value=""
                disabled
              >
                Pilih shift
              </option>

              {shiftTypes.map(
                (shift) => (
                  <option
                    key={shift.id}
                    value={shift.id}
                  >
                    {shift.name}
                    {shift.start_time &&
                    shift.end_time
                      ? ` (${formatTime(
                          shift.start_time
                        )} - ${formatTime(
                          shift.end_time
                        )})`
                      : ""}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Tanggal
            </label>

            <input
              type="date"
              name="shift_date"
              required
              defaultValue={getJakartaDate()}
              className="w-full depth-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Catatan
            </label>

            <input
              type="text"
              name="note"
              placeholder="Contoh: Farming Pagi"
              className="w-full depth-input rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      </section>

      {/* WEEK */}

      <section className="glass-panel depth-card rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wide text-zinc-600">
          Minggu
        </p>

        <p className="mt-2 depth-number text-xl font-bold text-white">
          {formatDate(
            weekStart
          )}
          {" - "}
          {formatDate(
            weekEnd
          )}
        </p>
      </section>

      {/* SCHEDULE */}

      <section className="overflow-hidden glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-5">
          <h2 className="font-semibold text-white">
            Jadwal Pegawai
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Semua jadwal pada minggu yang dipilih.
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-zinc-600">
              Belum ada jadwal pada minggu ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="border-b border-emerald-500/10 bg-zinc-950/50">
                <tr>
                  <TableHead>
                    Tanggal
                  </TableHead>

                  <TableHead>
                    Pegawai
                  </TableHead>

                  <TableHead>
                    Seed
                  </TableHead>

                  <TableHead>
                    Shift
                  </TableHead>

                  <TableHead>
                    Jam
                  </TableHead>

                  <TableHead>
                    Catatan
                  </TableHead>

                  <TableHead>
                    Aksi
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {assignments.map(
                  (assignment) => {
                    const employee =
                      getRelationObject(
                        assignment.employees
                      );

                    const shiftType =
                      getRelationObject(
                        assignment.shift_types
                      );

                    return (
                      <tr
                        key={assignment.id}
                        className="transition hover:bg-emerald-950/25/60"
                      >
                        <TableCell>
                          <div className="font-medium text-white">
                            {formatDate(
                              assignment.shift_date
                            )}
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            {formatDayName(
                              assignment.shift_date
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium text-white">
                            {employee?.name ??
                              "-"}
                          </div>

                          <div className="mt-1 text-xs text-zinc-600">
                            {employee?.forum_name ??
                              "-"}
                          </div>
                        </TableCell>

                        <TableCell>
                          <SeedBadge
                            seed={
                              employee?.seed ??
                              "-"
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <span className="font-medium text-zinc-200">
                            {shiftType?.name ??
                              "-"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-zinc-400">
                            {getShiftTime(
                              shiftType
                            )}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="text-zinc-500">
                            {assignment.note ||
                              "-"}
                          </span>
                        </TableCell>

                        <TableCell>
                          <form action={deleteShift}>
                            <input
                              type="hidden"
                              name="id"
                              value={assignment.id}
                            />

                            <input
                              type="hidden"
                              name="return_date"
                              value={selectedDate}
                            />

                            <button
                              type="submit"
                              className="rounded-lg border border-red-900 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-950/40"
                            >
                              Hapus
                            </button>
                          </form>
                        </TableCell>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SHIFT TYPES */}

      <section className="glass-panel depth-card rounded-2xl">
        <div className="border-b border-emerald-500/10 px-6 py-5">
          <h2 className="font-semibold text-white">
            Jenis Shift
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Shift yang tersedia di Jackson Farm.
          </p>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-5">
          {shiftTypes.map(
            (shift) => (
              <div
                key={shift.id}
                className="depth-surface rounded-xl p-4"
              >
                <p className="font-semibold text-white">
                  {shift.name}
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  {shift.start_time &&
                  shift.end_time
                    ? `${formatTime(
                        shift.start_time
                      )} - ${formatTime(
                        shift.end_time
                      )}`
                    : "Tidak ada jam khusus"}
                </p>
              </div>
            )
          )}

          {shiftTypes.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-zinc-600">
              Belum ada jenis shift.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// SAVE SHIFT
// ============================================================

async function saveShift(
  formData: FormData
) {
  "use server";

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  const role =
    String(
      profile?.role ?? ""
    ).toUpperCase();

  if (
    !profile ||
    profile.status !== "ACTIVE" ||
    (
      role !== "OWNER" &&
      role !== "MANAGER"
    )
  ) {
    redirect("/dashboard");
  }

  const employeeId =
    String(
      formData.get(
        "employee_id"
      ) ?? ""
    ).trim();

  const shiftTypeId =
    String(
      formData.get(
        "shift_type_id"
      ) ?? ""
    ).trim();

  const shiftDate =
    String(
      formData.get(
        "shift_date"
      ) ?? ""
    ).trim();

  const note =
    String(
      formData.get(
        "note"
      ) ?? ""
    ).trim();

  const returnDate =
    String(
      formData.get(
        "return_date"
      ) ?? ""
    ).trim();

  if (
    !employeeId ||
    !shiftTypeId ||
    !isValidDateString(
      shiftDate
    )
  ) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        "Data shift belum lengkap."
      )
    );
  }

  // ==========================================================
  // EMPLOYEE DATA
  // ==========================================================

  const {
    data: employee,
    error: employeeError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      seed
    `)
    .eq(
      "id",
      employeeId
    )
    .maybeSingle();

  if (
    employeeError ||
    !employee
  ) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        employeeError?.message ??
          "Pegawai tidak ditemukan."
      )
    );
  }

  // ==========================================================
  // SHIFT TYPE DATA
  // ==========================================================

  const {
    data: shiftType,
    error: shiftTypeError,
  } = await supabase
    .from("shift_types")
    .select(`
      id,
      name,
      start_time,
      end_time
    `)
    .eq(
      "id",
      shiftTypeId
    )
    .maybeSingle();

  if (
    shiftTypeError ||
    !shiftType
  ) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        shiftTypeError?.message ??
          "Jenis shift tidak ditemukan."
      )
    );
  }

  // ==========================================================
  // CHECK EXISTING
  // ==========================================================

  const {
    data: existing,
    error: checkError,
  } = await supabase
    .from("shift_assignments")
    .select(`
      id,
      shift_type_id,
      note,
      shift_types (
        id,
        name,
        start_time,
        end_time
      )
    `)
    .eq(
      "employee_id",
      employeeId
    )
    .eq(
      "shift_date",
      shiftDate
    )
    .maybeSingle();

  if (checkError) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        checkError.message
      )
    );
  }

  // ==========================================================
  // UPDATE EXISTING
  // ==========================================================

  if (existing) {
    const previousShiftType =
      getRelationObject(
        existing.shift_types
      );

    const {
      error: updateError,
    } = await supabase
      .from(
        "shift_assignments"
      )
      .update({
        shift_type_id:
          shiftTypeId,

        note:
          note || null,
      })
      .eq(
        "id",
        existing.id
      );

    if (updateError) {
      redirect(
        buildAdminUrl(
          returnDate,
          "error",
          updateError.message
        )
      );
    }

    await writeAuditLog({
      action:
        "SHIFT_UPDATE",

      entityType:
        "SHIFT",

      entityId:
        existing.id,

      description:
        `Mengubah shift ${employee.name} pada ${formatDate(
          shiftDate
        )}`,

      metadata: {
        employee_id:
          employee.id,

        employee_name:
          employee.name,

        seed:
          employee.seed,

        shift_date:
          shiftDate,

        previous_shift_type_id:
          existing.shift_type_id,

        previous_shift_name:
          previousShiftType?.name ??
          null,

        previous_start_time:
          previousShiftType?.start_time ??
          null,

        previous_end_time:
          previousShiftType?.end_time ??
          null,

        previous_note:
          existing.note,

        new_shift_type_id:
          shiftType.id,

        new_shift_name:
          shiftType.name,

        new_start_time:
          shiftType.start_time,

        new_end_time:
          shiftType.end_time,

        new_note:
          note || null,
      },
    });

    revalidatePath(
      "/dashboard/shifts"
    );

    revalidatePath(
      "/dashboard/shifts/admin"
    );

    revalidatePath(
      "/dashboard/shifts/mine"
    );

    revalidatePath(
      "/dashboard/audit-log"
    );

    redirect(
      buildAdminUrl(
        returnDate,
        "success",
        "Jadwal berhasil diperbarui."
      )
    );
  }

  // ==========================================================
  // INSERT NEW
  // ==========================================================

  const {
    data: inserted,
    error: insertError,
  } = await supabase
    .from(
      "shift_assignments"
    )
    .insert({
      employee_id:
        employeeId,

      shift_type_id:
        shiftTypeId,

      shift_date:
        shiftDate,

      note:
        note || null,
    })
    .select("id")
    .single();

  if (
    insertError ||
    !inserted
  ) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        insertError?.message ??
          "Gagal membuat jadwal."
      )
    );
  }

  await writeAuditLog({
    action:
      "SHIFT_ASSIGN",

    entityType:
      "SHIFT",

    entityId:
      inserted.id,

    description:
      `Memberikan shift ${shiftType.name} kepada ${employee.name}`,

    metadata: {
      employee_id:
        employee.id,

      employee_name:
        employee.name,

      seed:
        employee.seed,

      shift_date:
        shiftDate,

      shift_type_id:
        shiftType.id,

      shift_name:
        shiftType.name,

      start_time:
        shiftType.start_time,

      end_time:
        shiftType.end_time,

      note:
        note || null,
    },
  });

  revalidatePath(
    "/dashboard/shifts"
  );

  revalidatePath(
    "/dashboard/shifts/admin"
  );

  revalidatePath(
    "/dashboard/shifts/mine"
  );

  revalidatePath(
    "/dashboard/audit-log"
  );

  redirect(
    buildAdminUrl(
      returnDate,
      "success",
      "Jadwal berhasil ditambahkan."
    )
  );
}

// ============================================================
// DELETE SHIFT
// ============================================================

async function deleteShift(
  formData: FormData
) {
  "use server";

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: profile,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  const role =
    String(
      profile?.role ?? ""
    ).toUpperCase();

  if (
    !profile ||
    profile.status !== "ACTIVE" ||
    (
      role !== "OWNER" &&
      role !== "MANAGER"
    )
  ) {
    redirect("/dashboard");
  }

  const id =
    String(
      formData.get("id") ??
        ""
    ).trim();

  const returnDate =
    String(
      formData.get(
        "return_date"
      ) ?? ""
    ).trim();

  if (!id) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        "ID shift tidak ditemukan."
      )
    );
  }

  // ==========================================================
  // GET DATA BEFORE DELETE
  // ==========================================================

  const {
    data: existingShift,
    error: existingError,
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

      employees (
        id,
        name,
        seed
      ),

      shift_types (
        id,
        name,
        start_time,
        end_time
      )
    `)
    .eq(
      "id",
      id
    )
    .maybeSingle();

  if (existingError) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        existingError.message
      )
    );
  }

  if (!existingShift) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        "Jadwal tidak ditemukan."
      )
    );
  }

  const employee =
    getRelationObject(
      existingShift.employees
    );

  const shiftType =
    getRelationObject(
      existingShift.shift_types
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const {
    error: deleteError,
  } = await supabase
    .from(
      "shift_assignments"
    )
    .delete()
    .eq(
      "id",
      id
    );

  if (deleteError) {
    redirect(
      buildAdminUrl(
        returnDate,
        "error",
        deleteError.message
      )
    );
  }

  // ==========================================================
  // AUDIT LOG
  // ==========================================================

  await writeAuditLog({
    action:
      "SHIFT_DELETE",

    entityType:
      "SHIFT",

    entityId:
      id,

    description:
      `Menghapus shift ${shiftType?.name ?? ""} milik ${
        employee?.name ?? "pegawai"
      }`,

    metadata: {
      employee_id:
        existingShift.employee_id,

      employee_name:
        employee?.name ??
        null,

      seed:
        employee?.seed ??
        null,

      shift_date:
        existingShift.shift_date,

      shift_type_id:
        existingShift.shift_type_id,

      shift_name:
        shiftType?.name ??
        null,

      start_time:
        shiftType?.start_time ??
        null,

      end_time:
        shiftType?.end_time ??
        null,

      note:
        existingShift.note,
    },
  });

  revalidatePath(
    "/dashboard/shifts"
  );

  revalidatePath(
    "/dashboard/shifts/admin"
  );

  revalidatePath(
    "/dashboard/shifts/mine"
  );

  revalidatePath(
    "/dashboard/audit-log"
  );

  redirect(
    buildAdminUrl(
      returnDate,
      "success",
      "Jadwal berhasil dihapus."
    )
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

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-600">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <td className="px-6 py-4 text-sm">
      {children}
    </td>
  );
}

function SeedBadge({
  seed,
}: {
  seed: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
      {seed}
    </span>
  );
}

// ============================================================
// RELATION HELPERS
// ============================================================

function getRelationObject(
  value: any
) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function getShiftTime(
  shift: any
) {
  if (
    !shift ||
    !shift.start_time ||
    !shift.end_time
  ) {
    return "-";
  }

  return `${formatTime(
    shift.start_time
  )} - ${formatTime(
    shift.end_time
  )}`;
}

// ============================================================
// URL
// ============================================================

function buildAdminUrl(
  date: string,
  type:
    | "success"
    | "error",
  message: string
) {
  const params =
    new URLSearchParams();

  if (
    isValidDateString(date)
  ) {
    params.set(
      "date",
      date
    );
  }

  params.set(
    type,
    message
  );

  return `/dashboard/shifts/admin?${params.toString()}`;
}

// ============================================================
// DATE HELPERS
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
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        "day"
    )?.value;

  return `${year}-${month}-${day}`;
}

function isValidDateString(
  value?: string
) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}

function parseDate(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function toDateString(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}

function getMonday(
  dateString: string
) {
  const date =
    parseDate(
      dateString
    );

  const day =
    date.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  date.setDate(
    date.getDate() +
      difference
  );

  return toDateString(
    date
  );
}

function addDays(
  dateString: string,
  amount: number
) {
  const date =
    parseDate(
      dateString
    );

  date.setDate(
    date.getDate() +
      amount
  );

  return toDateString(
    date
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(
    parseDate(value)
  );
}

function formatDayName(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      weekday:
        "long",
    }
  ).format(
    parseDate(value)
  );
}

function formatTime(
  value: string
) {
  return value.slice(
    0,
    5
  );
}