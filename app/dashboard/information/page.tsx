import { createClient } from "@/lib/supabase/server";
import InformationActions from "./information-actions";

type InformationRule = {
  id: string;
  category: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
};

export default async function InformationPage() {
  const supabase =
    await createClient();

  const {
    data: rulesData,
    error,
  } = await supabase
    .from(
      "information_rules"
    )
    .select(`
      id,
      category,
      title,
      content,
      sort_order,
      is_active
    `)
    .order(
      "sort_order",
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const rules =
    (rulesData ??
      []) as InformationRule[];

  const activeRules =
    rules.filter(
      (rule) =>
        rule.is_active
    );

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <p className="text-xs text-zinc-500">
          Management
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white">
          Informasi & Rules
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Informasi internal dan peraturan Jackson Farm.
        </p>
      </div>

      {/* PUBLIC / ACTIVE DISPLAY */}

      <div className="grid gap-4 lg:grid-cols-2">
        {activeRules.map(
          (rule) => (
            <div
              key={
                rule.id
              }
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-5"
            >
              <CategoryBadge
                category={
                  rule.category
                }
              />

              <h2 className="mt-3 text-lg font-semibold text-white">
                {
                  rule.title
                }
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                {
                  rule.content
                }
              </p>
            </div>
          )
        )}
      </div>

      {/* OWNER MANAGEMENT */}

      <InformationActions
        rules={rules}
      />
    </div>
  );
}

function CategoryBadge({
  category,
}: {
  category: string;
}) {
  let style =
    "border-zinc-700 bg-zinc-900 text-zinc-300";

  if (
    category ===
    "RULES"
  ) {
    style =
      "border-red-900 bg-red-950/20 text-red-400";
  }

  if (
    category ===
    "PAYROLL"
  ) {
    style =
      "border-green-900 bg-green-950/20 text-green-400";
  }

  if (
    category ===
    "SHIFT"
  ) {
    style =
      "border-blue-900 bg-blue-950/20 text-blue-400";
  }

  if (
    category ===
    "STORAGE"
  ) {
    style =
      "border-yellow-900 bg-yellow-950/20 text-yellow-400";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {category}
    </span>
  );
}