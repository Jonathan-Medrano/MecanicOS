"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarClock, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/relative-time";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type RecentOrder = {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  scheduledAt?: string;
  estimatedCost?: number;
  client: { id: string; name: string };
  vehicle: { brand: string; model: string; plate: string };
};

type Overview = {
  stats: {
    totalClients: number;
    totalVehicles: number;
    activeOrders: number;
    pendingOrders: number;
    inProgressOrders: number;
    todayOrders: number;
    monthRevenue: number;
    doneThisMonth: number;
  };
  recentOrders: RecentOrder[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery<Overview>({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.get("/dashboard/overview").then((r) => r.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: todayScheduled } = useQuery<RecentOrder[]>({
    queryKey: ["work-orders-scheduled-today"],
    queryFn: () => api.get("/work-orders", { params: { scheduledDate: "today" } }).then((r) => r.data),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const stats = data?.stats;

  const monthRevenue = stats?.monthRevenue ?? 0;
  const fmtMoney = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}k`
      : `$${n.toLocaleString("es-AR")}`;

  const STAT_CARDS = [
    { label: "Activas",     value: stats?.activeOrders,     href: "/work-orders", color: "text-blue-600" },
    { label: "Hoy",         value: stats?.todayOrders,      href: "/work-orders?status=TODAY", color: "text-indigo-600" },
    { label: "Pendientes",  value: stats?.pendingOrders,    href: "/work-orders?status=PENDING", color: "text-yellow-600" },
    { label: "En progreso", value: stats?.inProgressOrders, href: "/work-orders?status=IN_PROGRESS", color: "text-orange-600" },
    { label: "Clientes",    value: stats?.totalClients,     href: "/clients", color: "text-gray-700" },
    { label: "Vehículos",   value: stats?.totalVehicles,    href: "/vehicles", color: "text-gray-700" },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700 font-medium">No se pudo conectar con el servidor.</p>
          <p className="text-xs text-red-500 mt-1">Verificá tu conexión o intentá recargar la página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Revenue banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Ingresos este mes</p>
          {isLoading ? (
            <div className="mt-1.5 mb-0.5 h-9 w-28 bg-green-200/60 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-green-800 mt-0.5 tabular-nums">{fmtMoney(monthRevenue)}</p>
          )}
          {!isLoading && (
            <p className="text-xs text-green-600 mt-0.5">
              {stats?.doneThisMonth ?? 0} {stats?.doneThisMonth === 1 ? "orden completada" : "órdenes completadas"}
            </p>
          )}
        </div>
        <TrendingUp size={36} className="shrink-0 text-green-300" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className={`mt-1 text-3xl font-semibold ${c.color} group-hover:scale-105 inline-block transition-transform`}>
              {isLoading ? "—" : (c.value ?? 0)}
            </p>
          </Link>
        ))}
      </div>

      {/* Today's scheduled */}
      {(todayScheduled?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={16} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900">Turnos de hoy</h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
              {todayScheduled!.length}
            </span>
          </div>
          <div className="space-y-2">
            {todayScheduled!.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
              const time = o.scheduledAt ? new Date(o.scheduledAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : null;
              return (
                <div
                  key={o.id}
                  onClick={() => router.push(`/work-orders/${o.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/work-orders/${o.id}`)}
                  role="button"
                  tabIndex={0}
                  className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.client.name} · <span className="font-mono">{o.vehicle.plate}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {time && <span className="text-xs font-mono font-semibold text-indigo-700">{time}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Órdenes activas</h2>
          <Link href="/work-orders" className="text-xs text-blue-600 hover:underline">
            Ver todas →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : !data?.recentOrders.length ? (
          <div className="bg-white rounded-lg border border-gray-200 py-12 text-center">
            <p className="text-sm text-gray-400">No hay órdenes activas.</p>
            <Link
              href="/work-orders"
              className="mt-3 inline-block text-xs bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              + Nueva orden
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentOrders.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
              return (
                <div
                  key={o.id}
                  onClick={() => router.push(`/work-orders/${o.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/work-orders/${o.id}`)}
                  role="button"
                  tabIndex={0}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.client.name} · {o.vehicle.brand} {o.vehicle.model}{" "}
                      <span className="font-mono">({o.vehicle.plate})</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {relativeTime(o.createdAt)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
