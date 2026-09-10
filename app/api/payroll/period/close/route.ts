import "server-only";

import { NextResponse } from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  writeAuditLog,
} from "@/lib/audit-log";

type RequestBody = {
  periodId?: string;
};

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // AUTH
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
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          role,
          status
        `)
        .eq("id", user.id)
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
      role !== "OWNER" ||
      profileStatus !==
        "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hanya OWNER ACTIVE yang dapat menutup periode.",
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

    const periodId =
      String(
        body.periodId ?? ""
      ).trim();

    if (!periodId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Period ID tidak ditemukan.",
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
    // CURRENT PERIOD
    // ========================================================

    const {
      data: currentPeriod,
      error: periodError,
    } =
      await admin
        .from(
          "payroll_periods"
        )
        .select(`
          id,
          name,
          period_start,
          period_end,
          status,
          closed_by,
          closed_at
        `)
        .eq(
          "id",
          periodId
        )
        .maybeSingle();

    if (
      periodError ||
      !currentPeriod
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            periodError?.message ??
            "Periode tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      String(
        currentPeriod.status
      ).toUpperCase();

    if (
      currentStatus !==
      "OPEN"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Periode ini sudah ditutup.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // SERVER DATE CHECK - WAJIB
    // ========================================================

    const today =
      getJakartaDateString();

    if (
      today <
      currentPeriod.period_end
    ) {
      console.warn(
        `⛔ PERIOD CLOSE BLOCKED: ${currentPeriod.name} | Today ${today} | End ${currentPeriod.period_end}`
      );

      return NextResponse.json(
        {
          success: false,

          error:
            `Periode belum selesai. ${currentPeriod.name} baru dapat ditutup pada ${formatDate(
              currentPeriod.period_end
            )}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CHECK UNPAID PAYROLL
    // ========================================================

    const {
      data: unpaidRecords,
      error: unpaidError,
    } =
      await admin
        .from(
          "payroll_records"
        )
        .select(`
          id,
          employee_id,
          total_salary,
          status
        `)
        .eq(
          "period_start",
          currentPeriod.period_start
        )
        .eq(
          "period_end",
          currentPeriod.period_end
        )
        .eq(
          "status",
          "UNPAID"
        )
        .gt(
          "total_salary",
          0
        );

    if (unpaidError) {
      return NextResponse.json(
        {
          success: false,
          error:
            unpaidError.message,
        },
        {
          status: 400,
        }
      );
    }

    const unpaidCount =
      (
        unpaidRecords ?? []
      ).length;

    if (
      unpaidCount > 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Masih ada ${unpaidCount} payroll dengan gaji yang belum dibayar.`,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CHECK OTHER OPEN PERIOD
    // ========================================================

    const {
      data: otherOpenPeriods,
      error: otherOpenError,
    } =
      await admin
        .from(
          "payroll_periods"
        )
        .select(`
          id,
          name,
          period_start,
          period_end
        `)
        .eq(
          "status",
          "OPEN"
        )
        .neq(
          "id",
          currentPeriod.id
        );

    if (otherOpenError) {
      return NextResponse.json(
        {
          success: false,
          error:
            otherOpenError.message,
        },
        {
          status: 400,
        }
      );
    }

    if (
      (
        otherOpenPeriods ?? []
      ).length > 0
    ) {
      const other =
        otherOpenPeriods?.[0];

      return NextResponse.json(
        {
          success: false,

          error:
            `Ada periode OPEN lain: ${
              other?.name ??
              "Unknown"
            }. Perbaiki periode tersebut terlebih dahulu.`,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // NEXT PERIOD
    // ========================================================

    const nextStart =
      addDays(
        currentPeriod.period_end,
        1
      );

    const nextEnd =
      addDays(
        nextStart,
        13
      );

    const currentNumber =
      getPeriodNumber(
        currentPeriod.name
      );

    const nextName =
      `Periode #${
        currentNumber + 1
      }`;

    // ========================================================
    // CHECK NEXT PERIOD
    // ========================================================

    const {
      data: existingNext,
      error:
        existingNextError,
    } =
      await admin
        .from(
          "payroll_periods"
        )
        .select(`
          id,
          name,
          period_start,
          period_end,
          status
        `)
        .eq(
          "period_start",
          nextStart
        )
        .eq(
          "period_end",
          nextEnd
        )
        .maybeSingle();

    if (
      existingNextError
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingNextError.message,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CLOSE CURRENT
    // ========================================================

    const closedAt =
      new Date()
        .toISOString();

    const {
      data: closedPeriod,
      error: closeError,
    } =
      await admin
        .from(
          "payroll_periods"
        )
        .update({
          status:
            "CLOSED",

          closed_by:
            user.id,

          closed_at:
            closedAt,
        })
        .eq(
          "id",
          currentPeriod.id
        )
        .eq(
          "status",
          "OPEN"
        )
        .select(`
          id,
          name,
          period_start,
          period_end,
          status
        `)
        .maybeSingle();

    if (
      closeError ||
      !closedPeriod
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            closeError?.message ??
            "Periode gagal ditutup atau sudah diproses.",
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // CREATE / REOPEN NEXT PERIOD
    // ========================================================

    let nextPeriodId:
      string | null =
      null;

    let nextPeriodMode:
      "CREATED" |
      "REOPENED" =
      "CREATED";

    try {
      if (existingNext) {
        nextPeriodId =
          existingNext.id;

        if (
          String(
            existingNext.status
          ).toUpperCase() !==
          "OPEN"
        ) {
          const {
            error:
              reopenError,
          } =
            await admin
              .from(
                "payroll_periods"
              )
              .update({
                status:
                  "OPEN",

                closed_by:
                  null,

                closed_at:
                  null,
              })
              .eq(
                "id",
                existingNext.id
              );

          if (reopenError) {
            throw reopenError;
          }
        }

        nextPeriodMode =
          "REOPENED";
      } else {
        const {
          data: insertedNext,
          error: insertError,
        } =
          await admin
            .from(
              "payroll_periods"
            )
            .insert({
              name:
                nextName,

              period_start:
                nextStart,

              period_end:
                nextEnd,

              status:
                "OPEN",
            })
            .select(`
              id,
              name,
              period_start,
              period_end,
              status
            `)
            .single();

        if (
          insertError ||
          !insertedNext
        ) {
          throw (
            insertError ??
            new Error(
              "Gagal membuat periode berikutnya."
            )
          );
        }

        nextPeriodId =
          insertedNext.id;

        nextPeriodMode =
          "CREATED";
      }
    } catch (
      nextPeriodError
    ) {
      // ======================================================
      // ROLLBACK CURRENT
      // ======================================================

      const {
        error:
          rollbackError,
      } =
        await admin
          .from(
            "payroll_periods"
          )
          .update({
            status:
              "OPEN",

            closed_by:
              null,

            closed_at:
              null,
          })
          .eq(
            "id",
            currentPeriod.id
          );

      if (
        rollbackError
      ) {
        console.error(
          "PERIOD ROLLBACK ERROR:",
          rollbackError
        );
      }

      throw nextPeriodError;
    }

    // ========================================================
    // AUDIT CLOSE
    // ========================================================

    await writeAuditLog({
      action:
        "PERIOD_CLOSE",

      entityType:
        "PAYROLL_PERIOD",

      entityId:
        currentPeriod.id,

      description:
        `Menutup ${currentPeriod.name}`,

      metadata: {
        period_id:
          currentPeriod.id,

        period_name:
          currentPeriod.name,

        period_start:
          currentPeriod.period_start,

        period_end:
          currentPeriod.period_end,

        previous_status:
          "OPEN",

        new_status:
          "CLOSED",

        closed_at:
          closedAt,

        closed_by:
          user.id,

        closed_by_name:
          profile.full_name,

        closed_by_role:
          role,

        next_period_id:
          nextPeriodId,

        next_period_name:
          nextName,

        next_period_start:
          nextStart,

        next_period_end:
          nextEnd,
      },
    });

    // ========================================================
    // AUDIT NEXT PERIOD
    // ========================================================

    await writeAuditLog({
      action:
        "PERIOD_CREATE",

      entityType:
        "PAYROLL_PERIOD",

      entityId:
        nextPeriodId,

      description:
        nextPeriodMode ===
        "CREATED"
          ? `Membuat ${nextName}`
          : `Membuka kembali ${nextName}`,

      metadata: {
        period_id:
          nextPeriodId,

        period_name:
          nextName,

        period_start:
          nextStart,

        period_end:
          nextEnd,

        status:
          "OPEN",

        mode:
          nextPeriodMode,

        source_period_id:
          currentPeriod.id,

        source_period_name:
          currentPeriod.name,

        created_by:
          user.id,

        created_by_name:
          profile.full_name,

        created_by_role:
          role,
      },
    });

    console.log(
      `✅ AUDIT LOG: PERIOD_CLOSE | ${currentPeriod.id}`
    );

    console.log(
      `✅ AUDIT LOG: PERIOD_CREATE | ${nextPeriodId}`
    );

    console.log(
      `✅ PERIOD CLOSED: ${currentPeriod.name}`
    );

    console.log(
      `✅ NEXT PERIOD OPEN: ${nextName} | ${nextStart} - ${nextEnd}`
    );

    // ========================================================
    // RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      closedPeriod: {
        id:
          currentPeriod.id,

        name:
          currentPeriod.name,

        periodStart:
          currentPeriod.period_start,

        periodEnd:
          currentPeriod.period_end,

        status:
          "CLOSED",
      },

      nextPeriod: {
        id:
          nextPeriodId,

        name:
          nextName,

        periodStart:
          nextStart,

        periodEnd:
          nextEnd,

        status:
          "OPEN",

        mode:
          nextPeriodMode,
      },

      message:
        `${currentPeriod.name} berhasil ditutup. ${nextName} otomatis dibuka.`,
    });
  } catch (error) {
    console.error(
      "======================================"
    );

    console.error(
      "PERIOD CLOSE API ERROR:"
    );

    console.error(error);

    console.error(
      "======================================"
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Gagal menutup periode.",
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

function addDays(
  dateString: string,
  days: number
) {
  const date =
    new Date(
      `${dateString}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getPeriodNumber(
  name: string
) {
  const match =
    String(name).match(
      /(\d+)/
    );

  if (!match) {
    return 0;
  }

  return (
    Number(match[1]) ||
    0
  );
}

function getJakartaDateString() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Jakarta",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    new Date(
      `${value}T00:00:00Z`
    )
  );
}