import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // ========================================================
    // CURRENT USER
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
    // CHECK OWNER
    // ========================================================

    const {
      data: currentProfile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        role,
        status
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (
      !currentProfile ||
      currentProfile.role !== "OWNER" ||
      currentProfile.status !== "ACTIVE"
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

    const email =
      String(body.email ?? "")
        .trim()
        .toLowerCase();

    const password =
      String(body.password ?? "");

    const fullName =
      String(body.full_name ?? "")
        .trim();

    const role =
      String(body.role ?? "")
        .trim()
        .toUpperCase();

    const employeeId =
      body.employee_id
        ? String(body.employee_id)
        : null;

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
          error:
            "Password minimal 8 karakter.",
        },
        {
          status: 400,
        }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Nama lengkap wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "OWNER",
        "MANAGER",
        "EMPLOYEE",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Role tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      role === "EMPLOYEE" &&
      !employeeId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun EMPLOYEE wajib dihubungkan ke pegawai.",
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
    // CHECK EMPLOYEE
    // ========================================================

    if (employeeId) {
      const {
        data: employee,
        error: employeeError,
      } = await admin
        .from("employees")
        .select(`
          id,
          name,
          profile_id
        `)
        .eq("id", employeeId)
        .maybeSingle();

      if (employeeError) {
        throw employeeError;
      }

      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Pegawai tidak ditemukan.",
          },
          {
            status: 404,
          }
        );
      }

      if (employee.profile_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Pegawai ini sudah mempunyai akun.",
          },
          {
            status: 409,
          }
        );
      }
    }

    // ========================================================
    // CREATE AUTH USER
    // ========================================================

    const {
      data: authData,
      error: createUserError,
    } =
      await admin.auth.admin.createUser({
        email,
        password,

        // OWNER yang membuat akun,
        // jadi langsung dianggap verified.
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
        },
      });

    if (
      createUserError ||
      !authData.user
    ) {
      throw (
        createUserError ??
        new Error(
          "Gagal membuat auth user."
        )
      );
    }

    const newUserId =
      authData.user.id;

    try {
      // ======================================================
      // CREATE PROFILE
      // ======================================================

const {
  error: insertProfileError,
} = await admin
  .from("profiles")
  .upsert(
    {
      id: newUserId,

      email: email,

      full_name: fullName,

      role,

      position:
        role === "OWNER"
          ? "Owner"
          : role === "MANAGER"
            ? "Manager"
            : "Employee",

      status: "ACTIVE",
    },
    {
      onConflict: "id",
    }
  );

      if (insertProfileError) {
        throw insertProfileError;
      }

      // ======================================================
      // LINK EMPLOYEE
      // ======================================================

      if (employeeId) {
        const {
          error: employeeLinkError,
        } = await admin
          .from("employees")
          .update({
            profile_id:
              newUserId,
          })
          .eq(
            "id",
            employeeId
          )
          .is(
            "profile_id",
            null
          );

        if (employeeLinkError) {
          throw employeeLinkError;
        }
      }

      return NextResponse.json({
        success: true,

        user: {
          id: newUserId,
          email,
          full_name:
            fullName,
          role,
          employee_id:
            employeeId,
        },
      });
    } catch (databaseError) {
      // Kalau profile/link gagal,
      // Auth user jangan ditinggalkan orphan.
      await admin.auth.admin.deleteUser(
        newUserId
      );

      throw databaseError;
    }
  } catch (error) {
    console.error(
      "CREATE USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat user.",
      },
      {
        status: 500,
      }
    );
  }
}