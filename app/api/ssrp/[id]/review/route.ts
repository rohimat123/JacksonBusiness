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
    // PARAM
    // ========================================================

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "SSRP ID tidak ditemukan.",
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
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Request body tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const action = String(
      body.action ?? ""
    ).toUpperCase();

    const reason = String(
      body.reason ?? ""
    ).trim();

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Action review tidak valid.",
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
          error: "Alasan penolakan wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // SUPABASE
    // ========================================================

    const supabase = await createClient();

    // ========================================================
    // USER
    // ========================================================

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session login tidak ditemukan.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // PROFILE REVIEWER
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
            "Profile tidak ditemukan.",
        },
        {
          status: 403,
        }
      );
    }

    const role = String(
      profile.role ?? ""
    ).toUpperCase();

    const profileStatus = String(
      profile.status ?? ""
    ).toUpperCase();

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    if (
      profileStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun tidak aktif.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // REVIEW ACCESS
    //
    // OWNER
    // ✓ Review semua SSRP
    //
    // MANAGER
    // ✓ Review SSRP Worker
    // ✗ Review SSRP sendiri
    // ✗ Review SSRP Manager lain
    //
    // EMPLOYEE
    // ✗ Tidak dapat review
    // ========================================================

    if (
      role !== "OWNER" &&
      role !== "MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Anda tidak memiliki akses untuk review SSRP.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // GET SSRP
    // ========================================================

    const {
      data: report,
      error: reportError,
    } = await supabase
      .from("ssrp_reports")
      .select(`
        id,
        employee_id,
        activity,
        report_date,
        evidence_url,
        status,
        rejection_reason,
        employees (
          id,
          profile_id,
          name,
          forum_name,
          seed,
          position,
          status
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
            "Laporan SSRP tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // STATUS SSRP
    // ========================================================

    const currentStatus = String(
      report.status ?? ""
    ).toUpperCase();

    if (
      currentStatus !== "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `SSRP sudah direview dengan status ${currentStatus}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // PEMILIK SSRP
    // ========================================================

    const employee =
      Array.isArray(report.employees)
        ? report.employees[0]
        : report.employees;

    if (!employee) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Data pegawai pemilik SSRP tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // MANAGER SECURITY
    // ========================================================

    if (
      role === "MANAGER"
    ) {
      // ======================================================
      // CARI DATA EMPLOYEE MANAGER YANG LOGIN
      // ======================================================

      const {
        data: managerEmployee,
        error: managerEmployeeError,
      } = await supabase
        .from("employees")
        .select(`
          id,
          profile_id,
          name,
          position,
          status
        `)
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

      if (
        managerEmployeeError
      ) {
        console.error(
          "MANAGER EMPLOYEE LOOKUP ERROR:",
          managerEmployeeError
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Gagal membaca Data Pegawai Manager.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !managerEmployee
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Akun Manager belum terhubung ke Data Pegawai.",
          },
          {
            status: 403,
          }
        );
      }

      const managerStatus = String(
        managerEmployee.status ?? ""
      ).toUpperCase();

      if (
        managerStatus !== "ACTIVE"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Data Pegawai Manager tidak aktif.",
          },
          {
            status: 403,
          }
        );
      }

      // ======================================================
      // MANAGER TIDAK BOLEH REVIEW SSRP SENDIRI
      // ======================================================

      if (
        String(report.employee_id) ===
        String(managerEmployee.id)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Manager tidak dapat review SSRP miliknya sendiri. SSRP Manager harus direview oleh Owner.",
          },
          {
            status: 403,
          }
        );
      }

      // ======================================================
      // MANAGER TIDAK BOLEH REVIEW SSRP MANAGER LAIN
      //
      // Kita pakai employees.position.
      // Tidak perlu mencari profiles milik pembuat SSRP.
      // ======================================================

      const reportOwnerPosition =
        String(
          employee.position ?? ""
        ).toUpperCase();

      if (
        reportOwnerPosition === "MANAGER"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Manager tidak dapat review SSRP Manager. SSRP Manager harus direview oleh Owner.",
          },
          {
            status: 403,
          }
        );
      }
    }

    // ========================================================
    // REVIEW TIME
    // ========================================================

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
        .from("ssrp_reports")
        .update({
          status: "APPROVED",
          reviewed_by: user.id,
          reviewed_at: reviewedAt,
          rejection_reason: null,
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

      if (
        updateError
      ) {
        console.error(
          "SSRP APPROVE ERROR:",
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

      if (
        !updated
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "SSRP gagal diapprove atau sudah berubah status.",
          },
          {
            status: 409,
          }
        );
      }

      // ======================================================
      // AUDIT LOG APPROVE
      // ======================================================

      await writeAuditLog({
        action:
          "SSRP_APPROVE",

        entityType:
          "SSRP",

        entityId:
          report.id,

        description:
          `Menyetujui SSRP ${employee.name ?? "pegawai"}: ${shortText(
            report.activity,
            80
          )}`,

        metadata: {
          report_id:
            report.id,

          employee_id:
            report.employee_id,

          employee_name:
            employee.name ??
            null,

          forum_name:
            employee.forum_name ??
            null,

          seed:
            employee.seed ??
            null,

          position:
            employee.position ??
            null,

          activity:
            report.activity,

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
            role,

          reviewed_at:
            reviewedAt,
        },
      });

      console.log(
        `SSRP APPROVED: ${report.id} BY ${role}`
      );

      return NextResponse.json(
        {
          success: true,
          status:
            "APPROVED",
          message:
            "SSRP berhasil disetujui.",
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
      .from("ssrp_reports")
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

    if (
      updateError
    ) {
      console.error(
        "SSRP REJECT ERROR:",
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

    if (
      !updated
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SSRP gagal direject atau sudah berubah status.",
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
        "SSRP_REJECT",

      entityType:
        "SSRP",

      entityId:
        report.id,

      description:
        `Menolak SSRP ${employee.name ?? "pegawai"}: ${shortText(
          report.activity,
          80
        )}`,

      metadata: {
        report_id:
          report.id,

        employee_id:
          report.employee_id,

        employee_name:
          employee.name ??
          null,

        forum_name:
          employee.forum_name ??
          null,

        seed:
          employee.seed ??
          null,

        position:
          employee.position ??
          null,

        activity:
          report.activity,

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
          role,

        reviewed_at:
          reviewedAt,
      },
    });

    console.log(
      `SSRP REJECTED: ${report.id} BY ${role}`
    );

    return NextResponse.json(
      {
        success: true,
        status:
          "REJECTED",
        message:
          "SSRP berhasil ditolak.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "SSRP REVIEW API ERROR:"
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
// HELPERS
// ============================================================

function shortText(
  value: string | null,
  maxLength: number
) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (
    text.length <=
    maxLength
  ) {
    return text;
  }

  return `${text.slice(
    0,
    maxLength
  )}...`;
}