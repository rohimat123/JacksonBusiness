import "server-only";

import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type RegisterBody = {
  icName?: string;
  email?: string;
  password?: string;
  confirmNotUcp?: boolean;
};

export async function POST(request: Request) {
  try {
    const body: RegisterBody = await request.json();

    const icName = String(body.icName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const confirmNotUcp = Boolean(body.confirmNotUcp);

    if (!icName) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama IC wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
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

    if (!confirmNotUcp) {
      return NextResponse.json(
        {
          success: false,
          error: "Konfirmasi password bukan password UCP wajib dicentang.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRole =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      throw new Error(
        "Konfigurasi Supabase server belum lengkap."
      );
    }

    const admin = createAdminClient(
      supabaseUrl,
      serviceRole,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // ========================================================
    // CEK EMAIL SUDAH TERPAKAI DI JOB APPLICATION
    // ========================================================

    const {
      data: existingApplicationByEmail,
      error: existingApplicationByEmailError,
    } = await admin
      .from("job_applications")
      .select("id, user_id, email, status")
      .eq("email", email)
      .maybeSingle();

    if (existingApplicationByEmailError) {
      throw new Error(
        existingApplicationByEmailError.message
      );
    }

    if (existingApplicationByEmail) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email ini sudah pernah digunakan untuk mendaftar.",
        },
        {
          status: 409,
        }
      );
    }

    // ========================================================
    // CREATE AUTH USER
    // ========================================================

    const {
      data: createdUser,
      error: createUserError,
    } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createUserError || !createdUser.user) {
      const message =
        createUserError?.message ??
        "Gagal membuat akun.";

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("registered")
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Email ini sudah terdaftar. Gunakan email lain.",
          },
          {
            status: 409,
          }
        );
      }

      throw new Error(message);
    }

    const userId = createdUser.user.id;

    try {
      // ========================================================
      // PROFILE
      // ========================================================

      const {
        data: existingProfile,
        error: existingProfileError,
      } = await admin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existingProfileError) {
        throw new Error(
          existingProfileError.message
        );
      }

      if (!existingProfile) {
        const {
          error: profileInsertError,
        } = await admin
          .from("profiles")
          .insert({
            id: userId,
            full_name: icName,
            email,
            role: "EMPLOYEE",
            position: null,
            status: "ACTIVE",
          });

        if (profileInsertError) {
          throw new Error(
            profileInsertError.message
          );
        }
      }

      // ========================================================
      // JOB APPLICATION
      // ========================================================

      const {
        data: existingApplication,
        error: existingApplicationError,
      } = await admin
        .from("job_applications")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingApplicationError) {
        throw new Error(
          existingApplicationError.message
        );
      }

      if (!existingApplication) {
        const now =
          new Date().toISOString();

        const {
          error: applicationInsertError,
        } = await admin
          .from("job_applications")
          .insert({
            user_id: userId,
            ic_name: icName,
            email,
            status: "PENDING",
            hired_as: null,
            hired_by: null,
            hired_at: null,
            rejected_by: null,
            rejected_at: null,
            created_at: now,
            updated_at: now,
          });

        if (applicationInsertError) {
          throw new Error(
            applicationInsertError.message
          );
        }
      }

      return NextResponse.json({
        success: true,
        message:
          "Pendaftaran berhasil. Silakan tunggu persetujuan Owner atau Manager.",
      });
    } catch (error) {
      // ========================================================
      // ROLLBACK USER JIKA DB GAGAL
      // ========================================================

      await admin.auth.admin.deleteUser(
        userId
      );

      throw error;
    }
  } catch (error) {
    console.error(
      "REGISTER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Pendaftaran gagal.",
      },
      {
        status: 500,
      }
    );
  }
}