"use client";

import { useSignIn } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

const inputClass =
  "w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const isLoaded = fetchStatus !== "fetching";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await signIn.password({ identifier: email, password });
      if (signInError) {
        setError(signInError.longMessage ?? signInError.message);
        return;
      }
      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) {
          setError(finalizeError.longMessage ?? finalizeError.message);
        } else {
          router.push("/dashboard");
        }
      } else {
        setError("Se requiere un paso adicional de verificación.");
      }
    } catch {
      setError("Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mobileSubtitle="Iniciá sesión en tu taller">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bienvenido de vuelta</h1>
        <p className="text-sm text-gray-500 mt-1">Ingresá con tu cuenta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Email
          </label>
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Contraseña
            </label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              ¿Olvidaste la contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={`${inputClass} pr-10`}
              placeholder="••••••••"
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

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <span className="text-red-500 text-xs mt-0.5 shrink-0">✕</span>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !isLoaded}
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors mt-1 shadow-sm"
        >
          {loading ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿No tenés cuenta?{" "}
        <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-semibold">
          Registrate gratis
        </Link>
      </p>
    </AuthShell>
  );
}
