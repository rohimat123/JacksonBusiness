"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Rule = {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  rules: Rule[];
};

const categories = [
  "RULES",
  "INFO",
  "PAYROLL",
  "SHIFT",
  "STORAGE",
];

export default function InformationActions({
  rules,
}: Props) {
  const router = useRouter();

  const [category, setCategory] =
    useState("INFO");

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [sortOrder, setSortOrder] =
    useState(
      rules.length + 1
    );

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  async function addRule() {
    if (!title.trim()) {
      setErrorMessage(
        "Judul wajib diisi."
      );
      return;
    }

    if (!content.trim()) {
      setErrorMessage(
        "Isi informasi wajib diisi."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw new Error(
          "Session login tidak ditemukan."
        );
      }

      const { error } =
        await supabase
          .from(
            "information_rules"
          )
          .insert({
            category,
            title:
              title.trim(),

            content:
              content.trim(),

            sort_order:
              Number(
                sortOrder
              ),

            is_active:
              true,

            created_by:
              user.id,

            updated_by:
              user.id,
          });

      if (error) {
        throw error;
      }

      setTitle("");
      setContent("");

      setSortOrder(
        sortOrder + 1
      );

      setSuccessMessage(
        "Informasi berhasil ditambahkan."
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan informasi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function editRule(
    rule: Rule
  ) {
    const newTitle =
      window.prompt(
        "Judul:",
        rule.title
      );

    if (
      newTitle === null
    ) {
      return;
    }

    const newContent =
      window.prompt(
        "Isi informasi:",
        rule.content
      );

    if (
      newContent === null
    ) {
      return;
    }

    const newCategory =
      window.prompt(
        `Kategori:\n${categories.join(
          "\n"
        )}`,
        rule.category
      );

    if (
      newCategory === null
    ) {
      return;
    }

    const normalizedCategory =
      newCategory
        .trim()
        .toUpperCase();

    if (
      !categories.includes(
        normalizedCategory
      )
    ) {
      setErrorMessage(
        "Kategori tidak valid."
      );
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const { error } =
        await supabase
          .from(
            "information_rules"
          )
          .update({
            title:
              newTitle.trim(),

            content:
              newContent.trim(),

            category:
              normalizedCategory,

            updated_by:
              user?.id ?? null,
          })
          .eq(
            "id",
            rule.id
          );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Informasi berhasil diubah."
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah informasi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleRule(
    rule: Rule
  ) {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      const { error } =
        await supabase
          .from(
            "information_rules"
          )
          .update({
            is_active:
              !rule.is_active,

            updated_by:
              user?.id ?? null,
          })
          .eq(
            "id",
            rule.id
          );

      if (error) {
        throw error;
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengubah status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(
    rule: Rule
  ) {
    const confirmed =
      window.confirm(
        `Hapus "${rule.title}"?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase
          .from(
            "information_rules"
          )
          .delete()
          .eq(
            "id",
            rule.id
          );

      if (error) {
        throw error;
      }

      setSuccessMessage(
        "Informasi berhasil dihapus."
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus informasi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ADD FORM */}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Tambah Informasi / Rules
          </h2>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Kategori
            </label>

            <select
              value={
                category
              }
              onChange={(
                event
              ) =>
                setCategory(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
            >
              {categories.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Judul
            </label>

            <input
              value={title}
              onChange={(
                event
              ) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Judul..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Urutan
            </label>

            <input
              type="number"
              value={
                sortOrder
              }
              onChange={(
                event
              ) =>
                setSortOrder(
                  Number(
                    event.target.value
                  )
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={
                addRule
              }
              disabled={
                loading
              }
              className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              Tambah
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
            Isi
          </label>

          <textarea
            value={content}
            onChange={(
              event
            ) =>
              setContent(
                event.target.value
              )
            }
            rows={4}
            placeholder="Isi informasi atau rule..."
            className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
          />
        </div>

        {errorMessage && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-green-900 bg-green-950/20 px-4 py-3 text-sm text-green-400">
              {successMessage}
            </div>
          </div>
        )}
      </div>

      {/* MANAGEMENT */}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Manage Information
          </h2>
        </div>

        <div className="divide-y divide-zinc-800">
          {rules.map(
            (rule) => (
              <div
                key={
                  rule.id
                }
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge
                      category={
                        rule.category
                      }
                    />

                    {!rule.is_active && (
                      <span className="rounded-full border border-red-900 bg-red-950/30 px-2 py-0.5 text-xs text-red-400">
                        HIDDEN
                      </span>
                    )}
                  </div>

                  <p className="mt-2 font-semibold text-white">
                    {
                      rule.title
                    }
                  </p>

                  <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-500">
                    {
                      rule.content
                    }
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      editRule(
                        rule
                      )
                    }
                    disabled={
                      loading
                    }
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleRule(
                        rule
                      )
                    }
                    disabled={
                      loading
                    }
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    {rule.is_active
                      ? "Hide"
                      : "Show"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteRule(
                        rule
                      )
                    }
                    disabled={
                      loading
                    }
                    className="rounded-lg border border-red-900 px-3 py-2 text-xs text-red-400 hover:bg-red-950/30"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({
  category,
}: {
  category: string;
}) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-300">
      {category}
    </span>
  );
}