import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // ========================================================
    // CHECK CURRENT USER
    // ========================================================

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // OWNER CHECK
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        role,
        status
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (
      !profile ||
      profile.role !== "OWNER" ||
      profile.status !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "OWNER_ONLY",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    const body = await request.json();

    const userId =
      String(body.user_id ?? "")
        .trim();

    const newPassword =
      String(body.password ?? "");

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password minimal 8 karakter.",
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
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase Service Role belum dikonfigurasi."
      );
    }

    const admin =
      createAdminClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

    // ========================================================
    // RESET PASSWORD
    // ========================================================

    const {
      data: updatedUser,
      error: updateError,
    } =
      await admin.auth.admin.updateUserById(
        userId,
        {
          password: newPassword,
        }
      );

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      user_id:
        updatedUser.user?.id ??
        userId,
    });
  } catch (error) {
    console.error(
      "RESET PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal reset password.",
      },
      {
        status: 500,
      }
    );
  }
}