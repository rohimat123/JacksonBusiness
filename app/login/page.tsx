"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/client";

export default function LoginPage() {
  const router =
    useRouter();

  const supabase =
    createClient();

  const [
    identifier,
    setIdentifier,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  // ==========================================================
  // LOGIN
  // ==========================================================

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    const loginIdentifier =
      identifier.trim();

    if (
      !loginIdentifier ||
      !password
    ) {
      setError(
        "Email / Nama IC dan password wajib diisi."
      );

      setLoading(false);
      return;
    }

    try {
      let loginEmail =
        loginIdentifier;

      // ======================================================
      // JIKA BUKAN EMAIL
      // Anggap sebagai Nama IC
      // ======================================================

      if (
        !loginIdentifier.includes(
          "@"
        )
      ) {
        const response =
          await fetch(
            "/api/auth/resolve-login",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  identifier:
                    loginIdentifier,

                  password,
                }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success ||
          !result.email
        ) {
          setError(
            result.error ??
              "Nama IC atau password salah."
          );

          setLoading(false);
          return;
        }

        loginEmail =
          String(
            result.email
          );
      }

      // ======================================================
      // LOGIN SUPABASE
      // ======================================================

      const {
        error:
          loginError,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              loginEmail,

            password,
          });

      if (loginError) {
        setError(
          "Email / Nama IC atau password salah."
        );

        setLoading(false);
        return;
      }

      // ======================================================
      // SUCCESS
      // ======================================================

      router.push(
        "/dashboard"
      );

      router.refresh();
    } catch (
      loginError
    ) {
      console.error(
        "Login error:",
        loginError
      );

      setError(
        "Terjadi kesalahan saat login. Silakan coba lagi."
      );

      setLoading(false);
    }
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        {/* HEADER */}

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Jackson Business
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Internal Management Portal
          </p>
        </div>

        {/* LOGIN FORM */}

        <form
          onSubmit={
            handleLogin
          }
          className="space-y-5"
        >
          {/* IDENTIFIER */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Email / Nama IC
            </label>

            <input
              type="text"
              value={
                identifier
              }
              onChange={(
                e
              ) =>
                setIdentifier(
                  e.target
                    .value
                )
              }
              placeholder="Matheo Janqueira atau email"
              autoComplete="username"
              spellCheck={
                false
              }
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
            />

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Pegawai dapat
              login menggunakan
              Nama IC tanpa perlu
              mengingat email.
            </p>
          </div>

          {/* PASSWORD */}

          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              Password
            </label>

            <input
              type="password"
              value={
                password
              }
              onChange={(
                e
              ) =>
                setPassword(
                  e.target
                    .value
                )
              }
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
            />

            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-400 transition hover:text-white"
              >
                Lupa
                Password?
              </Link>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* LOGIN */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Memproses..."
              : "Login"}
          </button>
        </form>

        {/* REGISTER */}

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-800" />

            <span className="text-xs text-zinc-500">
              atau
            </span>

            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <p className="mt-5 text-center text-sm text-zinc-400">
            Belum punya
            akun?
          </p>

          <Link
            href="/register"
            className="mt-3 block w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Daftar sebagai
            Employee
          </Link>

          <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
            Akun yang baru
            didaftarkan harus
            menunggu
            persetujuan Owner
            atau Manager.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Authorized
          personnel only
        </p>
      </div>
    </main>
  );
}