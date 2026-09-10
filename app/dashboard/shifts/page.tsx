import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ShiftsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  if (
    profileError ||
    !profile ||
    profile.status !== "ACTIVE"
  ) {
    redirect("/login");
  }

  const role = String(
    profile.role
  ).toUpperCase();

  if (
    role === "OWNER" ||
    role === "MANAGER"
  ) {
    redirect("/dashboard/shifts/admin");
  }

  if (role === "EMPLOYEE") {
    redirect("/dashboard/shifts/mine");
  }

  redirect("/dashboard");
}