import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SalesForm from "./sales-form";

type SeedStock = Record<
  string,
  number
>;

export default async function CreateSalesPage() {
  const supabase =
    await createClient();

  // ============================================================
  // LOAD PLANT APPROVED
  // ============================================================

  const {
    data: loadPlants,
    error: loadError,
  } = await supabase
    .from("load_plant_reports")
    .select("seed, amount")
    .eq("status", "APPROVED");

  if (loadError) {
    throw new Error(
      loadError.message
    );
  }

  // ============================================================
  // SALES APPROVED
  // ============================================================

  const {
    data: approvedSales,
    error: salesError,
  } = await supabase
    .from("sales_reports")
    .select("seed, quantity")
    .eq("status", "APPROVED");

  if (salesError) {
    throw new Error(
      salesError.message
    );
  }

  // ============================================================
  // CALCULATE STOCK
  // ============================================================

  const stockBySeed: SeedStock =
    {};

  for (
    const report of
      loadPlants ?? []
  ) {
    const seed =
      String(report.seed);

    stockBySeed[seed] =
      (stockBySeed[seed] ??
        0) +
      Number(report.amount);
  }

  for (
    const sale of
      approvedSales ?? []
  ) {
    const seed =
      String(sale.seed);

    stockBySeed[seed] =
      (stockBySeed[seed] ??
        0) -
      Number(sale.quantity);
  }

  // Jangan izinkan angka minus tampil
  for (const seed of Object.keys(
    stockBySeed
  )) {
    stockBySeed[seed] =
      Math.max(
        0,
        stockBySeed[seed]
      );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/sales"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Kembali ke Penjualan
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-white">
          Tambah Penjualan
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Buat laporan penjualan tanaman dari storage Jackson Farm.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6">
        <SalesForm
          stockBySeed={
            stockBySeed
          }
        />
      </div>
    </div>
  );
}