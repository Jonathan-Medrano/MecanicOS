import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Wrench, MessageSquare, Bot, BarChart3, CheckCircle, ArrowRight, Zap } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Software de gestión para talleres mecánicos — TallerOS",
  description:
    "TallerOS es el sistema de gestión para talleres mecánicos con órdenes de trabajo digitales, bot de WhatsApp para mecánicos y notificaciones automáticas a clientes. Sin instalación. Probalo gratis.",
  alternates: {
    canonical: "/",
    languages: { "es-AR": "/" },
  },
};

const FEATURES = [
  {
    icon: Wrench,
    title: "Órdenes de trabajo digitales",
    desc: "Creá, seguí y cerrá trabajos desde cualquier dispositivo. Presupuestos, repuestos y mano de obra en un solo lugar.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: MessageSquare,
    title: "Bot de WhatsApp para mecánicos",
    desc: "Tus mecánicos actualizan órdenes por voz o texto desde su WhatsApp personal. Sin apps nuevas, sin capacitación.",
    color: "text-green-600 bg-green-50",
  },
  {
    icon: Zap,
    title: "Notificaciones automáticas a clientes",
    desc: "Cuando el auto está listo, el cliente recibe un WhatsApp automático. Menos llamadas, más satisfacción.",
    color: "text-orange-600 bg-orange-50",
  },
  {
    icon: Bot,
    title: "Asistente técnico con IA",
    desc: "Consultá procedimientos, torques, fallas comunes y diagnósticos. Respuestas técnicas al instante.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: BarChart3,
    title: "Dashboard en tiempo real",
    desc: "Ingresos del mes, órdenes activas, clientes nuevos. Todo lo que necesitás para tomar decisiones.",
    color: "text-indigo-600 bg-indigo-50",
  },
];

const BENEFITS = [
  "Sin instalación — corre en el navegador",
  "Multi-usuario con permisos por rol",
  "Historial completo de cada vehículo",
  "PDF de presupuesto con un clic",
  "Funciona desde el celular",
  "Datos en la nube, siempre disponibles",
];

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TallerOS",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Sistema de gestión para talleres mecánicos con órdenes de trabajo digitales, bot de WhatsApp y asistente técnico con IA.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "ARS",
    description: "Cuenta gratuita disponible",
  },
  featureList: [
    "Órdenes de trabajo digitales",
    "Bot de WhatsApp para mecánicos",
    "Notificaciones automáticas a clientes",
    "Asistente técnico con inteligencia artificial",
    "Dashboard con métricas en tiempo real",
    "Gestión de clientes y vehículos",
    "Generación de PDF de presupuestos",
  ],
  inLanguage: "es-AR",
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Talleres mecánicos",
  },
};

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }}
      />

      <div className="min-h-screen bg-white font-sans">
        {/* Nav */}
        <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <span className="font-bold text-gray-900 text-lg tracking-tight">TallerOS</span>
            <nav className="flex items-center gap-3">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir al taller <ArrowRight size={14} />
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Empezá gratis
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" aria-hidden="true" />
            Software de gestión para talleres mecánicos
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5 max-w-3xl mx-auto">
            El sistema de gestión que tu{" "}
            <span className="text-blue-600">taller mecánico</span> necesita
          </h1>

          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            Órdenes de trabajo digitales, bot de WhatsApp para mecánicos y notificaciones
            automáticas a clientes. Todo en un sistema pensado para talleres reales.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-sm"
              >
                Ir al taller <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-sm"
                >
                  Empezá gratis <ArrowRight size={16} />
                </Link>
                <Link
                  href="/sign-in"
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-3"
                >
                  Ya tengo cuenta →
                </Link>
              </>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-4">Sin tarjeta de crédito. Sin instalación.</p>
        </section>

        {/* Features */}
        <section aria-label="Funcionalidades" className="max-w-5xl mx-auto px-4 pb-20">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${f.color}`} aria-hidden="true">
                  <f.icon size={18} />
                </div>
                <h2 className="font-semibold text-gray-900 text-sm mb-1.5">{f.title}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section aria-label="Características" className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">
              Todo lo que necesitás para gestionar tu taller
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-green-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-600">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Tu taller mecánico, digitalizado hoy
          </h2>
          <p className="text-gray-500 mb-7 text-sm">
            Configuración en menos de 5 minutos. Sin contratos, sin sorpresas.
          </p>
          {!isSignedIn && (
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-7 py-3 rounded-xl hover:bg-blue-700 transition-colors text-sm shadow-sm"
            >
              Crear cuenta gratis <ArrowRight size={15} />
            </Link>
          )}
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
          © 2026 TallerOS. Todos los derechos reservados.
        </footer>
      </div>
    </>
  );
}
