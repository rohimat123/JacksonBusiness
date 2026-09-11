"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

import type { LucideIcon } from "lucide-react";

import LogoutButton from "./logout-button";

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
// OWNER
// ============================================================

const ownerSections: MenuSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "PEGAWAI",
    items: [
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
    ],
  },

  {
    title: "LAPORAN",
    items: [
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
    ],
  },

  {
    title: "MANAGEMENT",
    items: [
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
    ],
  },

  {
    title: "ADMINISTRATION",
    items: [
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
    ],
  },
];

// ============================================================
// MANAGER
// ============================================================

const managerSections: MenuSection[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },

  {
    title: "PEGAWAI",
    items: [
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
    ],
  },

  {
    title: "LAPORAN",
    items: [
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
    ],
  },

  {
    title: "MANAGEMENT",
    items: [
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
    ],
  },
];

// ============================================================
// EMPLOYEE
// ============================================================

const employeeSections: MenuSection[] = [
  {
    items: [
      {
        label: "Dashboard Saya",
        href: "/dashboard",
        icon: Gauge,
      },
    ],
  },

  {
    title: "PEKERJAAN SAYA",
    items: [
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
    ],
  },

  {
    title: "LAPORAN SAYA",
    items: [
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
    ],
  },

  {
    title: "INFORMASI",
    items: [
      {
        label: "Informasi & Rules",
        href: "/dashboard/information",
        icon: Info,
      },
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function MobileSidebar({
  fullName,
  role,
}: {
  fullName: string;
  role: string;
}) {
  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

  const normalizedRole =
    String(role ?? "").toUpperCase();

  let sections: MenuSection[] =
    employeeSections;

  if (
    normalizedRole === "OWNER"
  ) {
    sections =
      ownerSections;
  }

  if (
    normalizedRole === "MANAGER"
  ) {
    sections =
      managerSections;
  }

  // ==========================================================
  // AUTO CLOSE KETIKA ROUTE BERUBAH
  // ==========================================================

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ==========================================================
  // LOCK BODY SCROLL
  // ==========================================================

  useEffect(() => {
    if (!open) {
      document.body.style.overflow =
        "";

      return;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [open]);

  return (
    <>
      {/* ======================================================
          HAMBURGER
      ====================================================== */}

      <button
        type="button"
        aria-label="Buka menu"
        onClick={() =>
          setOpen(true)
        }
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-emerald-400/25
          bg-emerald-500/10
          text-emerald-300
          transition
          active:scale-95
          lg:hidden
        "
      >
        <Menu
          size={21}
          strokeWidth={2}
        />
      </button>

      {/* ======================================================
          OVERLAY
      ====================================================== */}

      <div
        onClick={() =>
          setOpen(false)
        }
        className={`
          fixed
          inset-0
          z-[9998]
          bg-black/80
          backdrop-blur-[2px]
          transition-opacity
          duration-300
          lg:hidden

          ${
            open
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
      />

      {/* ======================================================
          DRAWER
      ====================================================== */}

      <aside
        className={`
          fixed
          bottom-0
          left-0
          top-0
          z-[9999]
          flex
          h-[100dvh]
          w-[82vw]
          max-w-[320px]
          flex-col
          overflow-hidden
          border-r
          border-emerald-500/25
          bg-[#020d0a]
          shadow-[25px_0_80px_rgba(0,0,0,0.75)]
          transition-transform
          duration-300
          ease-out
          lg:hidden

          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* ====================================================
            BRAND
        ==================================================== */}

        <div
          className="
            shrink-0
            border-b
            border-emerald-500/15
            bg-[#03130f]
            px-4
            py-4
          "
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
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
                  size={23}
                  className="text-emerald-300"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-bold text-white">
                  Jackson Farm
                </p>

                <p className="truncate text-[11px] text-zinc-500">
                  Management System
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Tutup menu"
              onClick={() =>
                setOpen(false)
              }
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-emerald-400/20
                bg-emerald-500/10
                text-zinc-300
                transition
                active:scale-95
              "
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ====================================================
            MENU
        ==================================================== */}

        <nav
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            bg-[#020d0a]
            px-3
            py-4
          "
        >
          {sections.map(
            (
              section,
              index
            ) => (
              <div
                key={`${section.title ?? "main"}-${index}`}
              >
                {section.title && (
                  <p
                    className="
                      mb-2
                      mt-6
                      px-3
                      text-[10px]
                      font-semibold
                      tracking-[0.18em]
                      text-emerald-300/40
                    "
                  >
                    {
                      section.title
                    }
                  </p>
                )}

                <div className="space-y-1">
                  {section.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        item.href ===
                        "/dashboard"
                          ? pathname ===
                            "/dashboard"
                          : pathname ===
                              item.href ||
                            pathname.startsWith(
                              `${item.href}/`
                            );

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
                          onClick={() =>
                            setOpen(
                              false
                            )
                          }
                          className={`
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            px-3
                            py-3
                            text-sm
                            transition-all

                            ${
                              active
                                ? `
                                  border-emerald-400/25
                                  bg-emerald-500/15
                                  text-white
                                  shadow-[0_0_20px_rgba(16,185,129,0.06)]
                                `
                                : `
                                  border-transparent
                                  text-zinc-400
                                  hover:border-emerald-400/15
                                  hover:bg-emerald-950/50
                                  hover:text-white
                                `
                            }
                          `}
                        >
                          <Icon
                            size={17}
                            strokeWidth={
                              1.8
                            }
                            className={
                              active
                                ? "shrink-0 text-emerald-300"
                                : "shrink-0 text-zinc-500"
                            }
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

        {/* ====================================================
            PROFILE
        ==================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-emerald-500/15
            bg-[#03130f]
            p-3
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-emerald-500/20
              bg-emerald-950/25
              p-3
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
                {fullName
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {fullName}
                </p>

                <p className="mt-0.5 text-[11px] text-emerald-400/70">
                  {
                    normalizedRole
                  }
                </p>
              </div>
            </div>

            <div className="mt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}