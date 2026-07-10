import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/providers/query-provider";
import { AuthTokenSync } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ThemedToaster } from "@/components/ui/themed-toaster";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: {
    default: "TallerOS — Software de gestión para talleres mecánicos",
    template: "%s | TallerOS",
  },
  description:
    "Sistema de gestión para talleres mecánicos: órdenes de trabajo digitales, bot de WhatsApp para mecánicos y notificaciones automáticas a clientes. Probalo gratis.",
  keywords: [
    "software taller mecánico",
    "gestión taller mecánico",
    "sistema taller mecánico",
    "app taller mecánico",
    "ordenes de trabajo taller",
  ],
  authors: [{ name: "TallerOS" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "TallerOS",
    title: "TallerOS — Software de gestión para talleres mecánicos",
    description:
      "Órdenes de trabajo digitales, bot de WhatsApp y asistente IA técnico. Todo lo que tu taller necesita para digitalizarse hoy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TallerOS — Software de gestión para talleres mecánicos",
    description:
      "Órdenes de trabajo digitales, bot de WhatsApp y asistente IA técnico.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <ClerkProvider afterSignOutUrl="/sign-in">
            <QueryProvider>
              <AuthTokenSync>{children}</AuthTokenSync>
              <ThemedToaster />
            </QueryProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
