"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400";

type Step = "request" | "verify";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [step, setStep]               = useState<Step>("request");
  const [email, setEmail]             = useState("");
  const [code, setCode]               = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setStep("verify");
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Error al enviar el código",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("No se pudo completar el restablecimiento. Intentá de nuevo.");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        err?.message ??
        "Código o contraseña inválidos",
      );
    } finally {
      setLoading(false);
    }
  }

  const ErrorBanner = error ? (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
      <span className="text-red-500 text-xs mt-0.5 shrink-0">✕</span>
      <p className="text-xs text-red-700">{error}</p>
    </div>
  ) : null;

  if (step === "verify") {
    return (
      <AuthShell mobileSubtitle="Restablecer contraseña">
        <div className="mb-7">
          <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mb-4">
            <KeyRound size={20} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enviamos un código a{" "}
            <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Código de verificación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              maxLength={6}
              autoComplete="one-time-code"
              inputMode="numeric"
              autoFocus
              className={`${inputClass} text-center tracking-[0.4em] text-xl font-mono`}
              placeholder="000000"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={`${inputClass} pr-10`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {ErrorBanner}

          <button
            type="submit"
            disabled={loading || !isLoaded || code.length < 6 || newPassword.length < 8}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "Restableciendo…" : "Restablecer contraseña"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("request"); setError(""); setCode(""); setNewPassword(""); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 transition-colors"
          >
            ← Volver
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell mobileSubtitle="Recuperar acceso">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ingresá tu email y te enviamos un código para restablecer el acceso.
        </p>
      </div>

      <form onSubmit={handleRequest} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className={inputClass}
            placeholder="vos@taller.com"
          />
        </div>

        {ErrorBanner}

        <button
          type="submit"
          disabled={loading || !isLoaded}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Enviando…" : "Enviar código"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
          ← Volver al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  );
}
