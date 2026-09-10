"use client";

import { useState } from "react";

type Props = {
  userId: string;
  userName: string;
  currentUserId: string;
};

export default function UserActions({
  userId,
  userName,
  currentUserId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isCurrentUser =
    userId === currentUserId;

  async function resetPassword() {
    setMessage("");

    const password =
      window.prompt(
        `Password baru untuk ${userName}:\n\nMinimal 8 karakter.`
      );

    if (password === null) {
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password minimal 8 karakter."
      );
      return;
    }

    const confirmPassword =
      window.prompt(
        "Ketik ulang password baru:"
      );

    if (confirmPassword === null) {
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setMessage(
        "Konfirmasi password tidak sama."
      );
      return;
    }

    const targetName =
      isCurrentUser
        ? `${userName} (akun kamu sendiri)`
        : userName;

    const confirmed =
      window.confirm(
        `Reset password akun ${targetName}?`
      );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/users/reset-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              user_id: userId,
              password,
            }),
          }
        );

      const text =
        await response.text();

      let result: {
        success?: boolean;
        error?: string;
        message?: string;
      } = {};

      if (text) {
        try {
          result =
            JSON.parse(text);
        } catch {
          throw new Error(
            `Response server tidak valid. HTTP ${response.status}.`
          );
        }
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Gagal reset password."
        );
      }

      setMessage(
        result.message ??
          "Password berhasil direset."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={resetPassword}
        disabled={loading}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Reset..."
          : "Reset Password"}
      </button>

      {isCurrentUser && (
        <p className="text-[10px] text-zinc-600">
          Akun kamu
        </p>
      )}

      {message && (
        <p className="max-w-xs text-right text-xs text-zinc-400">
          {message}
        </p>
      )}
    </div>
  );
}