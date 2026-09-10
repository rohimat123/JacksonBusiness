import "server-only";

import { NextResponse } from "next/server";

import {
  createClient as createSupabaseClient,
} from "@supabase/supabase-js";

type LoginRequest = {
  identifier?: string;
  password?: string;
};

function invalidLogin() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Nama IC atau password salah.",
    },
    {
      status: 401,
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    // ========================================================
    // BODY
    // ========================================================

    let body: LoginRequest;

    try {
      body =
        (await request.json()) as LoginRequest;
    } catch {
      return invalidLogin();
    }

    const identifier =
      String(
        body.identifier ?? ""
      ).trim();

    const password =
      String(
        body.password ?? ""
      );

    if (
      !identifier ||
      !password
    ) {
      return invalidLogin();
    }

    // ========================================================
    // ENV
    // ========================================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    // Support Supabase key baru maupun lama
    const publicKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error(
        "[LOGIN IC] NEXT_PUBLIC_SUPABASE_URL tidak ditemukan."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase URL belum dikonfigurasi.",
        },
        {
          status: 500,
        }
      );
    }

    if (!publicKey) {
      console.error(
        "[LOGIN IC] Supabase Publishable/Anon Key tidak ditemukan."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase public key belum dikonfigurasi.",
        },
        {
          status: 500,
        }
      );
    }

    if (!serviceRoleKey) {
      console.error(
        "[LOGIN IC] SUPABASE_SERVICE_ROLE_KEY tidak ditemukan."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase service role belum dikonfigurasi.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // ADMIN CLIENT
    // Dipakai hanya di SERVER.
    // Jangan pernah kirim service role ke browser.
    // ========================================================

    const admin =
      createSupabaseClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,

            detectSessionInUrl:
              false,
          },
        }
      );

    // ========================================================
    // CARI EMPLOYEE BERDASARKAN NAMA IC
    // Case insensitive
    // ========================================================

    const {
      data: employees,
      error: employeeError,
    } =
      await admin
        .from("employees")
        .select(`
          id,
          name,
          profile_id,
          status
        `)
        .ilike(
          "name",
          identifier
        )
        .limit(2);

    if (employeeError) {
      console.error(
        "[LOGIN IC] Employee lookup error:",
        employeeError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal memeriksa Nama IC.",
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // NAMA IC TIDAK DITEMUKAN
    // ========================================================

    if (
      !employees ||
      employees.length === 0
    ) {
      return invalidLogin();
    }

    // ========================================================
    // DUPLICATE NAMA IC
    // ========================================================

    if (
      employees.length > 1
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama IC digunakan lebih dari satu akun. Silakan login menggunakan email.",
        },
        {
          status: 409,
        }
      );
    }

    const employee =
      employees[0];

    // ========================================================
    // STATUS EMPLOYEE
    // ========================================================

    if (
      String(
        employee.status ?? ""
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun Employee belum aktif.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // PROFILE ID
    // ========================================================

    if (
      !employee.profile_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama IC belum terhubung dengan akun login.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // AMBIL PROFILE
    // ========================================================

    const {
      data: profile,
      error: profileError,
    } =
      await admin
        .from("profiles")
        .select(`
          id,
          email,
          role,
          status
        `)
        .eq(
          "id",
          employee.profile_id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "[LOGIN IC] Profile lookup error:",
        profileError.message
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal memeriksa akun Employee.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !profile ||
      !profile.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun Employee belum terhubung dengan email login.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // STATUS PROFILE
    // ========================================================

    if (
      String(
        profile.status ?? ""
      ).toUpperCase() !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun belum aktif.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // VERIFY PASSWORD
    //
    // Kita verifikasi password SEBELUM email dikirim
    // kembali ke browser.
    // ========================================================

    const authClient =
      createSupabaseClient(
        supabaseUrl,
        publicKey,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,

            detectSessionInUrl:
              false,
          },
        }
      );

    const {
      error: authError,
    } =
      await authClient.auth
        .signInWithPassword({
          email:
            String(
              profile.email
            ),

          password,
        });

    if (authError) {
      console.error(
        "[LOGIN IC] Password verification failed."
      );

      return invalidLogin();
    }

    // ========================================================
    // SUCCESS
    // ========================================================

    return NextResponse.json(
      {
        success: true,

        email:
          String(
            profile.email
          ),
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "[LOGIN IC] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Terjadi kesalahan pada server.",
      },
      {
        status: 500,
      }
    );
  }
}