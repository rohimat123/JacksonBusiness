import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

type RequestBody = {
  action?: "APPROVE" | "REJECT";
  reason?: string;
};

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    // ========================================================
    // PARAMS
    // ========================================================

    const { id } =
      await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Report ID tidak ditemukan.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
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

    const reason =
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
            "Action review tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action === "REJECT" &&
      !reason
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
    // SUPABASE
    // ========================================================

    const supabase =
      await createClient();

    // ========================================================
    // USER
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
            "Profile tidak ditemukan.",
        },
        {
          status: 403,
        }
      );
    }

    const role =
      String(
        profile.role
      ).toUpperCase();

    const profileStatus =
      String(
        profile.status
      ).toUpperCase();

    if (
      profileStatus !==
        "ACTIVE" ||
      (
        role !== "OWNER" &&
        role !== "MANAGER"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Anda tidak memiliki akses untuk review Load Plant.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // REPORT
    // ========================================================

    const {
      data: report,
      error: reportError,
    } = await supabase
      .from(
        "load_plant_reports"
      )
      .select(`
        id,
        employee_id,
        seed,
        amount,
        report_date,
        status,
        evidence_url,
        rejection_reason,

        employees (
          id,
          name,
          forum_name,
          position
        )
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();

    if (
      reportError ||
      !report
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            reportError?.message ??
            "Laporan Load Plant tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // ONLY PENDING
    // ========================================================

    const currentStatus =
      String(
        report.status
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
          status: 400,
        }
      );
    }

    // ========================================================
    // EMPLOYEE RELATION
    // ========================================================

    const employee =
      Array.isArray(
        report.employees
      )
        ? report.employees[0]
        : report.employees;

    const reviewedAt =
      new Date().toISOString();

    // ========================================================
    // APPROVE
    // ========================================================

    if (
      action === "APPROVE"
    ) {
      const {
        data: updated,
        error: updateError,
      } = await supabase
        .from(
          "load_plant_reports"
        )
        .update({
          status:
            "APPROVED",

          reviewed_by:
            user.id,

          reviewed_at:
            reviewedAt,

          rejection_reason:
            null,
        })
        .eq(
          "id",
          report.id
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
          "LOAD PLANT APPROVE ERROR:",
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

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Laporan gagal diapprove atau sudah berubah status.",
          },
          {
            status: 409,
          }
        );
      }

      // ======================================================
      // AUDIT LOG
      // ======================================================

      await writeAuditLog({
        action:
          "LOAD_PLANT_APPROVE",

        entityType:
          "LOAD_PLANT",

        entityId:
          report.id,

        description:
          `Menyetujui Load Plant ${employee?.name ?? "pegawai"} sebanyak ${formatNumber(
            Number(
              report.amount ?? 0
            )
          )} Plants`,

        metadata: {
          report_id:
            report.id,

          employee_id:
            report.employee_id,

          employee_name:
            employee?.name ??
            null,

          forum_name:
            employee?.forum_name ??
            null,

          position:
            employee?.position ??
            null,

          seed:
            report.seed,

          amount:
            Number(
              report.amount ?? 0
            ),

          report_date:
            report.report_date,

          previous_status:
            currentStatus,

          new_status:
            "APPROVED",

          reviewed_by:
            user.id,

          reviewer_name:
            profile.full_name ??
            null,

          reviewer_role:
            profile.role,

          reviewed_at:
            reviewedAt,
        },
      });

      console.log(
        `✅ LOAD PLANT APPROVED: ${report.id}`
      );

      return NextResponse.json(
        {
          success: true,
          status:
            "APPROVED",
          message:
            "Load Plant berhasil disetujui.",
        },
        {
          status: 200,
        }
      );
    }

    // ========================================================
    // REJECT
    // ========================================================

    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from(
        "load_plant_reports"
      )
      .update({
        status:
          "REJECTED",

        reviewed_by:
          user.id,

        reviewed_at:
          reviewedAt,

        rejection_reason:
          reason,
      })
      .eq(
        "id",
        report.id
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
        "LOAD PLANT REJECT ERROR:",
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

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Laporan gagal direject atau sudah berubah status.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // AUDIT LOG REJECT
    // ========================================================

    await writeAuditLog({
      action:
        "LOAD_PLANT_REJECT",

      entityType:
        "LOAD_PLANT",

      entityId:
        report.id,

      description:
        `Menolak Load Plant ${employee?.name ?? "pegawai"} sebanyak ${formatNumber(
          Number(
            report.amount ?? 0
          )
        )} Plants`,

      metadata: {
        report_id:
          report.id,

        employee_id:
          report.employee_id,

        employee_name:
          employee?.name ??
          null,

        forum_name:
          employee?.forum_name ??
          null,

        position:
          employee?.position ??
          null,

        seed:
          report.seed,

        amount:
          Number(
            report.amount ?? 0
          ),

        report_date:
          report.report_date,

        previous_status:
          currentStatus,

        new_status:
          "REJECTED",

        rejection_reason:
          reason,

        reviewed_by:
          user.id,

        reviewer_name:
          profile.full_name ??
          null,

        reviewer_role:
          profile.role,

        reviewed_at:
          reviewedAt,
      },
    });

    console.log(
      `✅ LOAD PLANT REJECTED: ${report.id}`
    );

    return NextResponse.json(
      {
        success: true,
        status:
          "REJECTED",
        message:
          "Load Plant berhasil ditolak.",
      },
      {
        status: 200,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "======================================="
    );

    console.error(
      "LOAD PLANT REVIEW API ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "======================================="
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