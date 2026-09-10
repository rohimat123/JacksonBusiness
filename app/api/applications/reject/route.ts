import "server-only";

import {
  NextResponse,
} from "next/server";

import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  writeAuditLog,
} from "@/lib/audit-log";

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Session tidak ditemukan.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data:
        actor,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(`
          role,
          status
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    const role =
      String(
        actor?.role ??
          ""
      ).toUpperCase();

    if (
      !actor ||
      actor.status !==
        "ACTIVE" ||
      (
        role !==
          "OWNER" &&
        role !==
          "MANAGER"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akses ditolak.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const applicationId =
      String(
        body.applicationId ??
          ""
      ).trim();

    if (
      !applicationId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Application ID tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (
      !url ||
      !key
    ) {
      throw new Error(
        "Supabase Service Role belum tersedia."
      );
    }

    const admin =
      createAdminClient(
        url,
        key
      );

    const {
      data:
        application,
    } =
      await admin
        .from(
          "job_applications"
        )
        .select(`
          id,
          user_id,
          ic_name,
          email,
          status
        `)
        .eq(
          "id",
          applicationId
        )
        .maybeSingle();

    if (
      !application
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Application tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      application.status !==
      "PENDING"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Application sudah diproses.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error,
    } =
      await admin
        .from(
          "job_applications"
        )
        .update({
          status:
            "REJECTED",

          rejected_by:
            user.id,

          rejected_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          application.id
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    await writeAuditLog({
      action:
        "USER_REJECT",

      entityType:
        "USER",

      entityId:
        application.user_id,

      description:
        `Menolak lamaran ${application.ic_name}`,

      metadata: {
        application_id:
          application.id,

        user_id:
          application.user_id,

        ic_name:
          application.ic_name,

        email:
          application.email,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Application berhasil ditolak.",
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Gagal reject application.",
      },
      {
        status: 500,
      }
    );
  }
}