import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

// ============================================================
// TYPES
// ============================================================

type ReviewBody = {
  action?: "APPROVE" | "REJECT";
  reason?: string;
};

type SaleReport = {
  id: string;
  seller_profile_id: string | null;
  seed: string;
  quantity: number;
  price_per_unit: number | string;
  total_amount: number | string;
  sale_date: string;
  status: string;
};

// ============================================================
// POST
// ============================================================

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "ID laporan penjualan tidak ditemukan.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    // ========================================================
    // AUTH
    // ========================================================

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Session login tidak ditemukan.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // PROFILE
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        role,
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
      return NextResponse.json(
        {
          success: false,
          error:
            profileError?.message ??
            "Profile reviewer tidak ditemukan.",
        },
        {
          status: 403,
        }
      );
    }

const actorRole =
  String(
    profile.role
  ).toUpperCase();

const profileStatus =
  String(
    profile.status
  ).toUpperCase();

if (
  profileStatus !== "ACTIVE" ||
  actorRole !== "OWNER"
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Hanya Owner yang dapat review penjualan.",
    },
    {
      status: 403,
    }
  );
}

    // ========================================================
    // BODY
    // ========================================================

    let body: ReviewBody;

    try {
      body =
        (await request.json()) as ReviewBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Request body tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const action =
      String(
        body.action ?? ""
      ).toUpperCase();

    const rejectionReason =
      String(
        body.reason ?? ""
      ).trim();

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Action harus APPROVE atau REJECT.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action === "REJECT" &&
      !rejectionReason
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Alasan penolakan wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // GET SALE
    // ========================================================

    const {
      data: saleData,
      error: saleError,
    } = await supabase
      .from("sales_reports")
      .select(`
        id,
        seller_profile_id,
        seed,
        quantity,
        price_per_unit,
        total_amount,
        sale_date,
        status
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      saleError ||
      !saleData
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            saleError?.message ??
            "Laporan penjualan tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    const sale =
      saleData as SaleReport;

    const currentStatus =
      String(
        sale.status
      ).toUpperCase();

    if (
      currentStatus !==
      "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `Laporan sudah direview dengan status ${currentStatus}.`,
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // SELLER
    // ========================================================

    let sellerName =
      "Unknown";

    let sellerPosition:
      | string
      | null = null;

    if (
      sale.seller_profile_id
    ) {
      const {
        data: sellerProfile,
      } = await supabase
        .from("profiles")
        .select(`
          full_name,
          position
        `)
        .eq(
          "id",
          sale.seller_profile_id
        )
        .maybeSingle();

      if (
        sellerProfile
      ) {
        sellerName =
          sellerProfile.full_name ??
          "Unknown";

        sellerPosition =
          sellerProfile.position ??
          null;
      }
    }

    // ========================================================
    // VALUES
    // ========================================================

    const quantity =
      Number(
        sale.quantity
      ) || 0;

    const pricePerUnit =
      Number(
        sale.price_per_unit
      ) || 0;

    const totalAmount =
      Number(
        sale.total_amount
      ) || 0;

    const seed =
      String(
        sale.seed ?? "-"
      ).toUpperCase();

    const reviewedAt =
      new Date().toISOString();

    const newStatus =
      action === "APPROVE"
        ? "APPROVED"
        : "REJECTED";

    // ========================================================
    // UPDATE SALE
    // ========================================================

    const {
      data: updatedSale,
      error: updateError,
    } = await supabase
      .from("sales_reports")
      .update({
        status:
          newStatus,

        reviewed_by:
          user.id,

        reviewed_at:
          reviewedAt,

        rejection_reason:
          action ===
          "REJECT"
            ? rejectionReason
            : null,
      })
      .eq(
        "id",
        sale.id
      )
      .eq(
        "status",
        "PENDING"
      )
      .select(`
        id,
        status
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "SALE UPDATE ERROR:",
        updateError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        {
          status: 400,
        }
      );
    }

    if (!updatedSale) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Laporan sudah berubah status atau gagal diperbarui.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // AUDIT LOG
    // ========================================================

    const auditAction =
      action === "APPROVE"
        ? "SALE_APPROVE"
        : "SALE_REJECT";

    const description =
      action === "APPROVE"
        ? `Menyetujui penjualan ${formatNumber(
            quantity
          )} ${seed} senilai ${formatMoney(
            totalAmount
          )}`
        : `Menolak penjualan ${formatNumber(
            quantity
          )} ${seed}`;

    const auditResult =
      await writeAuditLog({
        action:
          auditAction,

        entityType:
          "SALE",

        entityId:
          sale.id,

        description,

        metadata: {
          sale_id:
            sale.id,

          seller_profile_id:
            sale.seller_profile_id,

          seller_name:
            sellerName,

          seller_position:
            sellerPosition,

          seed,

          quantity,

          price_per_unit:
            pricePerUnit,

          total_amount:
            totalAmount,

          sale_date:
            sale.sale_date,

          previous_status:
            "PENDING",

          new_status:
            newStatus,

          rejection_reason:
            action === "REJECT"
              ? rejectionReason
              : null,

          reviewed_by:
            user.id,

          reviewer_name:
            profile.full_name ??
            null,

          reviewer_role:
            actorRole,

          reviewed_at:
            reviewedAt,
        },
      });

    // ========================================================
    // TERMINAL
    // ========================================================

    if (
      auditResult?.success
    ) {
      console.log(
        `✅ AUDIT LOG: ${auditAction} | ${auditResult.id ?? "-"}`
      );
    } else {
      console.error(
        `⚠️ SALE berhasil direview tetapi Audit Log gagal: ${sale.id}`
      );
    }

    console.log(
      `✅ SALE ${newStatus}: ${sale.id} | ${formatNumber(
        quantity
      )} ${seed} | ${formatMoney(
        totalAmount
      )}`
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        message:
          action === "APPROVE"
            ? "Penjualan berhasil disetujui."
            : "Penjualan berhasil ditolak.",

        report: {
          id:
            sale.id,

          status:
            newStatus,

          seed,

          quantity,

          price_per_unit:
            pricePerUnit,

          total_amount:
            totalAmount,

          seller_name:
            sellerName,

          sale_date:
            sale.sale_date,
        },

        audit_logged:
          Boolean(
            auditResult?.success
          ),
      },
      {
        status: 200,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "======================================"
    );

    console.error(
      "SALE REVIEW API ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "======================================"
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// FORMAT
// ============================================================

function formatNumber(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US"
  ).format(value);
}

function formatMoney(
  value: number
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    }
  ).format(value);
}