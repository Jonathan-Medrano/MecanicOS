"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { OnboardingBanner } from "@/components/onboarding-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 text-gray-500 rounded-md hover:bg-gray-100 active:bg-gray-200"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-900 text-sm">TallerOS</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <OnboardingBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
