"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useMe } from "@/hooks/use-me";

export function OnboardingBanner() {
  const { data: me } = useMe();

  if (!me?.isOwner || me.workshop?.name !== "Mi Taller") return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-4 py-3">
      <p className="text-sm text-blue-800 dark:text-blue-300">
        <span className="font-semibold">Bienvenido a MecánicOS.</span> Personalizá el nombre,
        teléfono y dirección de tu taller para que aparezcan en los PDFs.
      </p>
      <Link
        href="/settings"
        className="flex items-center gap-1.5 shrink-0 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
      >
        <Settings size={13} />
        Configurar
      </Link>
    </div>
  );
}
