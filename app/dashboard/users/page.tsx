import { createClient } from "@/lib/supabase/server";
import UserForm from "./user-form";
import UserActions from "./user-actions";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  position: string | null;
  status: string;
};

type Employee = {
  id: string;
  name: string;
  seed: string;
  profile_id: string | null;
};

export default async function UsersPage() {
  const supabase =
    await createClient();

  // =========================================================
  // CURRENT USER
  // =========================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // =========================================================
  // OWNER CHECK
  // =========================================================

  const {
    data: currentProfile,
    error: currentProfileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      status
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfileError) {
    throw new Error(
      currentProfileError.message
    );
  }

  if (
    !currentProfile ||
    currentProfile.role !== "OWNER" ||
    currentProfile.status !== "ACTIVE"
  ) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/20 p-6">
        <h1 className="text-lg font-bold text-red-400">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-red-300">
          Hanya OWNER yang dapat membuka User Management.
        </p>
      </div>
    );
  }

  // =========================================================
  // PROFILES
  // =========================================================

  const {
    data: profilesData,
    error: profilesError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      position,
      status
    `)
    .order(
      "full_name",
      {
        ascending: true,
      }
    );

  if (profilesError) {
    throw new Error(
      profilesError.message
    );
  }

  const profiles =
    (profilesData ??
      []) as Profile[];

  // =========================================================
  // EMPLOYEES
  // =========================================================

  const {
    data: employeesData,
    error: employeesError,
  } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      seed,
      profile_id
    `)
    .order(
      "name",
      {
        ascending: true,
      }
    );

  if (employeesError) {
    throw new Error(
      employeesError.message
    );
  }

  const employees =
    (employeesData ??
      []) as Employee[];

  // =========================================================
  // EMPLOYEE MAP
  // =========================================================

  const employeeByProfile =
    new Map(
      employees
        .filter(
          (employee) =>
            employee.profile_id
        )
        .map(
          (employee) => [
            employee.profile_id!,
            employee,
          ]
        )
    );

  // =========================================================
  // SUMMARY
  // =========================================================

  const ownerCount =
    profiles.filter(
      (profile) =>
        profile.role === "OWNER"
    ).length;

  const managerCount =
    profiles.filter(
      (profile) =>
        profile.role === "MANAGER"
    ).length;

  const employeeCount =
    profiles.filter(
      (profile) =>
        profile.role === "EMPLOYEE"
    ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <p className="text-xs text-zinc-500">
          Administration
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white">
          User Management
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Kelola akun login dan role Jackson Farm.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total User"
          value={
            profiles.length
          }
        />

        <StatCard
          title="Owner"
          value={
            ownerCount
          }
        />

        <StatCard
          title="Manager"
          value={
            managerCount
          }
        />

        <StatCard
          title="Employee"
          value={
            employeeCount
          }
        />
      </div>

      {/* CREATE USER */}

      <UserForm
        employees={
          employees
        }
      />

      {/* USER TABLE */}

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Daftar User
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Akun yang dapat login ke Jackson Farm.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-4">
                  User
                </th>

                <th className="px-5 py-4">
                  Role
                </th>

                <th className="px-5 py-4">
                  Position
                </th>

                <th className="px-5 py-4">
                  Employee
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4 text-right">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {profiles.map(
                (profile) => {
                  const employee =
                    employeeByProfile.get(
                      profile.id
                    );

                  return (
                    <tr
                      key={
                        profile.id
                      }
                      className="transition hover:bg-zinc-900/40"
                    >
                      {/* USER */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">
                          {profile.full_name ??
                            "Unnamed"}
                        </p>

                        <p className="mt-1 font-mono text-xs text-zinc-700">
                          {
                            profile.id
                          }
                        </p>
                      </td>

                      {/* ROLE */}

                      <td className="px-5 py-4">
                        <RoleBadge
                          role={
                            profile.role
                          }
                        />
                      </td>

                      {/* POSITION */}

                      <td className="px-5 py-4 text-zinc-400">
                        {profile.position ??
                          "-"}
                      </td>

                      {/* EMPLOYEE */}

                      <td className="px-5 py-4">
                        {employee ? (
                          <>
                            <p className="font-medium text-zinc-200">
                              {
                                employee.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-600">
                              {
                                employee.seed
                              }
                            </p>
                          </>
                        ) : (
                          <span className="text-zinc-700">
                            -
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            profile.status
                          }
                        />
                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-4 text-right">
                        <UserActions
                          userId={
                            profile.id
                          }
                          userName={
                            profile.full_name ??
                            "User"
                          }
                          currentUserId={
                            user.id
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// ROLE BADGE
// =========================================================

function RoleBadge({
  role,
}: {
  role: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-300";

  if (
    role === "OWNER"
  ) {
    style =
      "border-purple-900 bg-purple-950/30 text-purple-400";
  }

  if (
    role === "MANAGER"
  ) {
    style =
      "border-blue-900 bg-blue-950/30 text-blue-400";
  }

  if (
    role === "EMPLOYEE"
  ) {
    style =
      "border-green-900 bg-green-950/30 text-green-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {role}
    </span>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const style =
    status === "ACTIVE"
      ? "border-green-900 bg-green-950/30 text-green-400"
      : "border-red-900 bg-red-950/30 text-red-400";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}