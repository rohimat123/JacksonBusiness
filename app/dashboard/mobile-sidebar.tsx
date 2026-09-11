"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Sprout,
} from "lucide-react";

import type {
  LucideIcon,
} from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

export default function MobileSidebar({
  sections,
  fullName,
  role,
}: {
  sections: MenuSection[];
  fullName: string;
  role: string;
}) {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      {/* HAMBURGER */}
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
          hover:bg-emerald-500/20
          lg:hidden
        "
      >
        <Menu size={20} />
      </button>

      {/* OVERLAY */}
      <div
        onClick={() =>
          setOpen(false)
        }
        className={`
          fixed
          inset-0
          z-[90]
          bg-black/70
          backdrop-blur-sm
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

      {/* MOBILE SIDEBAR */}
      <aside
        className={`
          fixed
          bottom-0
          left-0
          top-0
          z-[100]
          flex
          w-[290px]
          max-w-[85vw]
          flex-col
          border-r
          border-emerald-500/20
          bg-[#03100d]/95
          shadow-[20px_0_60px_rgba(0,0,0,0.55)]
          backdrop-blur-2xl
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
                shadow-[0_0_25px_rgba(16,185,129,0.12)]
              "
            >
              <Sprout
                size={23}
                className="text-emerald-300"
              />
            </div>

            <div>
              <p className="font-bold text-white">
                Jackson Farm
              </p>

              <p className="text-[11px] text-emerald-100/35">
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
              h-9
              w-9
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
          </button>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map(
            (section, index) => (
              <div
                key={index}
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
                      first:mt-0
                    "
                  >
                    {section.title}
                  </p>
                )}

                <div className="space-y-1">
                  {section.items.map(
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
                          onClick={() =>
                            setOpen(
                              false
                            )
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
                            transition-all
                            duration-200
                            hover:border-emerald-400/20
                            hover:bg-gradient-to-r
                            hover:from-emerald-500/15
                            hover:to-emerald-950/10
                            hover:text-white
                          "
                        >
                          <Icon
                            size={17}
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
                <p className="truncate text-sm font-semibold text-white">
                  {fullName}
                </p>

                <p className="text-[11px] text-emerald-400/70">
                  {role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}