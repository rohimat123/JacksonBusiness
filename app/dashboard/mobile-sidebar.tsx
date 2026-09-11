"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type MenuItem = {
  label: string;
  href: string;
};

export default function MobileSidebar({
  menus,
}: {
  menus: MenuItem[];
}) {
  const [open, setOpen] =
    useState(false);

  return (
    <>
      <button
        onClick={() =>
          setOpen(true)
        }
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {open && (
        <>
          <div
            onClick={() =>
              setOpen(false)
            }
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          />

          <aside className="fixed left-0 top-0 z-[60] h-screen w-[280px] border-r border-emerald-500/20 bg-[#03100d] p-4 lg:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-bold">
                  Jackson Farm
                </p>

                <p className="text-xs text-zinc-500">
                  Management System
                </p>
              </div>

              <button
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-lg border border-zinc-700 p-2"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1">
              {menus.map(
                (item) => (
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
                    className="block rounded-xl px-3 py-2.5 text-sm text-zinc-300 hover:bg-emerald-950/40 hover:text-white"
                  >
                    {
                      item.label
                    }
                  </Link>
                )
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}