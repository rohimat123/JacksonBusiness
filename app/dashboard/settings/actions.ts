"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createClient,
} from "@/lib/supabase/server";

type UpdateSettingsInput = {
  id: string;

  system_name: string;

  storage_capacity: number;

  payroll_rate: number;

  ssrp_rate: number;

  default_target_plants: number;

  payroll_period_days: number;
};

export async function updateSettings(
  input: UpdateSettingsInput
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error:
        "Kamu belum login.",
    };
  }

  const {
    data: profile,
    error:
      profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        role,
        status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    return {
      success: false,
      error:
        "Profile tidak ditemukan.",
    };
  }

  if (
    String(
      profile.role
    ).toUpperCase() !==
    "OWNER"
  ) {
    return {
      success: false,
      error:
        "Hanya OWNER yang dapat mengubah Settings.",
    };
  }

  const systemName =
    input.system_name.trim();

  if (!systemName) {
    return {
      success: false,
      error:
        "Nama sistem tidak boleh kosong.",
    };
  }

  if (
    input.storage_capacity <
    1
  ) {
    return {
      success: false,
      error:
        "Storage capacity harus lebih dari 0.",
    };
  }

  if (
    input.payroll_rate <
    0
  ) {
    return {
      success: false,
      error:
        "Payroll rate tidak valid.",
    };
  }

  if (
    input.ssrp_rate <
    0
  ) {
    return {
      success: false,
      error:
        "SSRP rate tidak valid.",
    };
  }

  if (
    input.default_target_plants <
    0
  ) {
    return {
      success: false,
      error:
        "Default target tidak valid.",
    };
  }

  if (
    input.payroll_period_days <
    1
  ) {
    return {
      success: false,
      error:
        "Payroll period minimal 1 hari.",
    };
  }

  const {
    error,
  } =
    await supabase
      .from(
        "system_settings"
      )
      .update({
        system_name:
          systemName,

        storage_capacity:
          input.storage_capacity,

        payroll_rate:
          input.payroll_rate,

        ssrp_rate:
          input.ssrp_rate,

        default_target_plants:
          input.default_target_plants,

        payroll_period_days:
          input.payroll_period_days,

        updated_by:
          user.id,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        input.id
      );

  if (error) {
    return {
      success: false,
      error:
        error.message,
    };
  }

  revalidatePath(
    "/dashboard/settings"
  );

  revalidatePath(
    "/dashboard"
  );

  revalidatePath(
    "/dashboard/targets"
  );

  revalidatePath(
    "/dashboard/salary"
  );

  revalidatePath(
    "/dashboard/payroll"
  );

  revalidatePath(
    "/dashboard/salary/mine"
  );

  revalidatePath(
    "/dashboard/recap"
  );

  return {
    success: true,
  };
}