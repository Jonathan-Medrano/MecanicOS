"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  };
  recentOrders: RecentOrder[];
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery<Overview>({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.get("/dashboard/overview").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const stats = data?.stats;

  const STAT_CARDS = [
    { label: "Activas",     value: stats?.activeOrders,     href: "/work-orders", color: "text-blue-600" },
    { label: "Hoy",         value: stats?.todayOrders,      href: "/work-orders?status=TODAY", color: "text-indigo-600" },
    { label: "Pendientes",  value: stats?.pendingOrders,    href: "/work-orders?status=PENDING", color: "text-yellow-600" },
    { label: "En progreso", value: stats?.inProgressOrders, href: "/work-orders?status=IN_PROGRESS", color: "text-orange-600" },
    { label: "Clientes",    value: stats?.totalClients,     href: "/clients", color: "text-gray-700" },
    { label: "Vehículos",   value: stats?.totalVehicles,    href: "/vehicles", color: "text-gray-700" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

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
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all"
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
