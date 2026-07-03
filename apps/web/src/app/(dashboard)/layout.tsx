import { Sidebar } from "@/components/sidebar";
import { OnboardingBanner } from "@/components/onboarding-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <OnboardingBanner />
        {children}
      </main>
    </div>
  );
}
