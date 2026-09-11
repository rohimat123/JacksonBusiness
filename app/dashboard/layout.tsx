import Link from "next/link";
import { redirect } from "next/navigation";

import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  HandCoins,
  Info,
  LayoutDashboard,
  Menu,
  PackageOpen,
  ScrollText,
  Settings,
  Sprout,
  Target,
  UserCog,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import LogoutButton from "./logout-button";

// ============================================================
// TYPE
// ============================================================

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

// ============================================================
// OWNER MENUS
// ============================================================

const ownerMainMenus: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const ownerEmployeeMenus: MenuItem[] = [
  {
    label: "Data Pegawai",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    label: "Lamaran Kerja",
    href: "/dashboard/applications",
    icon: BriefcaseBusiness,
  },
  {
    label: "Jadwal / Shift",
    href: "/dashboard/shifts",
    icon: CalendarDays,
  },
  {
    label: "Target Pegawai",
    href: "/dashboard/targets",
    icon: Target,
  },
];

const ownerReportMenus: MenuItem[] = [
  {
    label: "Load Plant / Lumbung",
    href: "/dashboard/storage-reports",
    icon: PackageOpen,
  },
  {
    label: "Penjualan",
    href: "/dashboard/sales",
    icon: BarChart3,
  },
  {
    label: "Laporan SSRP",
    href: "/dashboard/ssrp",
    icon: FileText,
  },
];

const ownerManagementMenus: MenuItem[] = [
  {
    label: "Rekap",
    href: "/dashboard/recap",
    icon: ClipboardList,
  },
  {
    label: "Gaji",
    href: "/dashboard/salary",
    icon: WalletCards,
  },
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
    icon: Info,
  },
];

const ownerAdminMenus: MenuItem[] = [
  {
    label: "User Management",
    href: "/dashboard/users",
    icon: UserCog,
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit-log",
    icon: ScrollText,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

// ============================================================
// MANAGER MENUS
// ============================================================

const managerMainMenus: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const managerEmployeeMenus: MenuItem[] = [
  {
    label: "Data Pegawai",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    label: "Jadwal / Shift",
    href: "/dashboard/shifts",
    icon: CalendarDays,
  },
  {
    label: "Target Pegawai",
    href: "/dashboard/targets",
    icon: Target,
  },
];

const managerReportMenus: MenuItem[] = [
  {
    label: "Load Plant / Lumbung",
    href: "/dashboard/storage-reports",
    icon: PackageOpen,
  },
  {
    label: "Penjualan",
    href: "/dashboard/sales",
    icon: BarChart3,
  },
  {
    label: "Laporan SSRP",
    href: "/dashboard/ssrp",
    icon: FileText,
  },
];

const managerManagementMenus: MenuItem[] = [
  {
    label: "Rekap",
    href: "/dashboard/recap",
    icon: ClipboardList,
  },
  {
    label: "Gaji Saya",
    href: "/dashboard/salary/mine",
    icon: HandCoins,
  },
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
    icon: Info,
  },
];

// ============================================================
// EMPLOYEE MENUS
// ============================================================

const employeeMainMenus: MenuItem[] = [
  {
    label: "Dashboard Saya",
    href: "/dashboard",
    icon: Gauge,
  },
];

const employeeWorkMenus: MenuItem[] = [
  {
    label: "Jadwal Saya",
    href: "/dashboard/shifts",
    icon: CalendarDays,
  },
  {
    label: "Target Saya",
    href: "/dashboard/targets/mine",
    icon: Target,
  },
  {
    label: "Gaji Saya",
    href: "/dashboard/salary/mine",
    icon: HandCoins,
  },
];

const employeeReportMenus: MenuItem[] = [
  {
    label: "Kirim Load Plant",
    href: "/dashboard/storage-reports/submit",
    icon: Sprout,
  },
  {
    label: "Riwayat Load Plant Saya",
    href: "/dashboard/storage-reports/mine",
    icon: Database,
  },
  {
    label: "Kirim SSRP",
    href: "/dashboard/ssrp/create",
    icon: FileText,
  },
  {
    label: "Riwayat SSRP Saya",
    href: "/dashboard/ssrp/mine",
    icon: ScrollText,
  },
];

const employeeInfoMenus: MenuItem[] = [
  {
    label: "Informasi & Rules",
    href: "/dashboard/information",
    icon: Info,
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
    error: profileError,
  } =
    await supabase
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

  // ==========================================================
  // LINKED EMPLOYEE
  // ==========================================================

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
    } =
      await supabase
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

  // ==========================================================
  // MOBILE MENU SECTIONS
  // ==========================================================

  const mobileSections: MenuSection[] =
    isOwner
      ? [
          {
            items:
              ownerMainMenus,
          },
          {
            title:
              "PEGAWAI",
            items:
              ownerEmployeeMenus,
          },
          {
            title:
              "LAPORAN",
            items:
              ownerReportMenus,
          },
          {
            title:
              "MANAGEMENT",
            items:
              ownerManagementMenus,
          },
          {
            title:
              "ADMINISTRATION",
            items:
              ownerAdminMenus,
          },
        ]
      : isManager
        ? [
            {
              items:
                managerMainMenus,
            },
            {
              title:
                "PEGAWAI",
              items:
                managerEmployeeMenus,
            },
            {
              title:
                "LAPORAN",
              items:
                managerReportMenus,
            },
            {
              title:
                "MANAGEMENT",
              items:
                managerManagementMenus,
            },
          ]
        : [
            {
              items:
                employeeMainMenus,
            },
            {
              title:
                "PEKERJAAN SAYA",
              items:
                employeeWorkMenus,
            },
            {
              title:
                "LAPORAN SAYA",
              items:
                employeeReportMenus,
            },
            {
              title:
                "INFORMASI",
              items:
                employeeInfoMenus,
            },
          ];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="dashboard-shell min-h-screen text-white">
      <div className="flex min-h-screen">

        {/* ====================================================
            DESKTOP SIDEBAR
        ==================================================== */}

        <aside
          className="
            hidden
            h-screen
            w-72
            shrink-0
            border-r
            border-emerald-500/15
            bg-[#03100d]/90
            backdrop-blur-2xl
            lg:sticky
            lg:top-0
            lg:flex
            lg:flex-col
          "
        >
          {/* BRAND */}

          <div className="border-b border-emerald-500/15 px-5 py-5">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-emerald-400/25
                  bg-gradient-to-br
                  from-emerald-500/20
                  to-emerald-950/60
                  shadow-[0_0_25px_rgba(16,185,129,0.12)]
                "
              >
                <Sprout
                  size={26}
                  className="text-emerald-300"
                />
              </div>

              <div>
                <h1 className="text-lg font-bold">
                  Jackson Farm
                </h1>

                <p className="mt-0.5 text-[11px] text-emerald-100/35">
                  Management System
                </p>
              </div>
            </div>
          </div>

          {/* MENU */}

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {isOwner && (
              <>
                <MenuGroup
                  items={
                    ownerMainMenus
                  }
                />

                <MenuTitle title="PEGAWAI" />

                <MenuGroup
                  items={
                    ownerEmployeeMenus
                  }
                />

                <MenuTitle title="LAPORAN" />

                <MenuGroup
                  items={
                    ownerReportMenus
                  }
                />

                <MenuTitle title="MANAGEMENT" />

                <MenuGroup
                  items={
                    ownerManagementMenus
                  }
                />

                <MenuTitle title="ADMINISTRATION" />

                <MenuGroup
                  items={
                    ownerAdminMenus
                  }
                />
              </>
            )}

            {isManager && (
              <>
                <MenuGroup
                  items={
                    managerMainMenus
                  }
                />

                <MenuTitle title="PEGAWAI" />

                <MenuGroup
                  items={
                    managerEmployeeMenus
                  }
                />

                <MenuTitle title="LAPORAN" />

                <MenuGroup
                  items={
                    managerReportMenus
                  }
                />

                <MenuTitle title="MANAGEMENT" />

                <MenuGroup
                  items={
                    managerManagementMenus
                  }
                />
              </>
            )}

            {isEmployee && (
              <>
                <MenuGroup
                  items={
                    employeeMainMenus
                  }
                />

                <MenuTitle title="PEKERJAAN SAYA" />

                <MenuGroup
                  items={
                    employeeWorkMenus
                  }
                />

                <MenuTitle title="LAPORAN SAYA" />

                <MenuGroup
                  items={
                    employeeReportMenus
                  }
                />

                <MenuTitle title="INFORMASI" />

                <MenuGroup
                  items={
                    employeeInfoMenus
                  }
                />
              </>
            )}
          </nav>

          {/* PROFILE */}

          <div className="border-t border-emerald-500/15 p-3">
            <div
              className="
                rounded-2xl
                border
                border-emerald-500/20
                bg-gradient-to-br
                from-emerald-950/45
                to-black/20
                p-4
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-emerald-400/25
                    bg-emerald-500/10
                    font-bold
                    text-emerald-300
                  "
                >
                  {String(
                    profile.full_name ??
                    "J"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {
                      profile.full_name
                    }
                  </p>

                  <p className="mt-0.5 text-[11px] text-emerald-400/70">
                    {role}
                  </p>
                </div>
              </div>

              {linkedEmployee && (
                <div className="mt-3 rounded-xl border border-emerald-900/40 bg-black/20 px-3 py-2.5">
                  <p className="truncate text-xs text-zinc-300">
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
                      linkedEmployee.status
                    }
                  </p>
                </div>
              )}

              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================
            MAIN
        ==================================================== */}

        <div className="min-w-0 flex-1">

          {/* ==================================================
              HEADER
          ================================================== */}

          <header
            className="
              sticky
              top-0
              z-40
              border-b
              border-emerald-500/15
              bg-[#03110d]/75
              backdrop-blur-xl
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                -z-10
                bg-gradient-to-r
                from-emerald-950/40
                via-emerald-700/10
                to-transparent
              "
            />

            <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    border
                    border-emerald-400/20
                    bg-emerald-500/10
                  "
                >
                  <Sprout
                    size={18}
                    className="text-emerald-300"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Jackson Farm
                  </p>

                  <p className="mt-0.5 text-xs text-zinc-500">
                    {
                      isEmployee
                        ? "Employee Portal"
                        : isManager
                          ? "Manager Portal"
                          : "Internal Management System"
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">

                {/* MOBILE SIDEBAR */}

                <MobileSidebar
                  sections={
                    mobileSections
                  }
                  fullName={
                    String(
                      profile.full_name ??
                      "Jackson Farm"
                    )
                  }
                  role={
                    role
                  }
                />

                {/* DESKTOP NAME */}

                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold">
                    {
                      profile.full_name
                    }
                  </p>

                  <p className="text-xs text-emerald-400/60">
                    {role}
                  </p>
                </div>

                {/* AVATAR */}

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-full
                    border
                    border-emerald-400/25
                    bg-emerald-500/10
                    text-sm
                    font-bold
                    text-emerald-300
                  "
                >
                  {String(
                    profile.full_name ??
                    "J"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                {/* MOBILE LOGOUT */}

                <div className="lg:hidden">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </header>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <main className="relative px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="pointer-events-none absolute right-[8%] top-0 -z-10 h-80 w-96 rounded-full bg-emerald-400/5 blur-[120px]" />

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
    <p
      className="
        mb-2
        mt-6
        px-3
        text-[10px]
        font-semibold
        tracking-[0.18em]
        text-emerald-300/35
      "
    >
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
      {items.map(
        (item) => {
          const Icon =
            item.icon;

          return (
            <Link
              key={
                item.href
              }
              href={
                item.href
              }
              prefetch={
                false
              }
              className="
                group
                flex
                items-center
                gap-3
                rounded-xl
                border
                border-transparent
                px-3
                py-2.5
                text-sm
                text-zinc-400
                transition-all
                duration-200
                hover:border-emerald-400/20
                hover:bg-gradient-to-r
                hover:from-emerald-500/15
                hover:to-emerald-950/10
                hover:text-white
                hover:shadow-[0_0_22px_rgba(16,185,129,0.06)]
              "
            >
              <Icon
                size={16}
                strokeWidth={1.8}
                className="
                  shrink-0
                  text-zinc-500
                  transition
                  group-hover:text-emerald-300
                "
              />

              <span>
                {
                  item.label
                }
              </span>
            </Link>
          );
        }
      )}
    </div>
  );
}

// ============================================================
// MOBILE SIDEBAR
//
// NOTE:
// Komponen ini sengaja ada dalam layout yang sama.
// Agar useState bisa digunakan tanpa menjadikan seluruh layout
// Client Component, kita memakai CSS checkbox toggle.
// ============================================================

function MobileSidebar({
  sections,
  fullName,
  role,
}: {
  sections: MenuSection[];
  fullName: string;
  role: string;
}) {
  const toggleId =
    "jackson-mobile-menu";

  return (
    <div className="lg:hidden">
      {/* HIDDEN TOGGLE */}

      <input
        id={
          toggleId
        }
        type="checkbox"
        className="peer hidden"
      />

      {/* HAMBURGER */}

      <label
        htmlFor={
          toggleId
        }
        aria-label="Buka menu"
        className="
          flex
          h-10
          w-10
          cursor-pointer
          items-center
          justify-center
          rounded-xl
          border
          border-emerald-400/25
          bg-emerald-500/10
          text-emerald-300
          transition
          hover:bg-emerald-500/20
        "
      >
        <Menu size={20} />
      </label>

      {/* OVERLAY */}

      <label
        htmlFor={
          toggleId
        }
        className="
          pointer-events-none
          fixed
          inset-0
          z-[90]
          cursor-pointer
          bg-black/70
          opacity-0
          backdrop-blur-sm
          transition-opacity
          duration-300

          peer-checked:pointer-events-auto
          peer-checked:opacity-100
        "
      />

      {/* DRAWER */}

      <aside
        className="
          fixed
          bottom-0
          left-0
          top-0
          z-[100]
          flex
          w-[290px]
          max-w-[85vw]
          -translate-x-full
          flex-col
          border-r
          border-emerald-500/20
          bg-[#03100d]/98
          shadow-[20px_0_60px_rgba(0,0,0,0.55)]
          backdrop-blur-2xl
          transition-transform
          duration-300
          ease-out

          peer-checked:translate-x-0
        "
      >
        {/* BRAND */}

        <div className="flex items-center justify-between border-b border-emerald-500/15 px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-emerald-400/25
                bg-gradient-to-br
                from-emerald-500/20
                to-emerald-950/60
              "
            >
              <Sprout
                size={23}
                className="text-emerald-300"
              />
            </div>

            <div>
              <p className="font-bold">
                Jackson Farm
              </p>

              <p className="text-[11px] text-emerald-100/35">
                Management System
              </p>
            </div>
          </div>

          <label
            htmlFor={
              toggleId
            }
            aria-label="Tutup menu"
            className="
              flex
              h-9
              w-9
              cursor-pointer
              items-center
              justify-center
              rounded-lg
              border
              border-emerald-400/20
              bg-emerald-500/10
              text-zinc-300
            "
          >
            <X size={18} />
          </label>
        </div>

        {/* MENU */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map(
            (
              section,
              index
            ) => (
              <div
                key={
                  index
                }
              >
                {section.title && (
                  <p
                    className="
                      mb-2
                      mt-5
                      px-3
                      text-[10px]
                      font-semibold
                      tracking-[0.18em]
                      text-emerald-300/35
                    "
                  >
                    {
                      section.title
                    }
                  </p>
                )}

                <div className="space-y-1">
                  {section.items.map(
                    (
                      item
                    ) => {
                      const Icon =
                        item.icon;

                      return (
                        <Link
                          key={
                            item.href
                          }
                          href={
                            item.href
                          }
                          prefetch={
                            false
                          }
                          className="
                            group
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-transparent
                            px-3
                            py-3
                            text-sm
                            text-zinc-400
                            transition
                            hover:border-emerald-400/20
                            hover:bg-emerald-950/40
                            hover:text-white
                          "
                        >
                          <Icon
                            size={
                              17
                            }
                            strokeWidth={
                              1.8
                            }
                            className="
                              shrink-0
                              text-zinc-500
                              group-hover:text-emerald-300
                            "
                          />

                          <span>
                            {
                              item.label
                            }
                          </span>
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </nav>

        {/* USER */}

        <div className="border-t border-emerald-500/15 p-3">
          <div
            className="
              rounded-2xl
              border
              border-emerald-500/20
              bg-gradient-to-br
              from-emerald-950/45
              to-black/20
              p-3
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-emerald-400/25
                  bg-emerald-500/10
                  font-bold
                  text-emerald-300
                "
              >
                {fullName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {fullName}
                </p>

                <p className="text-[11px] text-emerald-400/70">
                  {role}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}