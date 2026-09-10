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

type HireBody = {
  applicationId?: string;
  hireAs?: "WORKER" | "MANAGER";
  seed?: string;
  position?: string;
};

const VALID_SEEDS = new Set([
  "POTATO",
  "ONION",
  "CORN",
  "WHEAT",
  "CARROT",
]);

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
            "Session tidak ditemukan.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // ACTOR PROFILE
    // ========================================================

    const {
      data: actor,
      error: actorError,
    } =
      await supabase
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
      actorError ||
      !actor
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            actorError?.message ??
            "Profile tidak ditemukan.",
        },
        {
          status: 403,
        }
      );
    }

    const actorRole =
      String(
        actor.role ?? ""
      ).toUpperCase();

    const actorStatus =
      String(
        actor.status ?? ""
      ).toUpperCase();

    if (
      actorStatus !== "ACTIVE"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Akun tidak aktif.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      actorRole !== "OWNER" &&
      actorRole !== "MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Hanya Owner atau Manager yang dapat melakukan hire.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // BODY
    // ========================================================

    let body: HireBody;

    try {
      body =
        await request.json();
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

    const applicationId =
      String(
        body.applicationId ?? ""
      ).trim();

    const hireAs =
      String(
        body.hireAs ?? ""
      ).toUpperCase();

    const seedRaw =
      String(
        body.seed ?? ""
      ).toUpperCase();

    const position =
      String(
        body.position ?? ""
      ).trim();

    if (!applicationId) {
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

    if (
      hireAs !== "WORKER" &&
      hireAs !== "MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Jenis hire tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    // Manager hanya boleh hire Worker
    if (
      actorRole === "MANAGER" &&
      hireAs === "MANAGER"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Manager hanya dapat hire Worker.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // SEED VALIDATION
    // ========================================================

    let normalizedSeed:
      | string
      | null =
      null;

    if (
      hireAs === "WORKER"
    ) {
      if (
        !VALID_SEEDS.has(
          seedRaw
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Seed Worker tidak valid.",
          },
          {
            status: 400,
          }
        );
      }

      normalizedSeed =
        seedRaw;

      if (
        position.length < 2
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Position Worker wajib diisi.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (
      hireAs === "MANAGER"
    ) {
      if (
        seedRaw === "" ||
        seedRaw === "EMPTY" ||
        seedRaw === "NONE"
      ) {
        normalizedSeed =
          null;
      } else if (
        VALID_SEEDS.has(
          seedRaw
        )
      ) {
        normalizedSeed =
          seedRaw;
      } else {
        return NextResponse.json(
          {
            success: false,
            error:
              "Seed Manager tidak valid.",
          },
          {
            status: 400,
          }
        );
      }
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
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    // ========================================================
    // SETTINGS
    // ========================================================

    const {
      data: systemSettings,
      error:
        systemSettingsError,
    } =
      await admin
        .from(
          "system_settings"
        )
        .select(`
          default_target_plants
        `)
        .limit(1)
        .maybeSingle();

    if (
      systemSettingsError
    ) {
      throw new Error(
        systemSettingsError.message
      );
    }

    const defaultTargetPlants =
      Math.max(
        0,
        Number(
          systemSettings
            ?.default_target_plants ??
            40000
        ) || 40000
      );

    // ========================================================
    // APPLICATION
    // ========================================================

    const {
      data: application,
      error:
        applicationError,
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
      applicationError ||
      !application
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            applicationError?.message ??
            "Application tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      String(
        application.status ?? ""
      ).toUpperCase() !==
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

    // ========================================================
    // CHECK EMPLOYEE EXISTING
    // ========================================================

    const {
      data:
        existingEmployee,
      error:
        existingEmployeeError,
    } =
      await admin
        .from("employees")
        .select("id")
        .eq(
          "profile_id",
          application.user_id
        )
        .maybeSingle();

    if (
      existingEmployeeError
    ) {
      throw new Error(
        existingEmployeeError.message
      );
    }

    if (
      existingEmployee
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User sudah terhubung ke Data Pegawai.",
        },
        {
          status: 409,
        }
      );
    }

    const joinDate =
      getJakartaDate();

    const hiredAt =
      new Date()
        .toISOString();

    // ========================================================
    // HIRE MANAGER
    // ========================================================

    if (
      hireAs === "MANAGER"
    ) {
      const {
        data:
          managerEmployee,
        error:
          managerEmployeeError,
      } =
        await admin
          .from("employees")
          .insert({
            profile_id:
              application.user_id,

            name:
              application.ic_name,

            forum_name:
              null,

            seed:
              normalizedSeed,

            position:
              "MANAGER",

            join_date:
              joinDate,

            status:
              "ACTIVE",

            target_plants:
              0,
          })
          .select("id")
          .single();

      if (
        managerEmployeeError ||
        !managerEmployee
      ) {
        throw new Error(
          managerEmployeeError?.message ??
          "Gagal membuat Data Pegawai Manager."
        );
      }

      const {
        error:
          profileUpdateError,
      } =
        await admin
          .from("profiles")
          .update({
            role:
              "MANAGER",

            position:
              "MANAGER",

            status:
              "ACTIVE",
          })
          .eq(
            "id",
            application.user_id
          );

      if (
        profileUpdateError
      ) {
        await admin
          .from("employees")
          .delete()
          .eq(
            "id",
            managerEmployee.id
          );

        throw new Error(
          profileUpdateError.message
        );
      }

      const {
        error:
          applicationUpdateError,
      } =
        await admin
          .from(
            "job_applications"
          )
          .update({
            status:
              "HIRED_MANAGER",

            hired_as:
              "MANAGER",

            hired_by:
              user.id,

            hired_at:
              hiredAt,

            updated_at:
              hiredAt,
          })
          .eq(
            "id",
            application.id
          );

      if (
        applicationUpdateError
      ) {
        throw new Error(
          applicationUpdateError.message
        );
      }

      await writeAuditLog({
        action:
          "USER_HIRE_MANAGER",

        entityType:
          "EMPLOYEE",

        entityId:
          managerEmployee.id,

        description:
          `Hire ${application.ic_name} sebagai Manager`,

        metadata: {
          application_id:
            application.id,

          profile_id:
            application.user_id,

          employee_id:
            managerEmployee.id,

          ic_name:
            application.ic_name,

          email:
            application.email,

          seed:
            normalizedSeed,

          position:
            "MANAGER",

          join_date:
            joinDate,

          target_plants:
            0,

          hired_as:
            "MANAGER",

          hired_by:
            user.id,

          hired_by_name:
            actor.full_name,

          hired_by_role:
            actorRole,

          hired_at:
            hiredAt,
        },
      });

      return NextResponse.json({
        success: true,
        message:
          `${application.ic_name} berhasil di-hire sebagai Manager.`,
      });
    }

    // ========================================================
    // HIRE WORKER
    // ========================================================

    const {
      data: employee,
      error:
        employeeError,
    } =
      await admin
        .from("employees")
        .insert({
          profile_id:
            application.user_id,

          name:
            application.ic_name,

          forum_name:
            null,

          seed:
            normalizedSeed,

          position,

          join_date:
            joinDate,

          status:
            "ACTIVE",

          target_plants:
            defaultTargetPlants,
        })
        .select("id")
        .single();

    if (
      employeeError ||
      !employee
    ) {
      throw new Error(
        employeeError?.message ??
        "Gagal membuat Data Pegawai."
      );
    }

    const {
      error:
        profileUpdateError,
    } =
      await admin
        .from("profiles")
        .update({
          role:
            "EMPLOYEE",

          position,

          status:
            "ACTIVE",
        })
        .eq(
          "id",
          application.user_id
        );

    if (
      profileUpdateError
    ) {
      await admin
        .from("employees")
        .delete()
        .eq(
          "id",
          employee.id
        );

      throw new Error(
        profileUpdateError.message
      );
    }

    const {
      error:
        applicationUpdateError,
    } =
      await admin
        .from(
          "job_applications"
        )
        .update({
          status:
            "HIRED_WORKER",

          hired_as:
            "WORKER",

          hired_by:
            user.id,

          hired_at:
            hiredAt,

          updated_at:
            hiredAt,
        })
        .eq(
          "id",
          application.id
        );

    if (
      applicationUpdateError
    ) {
      throw new Error(
        applicationUpdateError.message
      );
    }

    await writeAuditLog({
      action:
        "USER_HIRE_WORKER",

      entityType:
        "EMPLOYEE",

      entityId:
        employee.id,

      description:
        `Hire ${application.ic_name} sebagai Worker`,

      metadata: {
        application_id:
          application.id,

        profile_id:
          application.user_id,

        employee_id:
          employee.id,

        ic_name:
          application.ic_name,

        email:
          application.email,

        seed:
          normalizedSeed,

        position,

        join_date:
          joinDate,

        target_plants:
          defaultTargetPlants,

        hired_by:
          user.id,

        hired_by_name:
          actor.full_name,

        hired_by_role:
          actorRole,

        hired_at:
          hiredAt,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        `${application.ic_name} berhasil di-hire sebagai Worker.`,
    });
  } catch (
    error
  ) {
    console.error(
      "HIRE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal melakukan hire.",
      },
      {
        status: 500,
      }
    );
  }
}

function getJakartaDate() {
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
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value;

  return `${year}-${month}-${day}`;
}