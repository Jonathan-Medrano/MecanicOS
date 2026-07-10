import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  Wrench,
  MessageSquare,
  Bot,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Zap,
  BadgeDollarSign,
  Clock,
} from "lucide-react";
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
    darkColor: "dark:bg-blue-950/50",
  },
  {
    icon: MessageSquare,
    title: "Bot de WhatsApp para mecánicos",
    desc: "Tus mecánicos actualizan órdenes por voz o texto desde su WhatsApp personal. Sin apps nuevas, sin capacitación.",
    color: "text-green-600 bg-green-50",
    darkColor: "dark:bg-green-950/50",
  },
  {
    icon: Zap,
    title: "Notificaciones automáticas a clientes",
    desc: "Cuando el auto está listo, el cliente recibe un WhatsApp automático. Menos llamadas, más satisfacción.",
    color: "text-orange-600 bg-orange-50",
    darkColor: "dark:bg-orange-950/50",
  },
  {
    icon: Bot,
    title: "Asistente técnico con IA",
    desc: "Consultá procedimientos, torques, fallas comunes y diagnósticos. Respuestas técnicas al instante.",
    color: "text-purple-600 bg-purple-50",
    darkColor: "dark:bg-purple-950/50",
  },
  {
    icon: BarChart3,
    title: "Dashboard en tiempo real",
    desc: "Ingresos del mes, órdenes activas, clientes nuevos. Todo lo que necesitás para tomar decisiones.",
    color: "text-indigo-600 bg-indigo-50",
    darkColor: "dark:bg-indigo-950/50",
  },
  {
    icon: BadgeDollarSign,
    title: "Control de cobros",
    desc: "Sabé en todo momento qué trabajos están sin cobrar. Filtros por estado de pago, sin planillas de Excel.",
    color: "text-emerald-600 bg-emerald-50",
    darkColor: "dark:bg-emerald-950/50",
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
    "Control de cobros",
  ],
  inLanguage: "es-AR",
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Talleres mecánicos",
  },
};

function ProductPreview() {
  return (
    <div className="relative" aria-hidden="true" role="presentation">
      {/* Glow behind card */}
      <div className="absolute -inset-4 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-3xl blur-2xl opacity-70" />

      {/* Browser chrome */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Browser top bar */}
        <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center gap-3">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white dark:bg-gray-700 rounded-md px-3 py-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono border border-gray-200 dark:border-gray-600 text-center">
            app.talleros.com/dashboard
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Dashboard</p>
            <div className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-md font-medium">
              + Nueva orden
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-blue-700 dark:text-blue-300">8</p>
              <p className="text-[10px] text-blue-500 dark:text-blue-400">Activas</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">$245k</p>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400">Este mes</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">3</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Hoy</p>
            </div>
          </div>

          {/* Order rows */}
          <div className="space-y-2">
            {[
              { desc: "Cambio de aceite y filtros", plate: "ABC 123", client: "Juan G.", status: "En progreso", statusColor: "bg-blue-100 text-blue-700" },
              { desc: "Reparación de frenos", plate: "DEF 456", client: "María L.", status: "Listo ✓", statusColor: "bg-green-100 text-green-700" },
              { desc: "Correa de distribución", plate: "GHI 789", client: "Luis M.", status: "Pendiente", statusColor: "bg-yellow-100 text-yellow-700" },
            ].map((row) => (
              <div key={row.plate} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Wrench size={12} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 truncate">{row.desc}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{row.client} · <span className="font-mono">{row.plate}</span></p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${row.statusColor}`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>

          {/* WhatsApp notification badge */}
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-lg p-2.5">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <MessageSquare size={10} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-green-800 dark:text-green-300">WhatsApp enviado</p>
              <p className="text-[9px] text-green-600 dark:text-green-400 truncate">✅ Tu vehículo está listo para retirar, Juan!</p>
            </div>
            <span className="text-[9px] text-green-500 dark:text-green-400 shrink-0 flex items-center gap-1">
              <Clock size={8} /> ahora
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }}
      />

      <div className="min-h-screen bg-white dark:bg-gray-900 font-sans">
        {/* Nav */}
        <header className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur z-50">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                <Wrench size={14} className="text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100 text-lg tracking-tight">TallerOS</span>
            </Link>
            <nav className="flex items-center gap-3">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Ir al taller <ArrowRight size={14} />
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Empezá gratis
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="relative max-w-5xl mx-auto px-4 pt-16 pb-12 overflow-hidden">
          {/* Background gradient blob */}
          <div
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[900px] h-[600px] opacity-50"
            style={{
              background: "radial-gradient(ellipse 70% 50% at 50% 0%, var(--hero-glow), transparent)",
            }}
          />

          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: copy */}
            <div className="text-center lg:text-left">
              <div className="animate-fade-in inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100 dark:border-blue-900">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" aria-hidden="true" />
                Software de gestión para talleres mecánicos
              </div>

              <h1 className="animate-fade-in-up delay-75 text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 leading-tight tracking-tight mb-5">
                El sistema de gestión que tu{" "}
                <span className="text-blue-600">taller mecánico</span> necesita
              </h1>

              <p className="animate-fade-in-up delay-150 text-lg text-gray-500 dark:text-gray-400 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Órdenes de trabajo digitales, bot de WhatsApp para mecánicos y notificaciones
                automáticas a clientes. Todo en un sistema pensado para talleres reales.
              </p>

              <div className="animate-fade-in-up delay-250 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                {isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-base shadow-md shadow-blue-500/20"
                  >
                    Ir al taller <ArrowRight size={16} />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/sign-up"
                      className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-base shadow-md shadow-blue-500/20"
                    >
                      Empezá gratis <ArrowRight size={16} />
                    </Link>
                    <Link
                      href="/sign-in"
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium px-4 py-3 transition-colors"
                    >
                      Ya tengo cuenta →
                    </Link>
                  </>
                )}
              </div>

              <p className="animate-fade-in-up delay-350 text-xs text-gray-400 dark:text-gray-500 mt-4">Sin tarjeta de crédito. Sin instalación.</p>
            </div>

            {/* Right: product preview */}
            <div className="animate-fade-in-up delay-250 w-full max-w-md mx-auto lg:max-w-none">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section aria-label="Funcionalidades" className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Todo lo que necesitás en un solo lugar</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Sin integraciones complicadas. Sin módulos extra.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white dark:bg-gray-900"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${f.color} ${f.darkColor}`} aria-hidden="true">
                  <f.icon size={18} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section aria-label="Características" className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
              Pensado para talleres que quieren crecer
            </h2>
            <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {BENEFITS.map((b) => (
                <div key={b} className="flex items-center gap-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 px-4 py-3">
                  <CheckCircle size={15} className="text-green-500 shrink-0" aria-hidden="true" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 tracking-tight">
              Tu taller mecánico, digitalizado hoy
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
              Configuración en menos de 5 minutos. Sin contratos, sin sorpresas.
            </p>
            {!isSignedIn && (
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-base shadow-lg shadow-blue-500/25"
              >
                Crear cuenta gratis <ArrowRight size={16} />
              </Link>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Sin tarjeta de crédito. Cancelá cuando quieras.</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center">
                <Wrench size={10} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">TallerOS</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">© 2026 TallerOS. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Iniciar sesión</Link>
              <Link href="/sign-up" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Registrarse</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
