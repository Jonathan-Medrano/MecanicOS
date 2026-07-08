"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

type Step = "request" | "verify";

export default function ForgotPasswordPage() {
  const { signIn, fetchStatus } = useSignIn();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isLoaded = fetchStatus !== "fetching";

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setLoading(true);
    setError("");
    try {
      await signIn.create({ identifier: email });
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setStep("verify");
    } catch (err: any) {
      setError(err?.longMessage ?? err?.errors?.[0]?.longMessage ?? "Error al enviar el código");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setLoading(true);
    setError("");
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (verifyError) throw verifyError;
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword });
      if (submitError) throw submitError;
      await signIn.finalize();
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.longMessage ?? err?.errors?.[0]?.longMessage ?? "Código o contraseña inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">TallerOS</h1>
          <p className="text-sm text-gray-500 mt-1">Recuperar contraseña</p>
        </div>

        {step === "request" ? (
          <form onSubmit={handleRequest} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <p className="text-sm text-gray-600">
              Ingresá tu email y te enviamos un código para restablecer tu contraseña.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="vos@taller.com"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Enviando..." : "Enviar código"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
            <p className="text-sm text-gray-600">
              Te enviamos un código a <span className="font-medium">{email}</span>. Ingresalo junto a tu nueva contraseña.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest font-mono text-lg"
                placeholder="123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Restableciendo..." : "Restablecer contraseña"}
            </button>

            <button
              type="button"
              onClick={() => setStep("request")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              ← Volver
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            ← Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
