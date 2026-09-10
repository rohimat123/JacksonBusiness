"use client";

import { useRouter } from "next/navigation";

type Period = {
  id: string;
  label: string;
  status: string;
};

export default function EmployeePeriodSelector({
  periods,
  selectedPeriodId,
}: {
  periods: Period[];
  selectedPeriodId: string;
}) {
  const router = useRouter();

  function changePeriod(
    periodId: string
  ) {
    router.push(
      `/dashboard?period=${periodId}`
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={
          selectedPeriodId
        }
        onChange={(event) =>
          changePeriod(
            event.target.value
          )
        }
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
      >
        {periods.map(
          (period) => (
            <option
              key={
                period.id
              }
              value={
                period.id
              }
            >
              {period.label}
              {period.status ===
              "OPEN"
                ? " — OPEN"
                : ""}
            </option>
          )
        )}
      </select>
    </div>
  );
}