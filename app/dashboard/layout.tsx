import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

type MenuItem = {
  label: string;
  href: string;
};

// ============================================================
// OWNER MENUS
// ============================================================

const ownerMainMenus: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
];

const ownerEmployeeMenus: MenuItem[] = [
  {
    label: "Data Pegawai",
    href: "/dashboard/employees",
  },
  {
    label: "Lamaran Kerja",
    href: "/dashboard/applications",
  },
  {
    label: "Jadwal / Shift",
    href: "/dashboard/shifts",
  },
  {
    label: "Target Pegawai",
    href: "/dashboard/targets",
  },
];

const ownerReportMenus: MenuItem[] = [
  {
    label: "Load Plant / Lumbung",
    href: "/dashboard/storage-reports",
  },
  {
    label: "Penjualan",
    href: "/dashboard/sales",
  },
  {
    label: "Laporan SSRP",
    href: "/dashboard/ssrp",
  },
];

const ownerManagementMenus: MenuItem[] = [
  {
    label: "Rekap",
    href: "/dashboard/recap",
  },
  {
    label: "Gaji",
    href: "/dashboard/salary",
  },
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
  },
];

const ownerAdminMenus: MenuItem[] = [
  {
    label: "User Management",
    href: "/dashboard/users",
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit-log",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
  },
];

// ============================================================
// MANAGER MENUS
// ============================================================

const managerMainMenus: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
];

const managerEmployeeMenus: MenuItem[] = [
  {
    label: "Data Pegawai",
    href: "/dashboard/employees",
  },
  {
    label: "Jadwal / Shift",
    href: "/dashboard/shifts",
  },
  {
    label: "Target Pegawai",
    href: "/dashboard/targets",
  },
];

const managerReportMenus: MenuItem[] = [
  {
    label: "Load Plant / Lumbung",
    href: "/dashboard/storage-reports",
  },
  {
    label: "Penjualan",
    href: "/dashboard/sales",
  },
  {
    label: "Laporan SSRP",
    href: "/dashboard/ssrp",
  },
];

const managerManagementMenus: MenuItem[] = [
  {
    label: "Rekap",
    href: "/dashboard/recap",
  },
  {
    label: "Gaji Saya",
    href: "/dashboard/salary/mine",
  },
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
  },
];

// ============================================================
// EMPLOYEE MENUS
// ============================================================

const employeeMainMenus: MenuItem[] = [
  {
    label: "Dashboard Saya",
    href: "/dashboard",
  },
];

const employeeWorkMenus: MenuItem[] = [
  {
    label: "Jadwal Saya",
    href: "/dashboard/shifts",
  },
  {
    label: "Target Saya",
    href: "/dashboard/targets/mine",
  },
  {
    label: "Gaji Saya",
    href: "/dashboard/salary/mine",
  },
];

const employeeReportMenus: MenuItem[] = [
  {
    label: "Kirim Load Plant",
    href: "/dashboard/storage-reports/submit",
  },
  {
    label: "Riwayat Load Plant Saya",
    href: "/dashboard/storage-reports/mine",
  },
  {
    label: "Kirim SSRP",
    href: "/dashboard/ssrp/create",
  },
  {
    label: "Riwayat SSRP Saya",
    href: "/dashboard/ssrp/mine",
  },
];

const employeeInfoMenus: MenuItem[] = [
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
  },
];

// ============================================================
// LAYOUT
// ============================================================

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // =========================================================
  // PROFILE
  // =========================================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      position,
      status
    `)
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    redirect("/login");
  }

  if (
    String(
      profile.status ?? ""
    ).toUpperCase() !==
    "ACTIVE"
  ) {
    redirect("/login");
  }

  const role =
    String(
      profile.role ?? ""
    ).toUpperCase();

  const isOwner =
    role === "OWNER";

  const isManager =
    role === "MANAGER";

  const isEmployee =
    role === "EMPLOYEE";

  // =========================================================
  // LINKED EMPLOYEE
  //
  // Employee + Manager sama-sama mempunyai row employees.
  // Manager dibutuhkan untuk SSRP, salary, dan data pegawai.
  // =========================================================

  let linkedEmployee:
    | {
        id: string;
        name: string;
        seed: string | null;
        position: string | null;
        status: string;
      }
    | null =
      null;

  if (
    isEmployee ||
    isManager
  ) {
    const {
      data:
        employeeData,
    } = await supabase
      .from("employees")
      .select(`
        id,
        name,
        seed,
        position,
        status
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

    linkedEmployee =
      employeeData ??
      null;
  }

  // =========================================================
  // SIDEBAR
  // =========================================================

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex min-h-screen">
        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="hidden h-screen w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:sticky lg:top-0 lg:flex lg:flex-col">
          {/* BRAND */}

          <div className="border-b border-zinc-800 px-6 py-6">
            <h1 className="text-xl font-bold">
              Jackson Farm
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Management System
            </p>
          </div>

          {/* MENU */}

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            {/* =================================================
                OWNER
            ================================================= */}

            {isOwner && (
              <>
                <MenuGroup
                  items={
                    ownerMainMenus
                  }
                />

                <MenuTitle
                  title="PEGAWAI"
                />

                <MenuGroup
                  items={
                    ownerEmployeeMenus
                  }
                />

                <MenuTitle
                  title="LAPORAN"
                />

                <MenuGroup
                  items={
                    ownerReportMenus
                  }
                />

                <MenuTitle
                  title="MANAGEMENT"
                />

                <MenuGroup
                  items={
                    ownerManagementMenus
                  }
                />

                <MenuTitle
                  title="ADMINISTRATION"
                />

                <MenuGroup
                  items={
                    ownerAdminMenus
                  }
                />
              </>
            )}

            {/* =================================================
                MANAGER
            ================================================= */}

            {isManager && (
              <>
                <MenuGroup
                  items={
                    managerMainMenus
                  }
                />

                <MenuTitle
                  title="PEGAWAI"
                />

                <MenuGroup
                  items={
                    managerEmployeeMenus
                  }
                />

                <MenuTitle
                  title="LAPORAN"
                />

                <MenuGroup
                  items={
                    managerReportMenus
                  }
                />

                <MenuTitle
                  title="MANAGEMENT"
                />

                <MenuGroup
                  items={
                    managerManagementMenus
                  }
                />
              </>
            )}

            {/* =================================================
                EMPLOYEE
            ================================================= */}

            {isEmployee && (
              <>
                <MenuGroup
                  items={
                    employeeMainMenus
                  }
                />

                <MenuTitle
                  title="PEKERJAAN SAYA"
                />

                <MenuGroup
                  items={
                    employeeWorkMenus
                  }
                />

                <MenuTitle
                  title="LAPORAN SAYA"
                />

                <MenuGroup
                  items={
                    employeeReportMenus
                  }
                />

                <MenuTitle
                  title="INFORMASI"
                />

                <MenuGroup
                  items={
                    employeeInfoMenus
                  }
                />
              </>
            )}
          </nav>

          {/* ===================================================
              PROFILE
          =================================================== */}

          <div className="border-t border-zinc-800 p-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="truncate text-sm font-semibold">
                {profile.full_name}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {role}
              </p>

              {linkedEmployee && (
                <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-xs font-medium text-zinc-300">
                    {
                      linkedEmployee.name
                    }
                  </p>

                  <p className="mt-1 text-[11px] text-zinc-600">
                    {
                      linkedEmployee.seed ??
                      "-"
                    }

                    {" • "}

                    {
                      linkedEmployee
                        .status
                    }
                  </p>
                </div>
              )}

              <div className="mt-4">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* ===================================================
            MAIN
        =================================================== */}

        <div className="min-w-0 flex-1">
          {/* HEADER */}

          <header className="border-b border-zinc-800 bg-zinc-950/90">
            <div className="flex items-center justify-between px-6 py-4 lg:px-8">
              <div>
                <p className="text-sm font-semibold">
                  Jackson Farm
                </p>

                <p className="text-xs text-zinc-500">
                  {
                    isEmployee
                      ? "Employee Portal"
                      : isManager
                        ? "Manager Portal"
                        : "Internal Management System"
                  }
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {
                      profile.full_name
                    }
                  </p>

                  <p className="text-xs text-zinc-500">
                    {role}
                  </p>
                </div>

                <div className="lg:hidden">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>

          {/* PAGE */}

          <main className="px-6 py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MENU TITLE
// ============================================================

function MenuTitle({
  title,
}: {
  title: string;
}) {
  return (
    <p className="mb-2 mt-7 px-3 text-[11px] font-semibold tracking-widest text-zinc-600">
      {title}
    </p>
  );
}

// ============================================================
// MENU GROUP
// ============================================================

function MenuGroup({
  items,
}: {
  items: MenuItem[];
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          className="block rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}