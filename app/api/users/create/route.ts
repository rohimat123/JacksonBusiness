import "server-only";

import { NextResponse } from "next/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit-log";

type Body = {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  position?: string;
  employeeId?: string | null;
};

export async function POST(
  request: Request
) {
  try {
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
      data: ownerProfile,
    } = await supabase
      .from("profiles")
      .select(
        "full_name, role, status"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (
      !ownerProfile ||
      String(
        ownerProfile.role
      ).toUpperCase() !==
        "OWNER" ||
      String(
        ownerProfile.status
      ).toUpperCase() !==
        "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hanya Owner yang boleh membuat user.",
        },
        { status: 403 }
      );
    }

    const body =
      (await request.json()) as Body;

    const email =
      String(
        body.email ?? ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password ?? ""
      );

    const fullName =
      String(
        body.fullName ?? ""
      ).trim();

    const role =
      String(
        body.role ?? ""
      ).toUpperCase();

    const position =
      String(
        body.position ?? ""
      ).trim();

    const employeeId =
      body.employeeId
        ? String(
            body.employeeId
          )
        : null;

    if (
      !email ||
      !password ||
      !fullName ||
      !role
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Data user belum lengkap.",
        },
        { status: 400 }
      );
    }

    const url =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const key =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Service Role belum tersedia."
      );
    }

    const admin =
      createAdminClient(
        url,
        key,
        {
          auth: {
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        }
      );

    const {
      data: created,
      error: authError,
    } =
      await admin.auth.admin.createUser(
        {
          email,
          password,
          email_confirm:
            true,
        }
      );

    if (
      authError ||
      !created.user
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            authError?.message ??
            "Gagal membuat Auth user.",
        },
        { status: 400 }
      );
    }

    const newUserId =
      created.user.id;

    const {
      error: profileError,
    } = await admin
      .from("profiles")
      .insert({
        id: newUserId,
        email,
        full_name:
          fullName,
        role,
        position:
          position || role,
        status:
          "ACTIVE",
      });

    if (profileError) {
      await admin.auth.admin.deleteUser(
        newUserId
      );

      return NextResponse.json(
        {
          success: false,
          error:
            profileError.message,
        },
        { status: 400 }
      );
    }

    if (
      role === "EMPLOYEE" &&
      employeeId
    ) {
      const {
        error:
          employeeError,
      } = await admin
        .from("employees")
        .update({
          profile_id:
            newUserId,
        })
        .eq(
          "id",
          employeeId
        );

      if (employeeError) {
        console.error(
          "LINK EMPLOYEE ERROR:",
          employeeError
        );
      }
    }

    await writeAuditLog({
      action:
        "USER_CREATE",

      entityType:
        "USER",

      entityId:
        newUserId,

      description:
        `Membuat user ${fullName} dengan role ${role}`,

      metadata: {
        user_id:
          newUserId,
        email,
        full_name:
          fullName,
        role,
        position:
          position || role,
        employee_id:
          employeeId,
        created_by:
          ownerProfile.full_name,
      },
    });

    console.log(
      `✅ USER CREATED: ${newUserId}`
    );

    return NextResponse.json({
      success: true,
      userId:
        newUserId,
      message:
        "User berhasil dibuat.",
    });
  } catch (error) {
    console.error(
      "USER CREATE ERROR:",
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