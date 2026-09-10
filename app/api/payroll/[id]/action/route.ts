import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

type Body = {
  action?: "PAY" | "VOID";
  note?: string;
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
    const { id } =
      await context.params;

    const body =
      (await request.json()) as Body;

    const action =
      String(
        body.action ?? ""
      ).toUpperCase();

    const note =
      String(
        body.note ?? ""
      ).trim();

    if (
      action !== "PAY" &&
      action !== "VOID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Action payroll tidak valid.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Belum login.",
        },
        { status: 401 }
      );
    }

    const {
      data: profile,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, role, status"
      )
      .eq("id", user.id)
      .maybeSingle();

    const role =
      String(
        profile?.role ?? ""
      ).toUpperCase();

    if (
      !profile ||
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
          error: "Akses ditolak.",
        },
        { status: 403 }
      );
    }

    const {
      data: payroll,
      error: payrollError,
    } = await supabase
      .from("payroll_records")
      .select(`
        *,
        employees (
          id,
          name,
          seed,
          position,
          status
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (
      payrollError ||
      !payroll
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            payrollError?.message ??
            "Payroll tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const employee =
      Array.isArray(
        payroll.employees
      )
        ? payroll.employees[0]
        : payroll.employees;

    if (
      action === "PAY"
    ) {
      if (
        String(
          payroll.status
        ).toUpperCase() ===
        "PAID"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll sudah dibayar.",
          },
          { status: 400 }
        );
      }

      const total =
        Number(
          payroll.total_salary ??
            0
        );

      if (total <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payroll $0 tidak dapat dibayar.",
          },
          { status: 400 }
        );
      }

      const paidAt =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("payroll_records")
        .update({
          status: "PAID",
          paid_at: paidAt,
          paid_by: user.id,
          note:
            note ||
            payroll.note ||
            null,
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            error:
              updateError.message,
          },
          { status: 400 }
        );
      }

      await writeAuditLog({
        action:
          "PAYROLL_PAY",

        entityType:
          "PAYROLL",

        entityId:
          id,

        description:
          `Membayar gaji ${employee?.name ?? "pegawai"} sebesar ${formatMoney(
            total
          )}`,

        metadata: {
          payroll_id: id,
          employee_id:
            payroll.employee_id,
          employee_name:
            employee?.name ??
            null,
          seed:
            employee?.seed ??
            null,
          period_start:
            payroll.period_start,
          period_end:
            payroll.period_end,
          approved_plants:
            Number(
              payroll.approved_plants ??
                0
            ),
          bonus:
            Number(
              payroll.bonus ??
                0
            ),
          fine:
            Number(
              payroll.fine ??
                0
            ),
          total_salary:
            total,
          previous_status:
            payroll.status,
          new_status: "PAID",
          paid_at: paidAt,
          paid_by:
            profile.full_name,
        },
      });

      console.log(
        `✅ PAYROLL PAID: ${id}`
      );

      return NextResponse.json({
        success: true,
        message:
          "Payroll berhasil dibayar.",
      });
    }

    if (
      String(
        payroll.status
      ).toUpperCase() ===
      "PAID"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payroll yang sudah PAID tidak dapat di-VOID.",
        },
        { status: 400 }
      );
    }

    const {
      error: updateError,
    } = await supabase
      .from("payroll_records")
      .update({
        status: "VOID",
        note:
          note ||
          payroll.note ||
          null,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error:
            updateError.message,
        },
        { status: 400 }
      );
    }

    await writeAuditLog({
      action:
        "PAYROLL_VOID",

      entityType:
        "PAYROLL",

      entityId:
        id,

      description:
        `Membatalkan payroll ${employee?.name ?? "pegawai"}`,

      metadata: {
        payroll_id: id,
        employee_id:
          payroll.employee_id,
        employee_name:
          employee?.name ??
          null,
        period_start:
          payroll.period_start,
        period_end:
          payroll.period_end,
        approved_plants:
          Number(
            payroll.approved_plants ??
              0
          ),
        total_salary:
          Number(
            payroll.total_salary ??
              0
          ),
        previous_status:
          payroll.status,
        new_status:
          "VOID",
        note:
          note || null,
      },
    });

    console.log(
      `✅ PAYROLL VOID: ${id}`
    );

    return NextResponse.json({
      success: true,
      message:
        "Payroll berhasil di-VOID.",
    });
  } catch (error) {
    console.error(
      "PAYROLL ACTION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

function formatMoney(
  value: number
) {
  return `$${new Intl.NumberFormat(
    "en-US"
  ).format(value)}`;
}