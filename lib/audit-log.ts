import "server-only";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

type AuditLogInput = {
  action: string;

  entityType?: string | null;
  entityId?: string | null;

  description?: string | null;

  metadata?: Record<
    string,
    unknown
  >;
};

export async function writeAuditLog({
  action,
  entityType = null,
  entityId = null,
  description = null,
  metadata = {},
}: AuditLogInput) {
  try {
    // ========================================================
    // USER YANG SEDANG LOGIN
    // ========================================================

    const supabase =
      await createServerClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      console.error(
        "AUDIT LOG: User tidak ditemukan.",
        userError?.message
      );

      return {
        success: false,
      };
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
        full_name,
        role
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "AUDIT LOG PROFILE ERROR:",
        profileError.message
      );
    }

    // ========================================================
    // ENV
    // ========================================================

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env
        .SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error(
        "AUDIT LOG ERROR: NEXT_PUBLIC_SUPABASE_URL tidak ditemukan."
      );

      return {
        success: false,
      };
    }

    if (!serviceRoleKey) {
      console.error(
        "AUDIT LOG ERROR: SUPABASE_SERVICE_ROLE_KEY tidak ditemukan."
      );

      return {
        success: false,
      };
    }

    // ========================================================
    // ADMIN CLIENT
    // ========================================================

    const admin =
      createSupabaseAdmin(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      );

    // ========================================================
    // INSERT AUDIT LOG
    // ========================================================

    const {
      data: insertedLog,
      error: insertError,
    } = await admin
      .from("audit_logs")
      .insert({
        actor_id:
          user.id,

        actor_name:
          profile?.full_name ??
          user.email ??
          "Unknown User",

        actor_role:
          profile?.role
            ? String(
                profile.role
              )
            : null,

        action:
          action,

        entity_type:
          entityType,

        entity_id:
          entityId,

        description:
          description,

        metadata:
          metadata ?? {},
      })
      .select(`
        id,
        action,
        created_at
      `)
      .single();

    if (insertError) {
      console.error(
        "======================================"
      );

      console.error(
        "AUDIT LOG INSERT ERROR:"
      );

      console.error(
        insertError.message
      );

      console.error(
        insertError.details
      );

      console.error(
        insertError.hint
      );

      console.error(
        "======================================"
      );

      return {
        success: false,
      };
    }

    console.log(
      `✅ AUDIT LOG: ${action} | ${insertedLog.id}`
    );

    return {
      success: true,
      id: insertedLog.id,
    };
  } catch (
    error
  ) {
    console.error(
      "======================================"
    );

    console.error(
      "AUDIT LOG FATAL ERROR:"
    );

    console.error(
      error
    );

    console.error(
      "======================================"
    );

    return {
      success: false,
    };
  }
}