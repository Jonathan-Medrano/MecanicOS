"use client";

import Link from "next/link";
import { Wrench, ClipboardList, MessageSquare, Bot } from "lucide-react";

const FEATURES = [
  { icon: ClipboardList, text: "Órdenes de trabajo digitales" },
  { icon: MessageSquare, text: "Bot de WhatsApp para mecánicos" },
  { icon: Bot,           text: "Asistente técnico con IA" },
];

interface AuthShellProps {
  children: React.ReactNode;
  mobileSubtitle?: string;
}

export function AuthShell({ children, mobileSubtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left branding panel ─────────────────────────────── */}
      <aside className="hidden md:flex md:w-[42%] lg:w-[38%] bg-slate-900 flex-col justify-between p-10 relative overflow-hidden shrink-0">
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,#1e40af20,transparent)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-blue-600/5" />

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5 w-fit">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Wrench size={17} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">TallerOS</span>
        </Link>

        {/* Copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-[1.6rem] font-bold leading-snug mb-3">
              Tu taller mecánico,<br />
              <span className="text-blue-400">digitalizado hoy.</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Gestioná órdenes, clientes y vehículos desde cualquier dispositivo.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/15 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 TallerOS</p>
      </aside>

      {/* ── Right form panel ────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white min-h-screen">
        {/* Mobile-only logo */}
        <div className="md:hidden mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Wrench size={15} className="text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">TallerOS</span>
          </Link>
          {mobileSubtitle && (
            <p className="text-sm text-gray-500 mt-1">{mobileSubtitle}</p>
          )}
        </div>

        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}
