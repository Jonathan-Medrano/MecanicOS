import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/providers/query-provider";
import { AuthTokenSync } from "@/providers/auth-provider";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "TallerOS",
  description: "Gestión inteligente para talleres mecánicos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50">
        <ClerkProvider afterSignOutUrl="/sign-in">
          <QueryProvider>
            <AuthTokenSync>{children}</AuthTokenSync>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
