"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = {
  id: string;
  name: string;
  seed: string;
  profile_id: string | null;
};

type Props = {
  employees: Employee[];
};

export default function UserForm({
  employees,
}: Props) {
  const router = useRouter();

  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("EMPLOYEE");

  const [employeeId, setEmployeeId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const availableEmployees =
    employees.filter(
      (employee) =>
        !employee.profile_id
    );

  async function createUser() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!fullName.trim()) {
      setErrorMessage(
        "Nama lengkap wajib diisi."
      );
      return;
    }

    if (!email.trim()) {
      setErrorMessage(
        "Email wajib diisi."
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    if (
      role === "EMPLOYEE" &&
      !employeeId
    ) {
      setErrorMessage(
        "Pilih pegawai yang akan dihubungkan."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              full_name:
                fullName.trim(),

              email:
                email.trim(),

              password,

              role,

              employee_id:
                role === "EMPLOYEE"
                  ? employeeId
                  : null,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Gagal membuat akun."
        );
      }

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("EMPLOYEE");
      setEmployeeId("");

      setSuccessMessage(
        "Akun berhasil dibuat."
      );

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal membuat akun."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="font-semibold text-white">
          Tambah User
        </h2>

        <p className="mt-1 text-xs text-zinc-500">
          Buat akun login Jackson Farm.
        </p>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
            Nama Lengkap
          </label>

          <input
            value={fullName}
            onChange={(event) =>
              setFullName(
                event.target.value
              )
            }
            placeholder="Aiyana Amadahi"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="aiyana@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Minimal 8 karakter"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
            Role
          </label>

          <select
            value={role}
            onChange={(event) => {
              const newRole =
                event.target.value;

              setRole(newRole);

              if (
                newRole !== "EMPLOYEE"
              ) {
                setEmployeeId("");
              }
            }}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
          >
            <option value="EMPLOYEE">
              EMPLOYEE
            </option>

            <option value="MANAGER">
              MANAGER
            </option>

            <option value="OWNER">
              OWNER
            </option>
          </select>
        </div>

        {role === "EMPLOYEE" && (
          <div className="lg:col-span-2">
            <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-500">
              Hubungkan Pegawai
            </label>

            <select
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-white"
            >
              <option value="">
                Pilih Pegawai
              </option>

              {availableEmployees.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.name}
                    {" — "}
                    {employee.seed}
                  </option>
                )
              )}
            </select>

            {availableEmployees.length === 0 && (
              <p className="mt-2 text-xs text-yellow-500">
                Semua pegawai sudah memiliki akun.
              </p>
            )}
          </div>
        )}

        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={createUser}
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Membuat Akun..."
              : "Buat Akun"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        </div>
      )}

      {successMessage && (
        <div className="px-5 pb-5">
          <div className="rounded-lg border border-green-900 bg-green-950/20 px-4 py-3 text-sm text-green-400">
            {successMessage}
          </div>
        </div>
      )}
    </div>
  );
}