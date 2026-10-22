"use client";

import Link from "next/link";
import { Wrench, ClipboardList, MessageSquare, Bot } from "lucide-react";

const FEATURES = [
  { icon: ClipboardList, text: "Órdenes de trabajo digitales" },
  { icon: MessageSquare, text: "Bot de WhatsApp para clientes" },
  { icon: Bot,           text: "Asistente técnico con IA" },
];

const STATS = [
  { value: "3x", label: "más rápido en admin" },
  { value: "0", label: "papeles" },
  { value: "24/7", label: "acceso desde cualquier lugar" },
];

interface AuthShellProps {
  children: React.ReactNode;
  mobileSubtitle?: string;
}

export function AuthShell({ children, mobileSubtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ─────────────────────────────── */}
      <aside className="hidden md:flex md:w-[44%] lg:w-[40%] bg-slate-950 flex-col justify-between p-10 lg:p-12 relative overflow-hidden shrink-0">
        {/* Dot grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle, #6b7280 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Blue glow top-left */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_-10%_-5%,#1d4ed830,transparent)]" />
        {/* Bottom-right orb */}
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-700/10 blur-3xl" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 w-fit group">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 group-hover:bg-blue-500 transition-colors">
            <Wrench size={17} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">MecánicOS</span>
        </Link>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Software de taller mecánico
            </p>
            <h2 className="text-white text-3xl font-bold leading-tight mb-4">
              Tu taller,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                digitalizado hoy.
              </span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Gestioná órdenes, clientes y vehículos desde cualquier dispositivo. Sin instalación.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-white font-bold text-lg leading-none">{value}</p>
                <p className="text-slate-500 text-[10px] mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 MecánicOS · Todos los derechos reservados</p>
      </aside>

      {/* ── Right form panel ────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-6 py-12 min-h-screen">
        {/* Mobile-only logo */}
        <div className="md:hidden mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wrench size={15} className="text-white" />
            </div>
            <span className="text-gray-900 dark:text-gray-100 font-bold text-lg tracking-tight">MecánicOS</span>
          </Link>
          {mobileSubtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mobileSubtitle}</p>
          )}
        </div>

        {/* Form card */}
        <div className="animate-fade-in-up w-full max-w-[380px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-900/[0.08] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
