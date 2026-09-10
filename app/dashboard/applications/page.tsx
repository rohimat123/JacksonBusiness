import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import ApplicationActions from "./application-actions";

export default async function ApplicationsPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login"
    );
  }

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        "profiles"
      )
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

  const role =
    String(
      profile?.role ??
        ""
    ).toUpperCase();

  if (
    !profile ||
    profile.status !==
      "ACTIVE" ||
    (
      role !==
        "OWNER" &&
      role !==
        "MANAGER"
    )
  ) {
    redirect(
      "/dashboard"
    );
  }

  // Service-role read diperlukan
  // karena applications tidak dibuka via RLS browser.
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
      "Service Role belum dikonfigurasi."
    );
  }

  const {
    createClient:
      createAdminClient,
  } =
    await import(
      "@supabase/supabase-js"
    );

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
    data:
      applications,
    error,
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
        status,
        created_at
      `)
      .eq(
        "status",
        "PENDING"
      )
      .order(
        "created_at",
        {
          ascending:
            true,
        }
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Management
        </p>

        <h1 className="mt-1 text-3xl font-bold text-white">
          Applicants
        </h1>

        <p className="mt-2 text-sm text-zinc-500">
          Owner dapat hire Manager
          atau Worker. Manager hanya
          dapat hire Worker.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50">
        <div className="border-b border-zinc-800 px-5 py-4">
          <p className="font-semibold text-white">
            Pending Applications
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {
              applications?.length ??
              0
            }{" "}
            applicant
          </p>
        </div>

        {!applications ||
        applications.length ===
          0 ? (
          <div className="px-5 py-14 text-center text-sm text-zinc-600">
            Tidak ada applicant
            pending.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/40 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Nama IC
                  </th>

                  <th className="px-5 py-4">
                    Email
                  </th>

                  <th className="px-5 py-4">
                    Daftar
                  </th>

                  <th className="px-5 py-4 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800">
                {applications.map(
                  (
                    application
                  ) => (
                    <tr
                      key={
                        application.id
                      }
                    >
                      <td className="px-5 py-4 font-semibold text-white">
                        {
                          application.ic_name
                        }
                      </td>

                      <td className="px-5 py-4 text-zinc-400">
                        {
                          application.email
                        }
                      </td>

                      <td className="px-5 py-4 text-zinc-500">
                        {formatDate(
                          application.created_at
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <ApplicationActions
                          applicationId={
                            application.id
                          }
                          applicantName={
                            application.ic_name
                          }
                          currentRole={
                            role
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
      timeZone:
        "Asia/Jakarta",
    }
  ).format(
    new Date(
      value
    )
  );
}