"use client";

import { useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400";

type Step = "register" | "verify";

export default function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const isLoaded = fetchStatus !== "fetching";

  const [step, setStep]         = useState<Step>("register");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [code, setCode]         = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function finalize() {
    const { error: finalizeError } = await signUp!.finalize();
    if (finalizeError) throw finalizeError;
    window.location.href = "/dashboard";
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    setError("");
    try {
      const { error: pwError } = await signUp.password({ emailAddress: email, password });
      if (pwError) throw pwError;
      if (signUp.status === "complete") { await finalize(); return; }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) throw sendError;
      setStep("verify");
    } catch (err: any) {
      setError(
        err?.longMessage ?? err?.message ??
        err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ??
        "Error al registrarse",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setLoading(true);
    setError("");
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) throw verifyError;
      if (signUp.status !== "complete") {
        throw new Error(`Verificación incompleta: ${signUp.missingFields.join(", ") || "desconocido"}`);
      }
      await finalize();
    } catch (err: any) {
      setError(
        err?.longMessage ?? err?.message ??
        err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ??
        "Código incorrecto",
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
      <AuthShell mobileSubtitle="Verificá tu email">
        <div className="mb-7">
          <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center mb-4">
            <Mail size={20} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revisá tu email</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enviamos un código de 6 dígitos a{" "}
            <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
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
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              En modo test podés usar el código{" "}
              <span className="font-mono font-semibold text-gray-600">424242</span>
            </p>
          </div>

          {ErrorBanner}

          <button
            type="submit"
            disabled={loading || !isLoaded || code.length < 6}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "Verificando…" : "Verificar email"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("register"); setError(""); setCode(""); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 transition-colors"
          >
            ← Volver
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell mobileSubtitle="Creá tu cuenta gratis">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Empezá gratis</h1>
        <p className="text-sm text-gray-500 mt-1">Sin tarjeta de crédito. Sin instalación.</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
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

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Contraseña
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
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

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Confirmá la contraseña
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {ErrorBanner}

        <button
          type="submit"
          disabled={loading || !isLoaded}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors mt-1 shadow-sm"
        >
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tenés cuenta?{" "}
        <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
          Iniciá sesión
        </Link>
      </p>
    </AuthShell>
  );
}
