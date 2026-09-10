"use client";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

export default function RegisterPage() {
  const [icName, setIcName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    confirmNotUcp,
    setConfirmNotUcp,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!icName.trim()) {
      setErrorMessage(
        "Nama IC wajib diisi."
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
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "Konfirmasi password tidak sama."
      );
      return;
    }

    if (!confirmNotUcp) {
      setErrorMessage(
        "Centang konfirmasi bahwa password bukan password UCP."
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              icName:
                icName.trim(),

              email:
                email
                  .trim()
                  .toLowerCase(),

              password,

              confirmNotUcp:
                true,
            }),
          }
        );

      const raw =
        await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
      } = {};

      if (raw) {
        try {
          result =
            JSON.parse(raw);
        } catch {
          throw new Error(
            `Server mengembalikan response tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Pendaftaran gagal."
        );
      }

      setSuccessMessage(
        result.message ??
          "Pendaftaran berhasil."
      );

      setIcName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setConfirmNotUcp(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pendaftaran gagal."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-md">
        {/* HEADER */}

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            Jackson Farm
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Employee Registration
          </p>
        </div>

        {/* CARD */}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        >
          <div>
            <h2 className="text-xl font-bold text-white">
              Daftar Employee
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Isi data akun untuk
              mendaftar ke Jackson
              Farm. Posisi dan status
              kerja akan ditentukan
              oleh Owner / Manager.
            </p>
          </div>

          {/* NAMA IC */}

          <div className="mt-6">
            <label
              htmlFor="ic-name"
              className="text-sm font-medium text-zinc-300"
            >
              Nama IC
            </label>

            <input
              id="ic-name"
              type="text"
              autoComplete="name"
              value={
                icName
              }
              onChange={(
                event
              ) =>
                setIcName(
                  event.target.value
                )
              }
              required
              placeholder="Contoh: Matheo Jackson"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
            />
          </div>

          {/* EMAIL */}

          <div className="mt-4">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={
                email
              }
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              required
              placeholder="email@example.com"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
            />
          </div>

          {/* PASSWORD */}

          <div className="mt-4">
            <label
              htmlFor="password"
              className="text-sm font-medium text-zinc-300"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target.value
                )
              }
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
            />

            <div className="mt-3 rounded-xl border border-yellow-900/60 bg-yellow-950/20 p-3">
              <p className="text-xs font-semibold text-yellow-400">
                ⚠ Jangan gunakan
                password UCP.
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Gunakan password
                khusus untuk Jackson
                Farm Management
                System.
              </p>
            </div>
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="mt-4">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-zinc-300"
            >
              Konfirmasi Password
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={
                confirmPassword
              }
              onChange={(
                event
              ) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              required
              minLength={8}
              placeholder="Ketik ulang password"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-zinc-600"
            />
          </div>

          {/* NOT UCP CONFIRMATION */}

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <input
              type="checkbox"
              checked={
                confirmNotUcp
              }
              onChange={(
                event
              ) =>
                setConfirmNotUcp(
                  event.target.checked
                )
              }
              className="mt-1"
            />

            <span className="text-sm leading-6 text-zinc-400">
              Saya memastikan
              password ini{" "}
              <strong className="text-white">
                bukan password UCP
              </strong>
              .
            </span>
          </label>

          {/* ERROR */}

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 px-4 py-3 text-sm text-red-400">
              {
                errorMessage
              }
            </div>
          )}

          {/* SUCCESS */}

          {successMessage && (
            <div className="mt-5 rounded-xl border border-green-900 bg-green-950/20 px-4 py-3 text-sm leading-6 text-green-400">
              {
                successMessage
              }
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading
            }
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Mendaftar..."
              : "Daftar"}
          </button>

          {/* BACK */}

          <Link
            href="/login"
            className="mt-3 block w-full rounded-xl border border-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900"
          >
            ← Kembali ke Login
          </Link>
        </form>
      </div>
    </main>
  );
}