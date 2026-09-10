import "server-only";

import { NextResponse } from "next/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

const FALLBACK_RATE = 0.3;
const FALLBACK_SSRP_RATE = 200;

type PayrollAction =
  | "GENERATE"
  | "PAY"
  | "VOID";

type RequestBody = {
  action?: PayrollAction;

  employeeId?: string;

  periodStart?: string;
  periodEnd?: string;

  bonus?: number;
  fine?: number;

  paymentNote?: string;
};

// ============================================================
// POST
// ============================================================

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // AUTH CLIENT
    // ========================================================

    const supabase =
      await createClient();

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

    if (
      String(
        profile.status
      ).toUpperCase() !==
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
            "Hanya Owner atau Manager yang dapat mengelola payroll.",
        },
        {
          status: 403,
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
      ).toUpperCase() as PayrollAction;

    const employeeId =
      String(
        body.employeeId ?? ""
      ).trim();

    const periodStart =
      String(
        body.periodStart ?? ""
      ).trim();

    const periodEnd =
      String(
        body.periodEnd ?? ""
      ).trim();

    const bonus =
      Math.max(
        0,
        Number(
          body.bonus ?? 0
        ) || 0
      );

    const fine =
      Math.max(
        0,
        Number(
          body.fine ?? 0
        ) || 0
      );

    const paymentNote =
      String(
        body.paymentNote ?? ""
      ).trim();

    if (
      action !== "GENERATE" &&
      action !== "PAY" &&
      action !== "VOID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Action payroll tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !employeeId ||
      !isDate(
        periodStart
      ) ||
      !isDate(
        periodEnd
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Employee atau periode payroll tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // ADMIN CLIENT
    // ========================================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRole
    ) {
      throw new Error(
        "Supabase Service Role belum dikonfigurasi."
      );
    }

    const admin =
      createAdminClient(
        supabaseUrl,
        serviceRole,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        }
      );

    // ========================================================
    // SYSTEM SETTINGS
    // ========================================================

    const {
      data: systemSettings,
      error: settingsError,
    } = await admin
      .from(
        "system_settings"
      )
      .select(`
        payroll_rate,
        ssrp_rate
      `)
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        {
          success: false,
          error:
            settingsError.message,
        },
        {
          status: 400,
        }
      );
    }

    const currentPayrollRate =
      Number(
        systemSettings
          ?.payroll_rate ??
          FALLBACK_RATE
      ) || FALLBACK_RATE;

    const currentSSRPRate =
      Number(
        systemSettings
          ?.ssrp_rate ??
          FALLBACK_SSRP_RATE
      ) || FALLBACK_SSRP_RATE;

    // ========================================================
    // EMPLOYEE
    // ========================================================

    const {
      data: employee,
      error: employeeError,
    } = await admin
      .from("employees")
      .select(`
        id,
        name,
        forum_name,
        seed,
        position,
        status,
        join_date
      `)
      .eq(
        "id",
        employeeId
      )
      .maybeSingle();

    if (
      employeeError ||
      !employee
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            employeeError?.message ??
            "Pegawai tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // EXISTING PAYROLL
    // ========================================================

    const {
      data: existingPayroll,
      error: existingError,
    } = await admin
      .from(
        "payroll_records"
      )
      .select(`
        id,
        employee_id,
        period_start,
        period_end,
        approved_plants,
        approved_ssrp,
        rate_per_plant,
        ssrp_rate,
        gross_salary,
        bonus,
        fine,
        total_salary,
        status,
        payment_note,
        paid_at
      `)
      .eq(
        "employee_id",
        employeeId
      )
      .eq(
        "period_start",
        periodStart
      )
      .eq(
        "period_end",
        periodEnd
      )
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingError.message,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // GENERATE / UPDATE PAYROLL
    // ========================================================

    if (
      action === "GENERATE"
    ) {
      if (
        existingPayroll &&
        String(
          existingPayroll.status
        ).toUpperCase() ===
          "PAID"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll yang sudah PAID tidak dapat digenerate ulang.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        existingPayroll &&
        String(
          existingPayroll.status
        ).toUpperCase() ===
          "VOID"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll yang sudah VOID tidak dapat digenerate ulang.",
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // APPROVED PLANTS
      // ======================================================

      const {
        data: loadReports,
        error: loadError,
      } = await admin
        .from(
          "load_plant_reports"
        )
        .select(`
          amount
        `)
        .eq(
          "employee_id",
          employeeId
        )
        .eq(
          "status",
          "APPROVED"
        )
        .gte(
          "report_date",
          periodStart
        )
        .lte(
          "report_date",
          periodEnd
        );

      if (loadError) {
        return NextResponse.json(
          {
            success: false,
            error:
              loadError.message,
          },
          {
            status: 400,
          }
        );
      }

      const approvedPlants =
        (
          loadReports ?? []
        ).reduce(
          (
            total,
            report
          ) =>
            total +
            Number(
              report.amount ??
                0
            ),
          0
        );

      // ======================================================
      // APPROVED SSRP
      // ======================================================

      const {
        count: approvedSSRP,
        error: ssrpError,
      } = await admin
        .from(
          "ssrp_reports"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "employee_id",
          employeeId
        )
        .eq(
          "status",
          "APPROVED"
        )
        .gte(
          "report_date",
          periodStart
        )
        .lte(
          "report_date",
          periodEnd
        );

      if (ssrpError) {
        return NextResponse.json(
          {
            success: false,
            error:
              ssrpError.message,
          },
          {
            status: 400,
          }
        );
      }

      // ======================================================
      // CALCULATION
      // ======================================================

      const rate =
        existingPayroll
          ? Number(
              existingPayroll
                .rate_per_plant
            ) ||
            currentPayrollRate
          : currentPayrollRate;

      const ssrpRate =
        existingPayroll
          ? Number(
              existingPayroll
                .ssrp_rate
            ) ||
            currentSSRPRate
          : currentSSRPRate;

      const approvedSSRPCount =
        approvedSSRP ?? 0;

      const plantSalary =
        approvedPlants *
        rate;

      const ssrpSalary =
        approvedSSRPCount *
        ssrpRate;

      const grossSalary =
        plantSalary +
        ssrpSalary;

      const normalTotal =
        Math.max(
          0,
          grossSalary +
            bonus -
            fine
        );

      // RESIGNED => VOID
      const employeeStatus =
        String(
          employee.status
        ).toUpperCase();

      const shouldVoid =
        employeeStatus ===
        "RESIGNED";

      const payrollStatus =
        shouldVoid
          ? "VOID"
          : "UNPAID";

      const finalTotal =
        shouldVoid
          ? 0
          : normalTotal;

      // ======================================================
      // UPDATE EXISTING
      // ======================================================

      let payrollId:
        | string
        | null = null;

      let auditAction:
        | "PAYROLL_GENERATE"
        | "PAYROLL_UPDATE";

      if (
        existingPayroll
      ) {
        const {
          data: updated,
          error:
            updateError,
        } = await admin
          .from(
            "payroll_records"
          )
          .update({
            approved_plants:
              approvedPlants,

            approved_ssrp:
              approvedSSRPCount,

            rate_per_plant:
              rate,

            ssrp_rate:
              ssrpRate,

            gross_salary:
              grossSalary,

            bonus,

            fine,

            total_salary:
              finalTotal,

            status:
              payrollStatus,

            payment_note:
              paymentNote ||
              existingPayroll
                .payment_note ||
              null,

            paid_at:
              null,
          })
          .eq(
            "id",
            existingPayroll.id
          )
          .select("id")
          .single();

        if (
          updateError ||
          !updated
        ) {
          return NextResponse.json(
            {
              success:
                false,

              error:
                updateError?.message ??
                "Gagal memperbarui payroll.",
            },
            {
              status: 400,
            }
          );
        }

        payrollId =
          updated.id;

        auditAction =
          "PAYROLL_UPDATE";
      } else {
        // ====================================================
        // INSERT
        // ====================================================

        const {
          data: inserted,
          error:
            insertError,
        } = await admin
          .from(
            "payroll_records"
          )
          .insert({
            employee_id:
              employeeId,

            period_start:
              periodStart,

            period_end:
              periodEnd,

            approved_plants:
              approvedPlants,

            approved_ssrp:
              approvedSSRPCount,

            rate_per_plant:
              rate,

            ssrp_rate:
              ssrpRate,

            gross_salary:
              grossSalary,

            bonus,

            fine,

            total_salary:
              finalTotal,

            status:
              payrollStatus,

            payment_note:
              paymentNote ||
              null,

            paid_at:
              null,
          })
          .select("id")
          .single();

        if (
          insertError ||
          !inserted
        ) {
          return NextResponse.json(
            {
              success:
                false,

              error:
                insertError?.message ??
                "Gagal membuat payroll.",
            },
            {
              status: 400,
            }
          );
        }

        payrollId =
          inserted.id;

        auditAction =
          "PAYROLL_GENERATE";
      }

      // ======================================================
      // AUDIT LOG
      // ======================================================

      await writeAuditLog({
        action:
          auditAction,

        entityType:
          "PAYROLL",

        entityId:
          payrollId,

        description:
          auditAction ===
          "PAYROLL_GENERATE"
            ? `Membuat payroll ${employee.name} sebesar ${formatMoney(
                finalTotal
              )}`
            : `Memperbarui payroll ${employee.name} menjadi ${formatMoney(
                finalTotal
              )}`,

        metadata: {
          payroll_id:
            payrollId,

          employee_id:
            employee.id,

          employee_name:
            employee.name,

          forum_name:
            employee.forum_name,

          seed:
            employee.seed,

          position:
            employee.position,

          employee_status:
            employee.status,

          period_start:
            periodStart,

          period_end:
            periodEnd,

          approved_plants:
            approvedPlants,

          approved_ssrp:
            approvedSSRP ??
            0,

          rate_per_plant:
            rate,

          ssrp_rate:
            ssrpRate,

          ssrp_salary:
            ssrpSalary,

          gross_salary:
            grossSalary,

          bonus,

          fine,

          total_salary:
            finalTotal,

          payroll_status:
            payrollStatus,

          payment_note:
            paymentNote ||
            null,

          generated_by:
            user.id,

          generator_name:
            profile.full_name,

          generator_role:
            role,
        },
      });

      console.log(
        `✅ AUDIT LOG: ${auditAction} | ${payrollId}`
      );

      console.log(
        `✅ PAYROLL ${
          existingPayroll
            ? "UPDATED"
            : "GENERATED"
        }: ${employee.name} | ${approvedPlants} Plants | ${formatMoney(
          finalTotal
        )}`
      );

      return NextResponse.json({
        success: true,

        action:
          auditAction,

        payrollId,

        status:
          payrollStatus,

        approvedPlants,

        grossSalary,

        bonus,

        fine,

        totalSalary:
          finalTotal,

        message:
          shouldVoid
            ? "Payroll dibuat sebagai VOID karena pegawai berstatus RESIGNED."
            : existingPayroll
              ? "Payroll berhasil diperbarui."
              : "Payroll berhasil dibuat.",
      });
    }

    // ========================================================
    // PAY / VOID REQUIRE EXISTING
    // ========================================================

    if (!existingPayroll) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payroll belum dibuat. Generate payroll terlebih dahulu.",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      String(
        existingPayroll.status
      ).toUpperCase();

    // ========================================================
    // PAY
    // ========================================================

    if (
      action === "PAY"
    ) {
      if (
        currentStatus ===
        "PAID"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll sudah berstatus PAID.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        currentStatus ===
        "VOID"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll VOID tidak dapat dibayar.",
          },
          {
            status: 400,
          }
        );
      }

      const totalSalary =
        Number(
          existingPayroll
            .total_salary ??
            0
        );

      if (
        totalSalary <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll dengan total $0 tidak dapat dibayar.",
          },
          {
            status: 400,
          }
        );
      }

      const paidAt =
        new Date().toISOString();

      const {
        error:
          paymentError,
      } = await admin
        .from(
          "payroll_records"
        )
        .update({
          status:
            "PAID",

          paid_at:
            paidAt,

          payment_note:
            paymentNote ||
            existingPayroll
              .payment_note ||
            null,
        })
        .eq(
          "id",
          existingPayroll.id
        );

      if (paymentError) {
        return NextResponse.json(
          {
            success: false,
            error:
              paymentError.message,
          },
          {
            status: 400,
          }
        );
      }

      await writeAuditLog({
        action:
          "PAYROLL_PAY",

        entityType:
          "PAYROLL",

        entityId:
          existingPayroll.id,

        description:
          `Membayar gaji ${employee.name} sebesar ${formatMoney(
            totalSalary
          )}`,

        metadata: {
          payroll_id:
            existingPayroll.id,

          employee_id:
            employee.id,

          employee_name:
            employee.name,

          seed:
            employee.seed,

          period_start:
            periodStart,

          period_end:
            periodEnd,

          approved_plants:
            Number(
              existingPayroll
                .approved_plants ??
                0
            ),

          rate_per_plant:
            Number(
              existingPayroll
                .rate_per_plant ??
                0
            ),

          gross_salary:
            Number(
              existingPayroll
                .gross_salary ??
                0
            ),

          bonus:
            Number(
              existingPayroll
                .bonus ??
                0
            ),

          fine:
            Number(
              existingPayroll
                .fine ??
                0
            ),

          total_salary:
            totalSalary,

          previous_status:
            currentStatus,

          new_status:
            "PAID",

          paid_at:
            paidAt,

          paid_by:
            user.id,

          payer_name:
            profile.full_name,

          payer_role:
            role,

          payment_note:
            paymentNote ||
            existingPayroll
              .payment_note ||
            null,
        },
      });

      console.log(
        `✅ AUDIT LOG: PAYROLL_PAY | ${existingPayroll.id}`
      );

      console.log(
        `✅ PAYROLL PAID: ${employee.name} | ${formatMoney(
          totalSalary
        )}`
      );

      return NextResponse.json({
        success: true,

        status:
          "PAID",

        message:
          "Payroll berhasil ditandai PAID.",
      });
    }

    // ========================================================
    // VOID
    // ========================================================

    if (
      currentStatus ===
      "PAID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payroll yang sudah PAID tidak dapat di-VOID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      currentStatus ===
      "VOID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payroll sudah berstatus VOID.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error: voidError,
    } = await admin
      .from(
        "payroll_records"
      )
      .update({
        status:
          "VOID",

        total_salary:
          0,

        payment_note:
          paymentNote ||
          "Payroll dibatalkan.",

        paid_at:
          null,
      })
      .eq(
        "id",
        existingPayroll.id
      );

    if (voidError) {
      return NextResponse.json(
        {
          success: false,
          error:
            voidError.message,
        },
        {
          status: 400,
        }
      );
    }

    await writeAuditLog({
      action:
        "PAYROLL_VOID",

      entityType:
        "PAYROLL",

      entityId:
        existingPayroll.id,

      description:
        `Membatalkan payroll ${employee.name}`,

      metadata: {
        payroll_id:
          existingPayroll.id,

        employee_id:
          employee.id,

        employee_name:
          employee.name,

        seed:
          employee.seed,

        period_start:
          periodStart,

        period_end:
          periodEnd,

        approved_plants:
          Number(
            existingPayroll
              .approved_plants ??
              0
          ),

        gross_salary:
          Number(
            existingPayroll
              .gross_salary ??
              0
          ),

        bonus:
          Number(
            existingPayroll
              .bonus ??
              0
          ),

        fine:
          Number(
            existingPayroll
              .fine ??
              0
          ),

        previous_total_salary:
          Number(
            existingPayroll
              .total_salary ??
              0
          ),

        previous_status:
          currentStatus,

        new_status:
          "VOID",

        payment_note:
          paymentNote ||
          "Payroll dibatalkan.",

        voided_by:
          user.id,

        voided_by_name:
          profile.full_name,

        voided_by_role:
          role,
      },
    });

    console.log(
      `✅ AUDIT LOG: PAYROLL_VOID | ${existingPayroll.id}`
    );

    console.log(
      `✅ PAYROLL VOID: ${employee.name}`
    );

    return NextResponse.json({
      success: true,

      status:
        "VOID",

      message:
        "Payroll berhasil di-VOID.",
    });
  } catch (
    error
  ) {
    console.error(
      "======================================"
    );

    console.error(
      "PAYROLL API ERROR:"
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

function isDate(
  value: string
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
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