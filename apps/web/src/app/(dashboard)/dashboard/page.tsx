"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, TrendingUp, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/relative-time";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

type RevenueBar = { label: string; revenue: number };

function RevenueChart({ data, isLoading }: { data?: RevenueBar[]; isLoading: boolean }) {
  const max = Math.max(...(data?.map((d) => d.revenue) ?? [0]), 1);
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `$${(n / 1_000).toFixed(0)}k` : `$${n}`;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Ingresos últimos 6 meses</h2>
      {isLoading ? (
        <div className="h-32 flex items-end gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-t-sm animate-pulse" style={{ height: `${30 + i * 10}%` }} />
          ))}
        </div>
      ) : (
        <div className="flex items-end gap-2 h-36">
          {(data ?? []).map((d, i) => {
            const pct = data && data.length > 0 ? (d.revenue / max) * 100 : 0;
            const isCurrentMonth = i === (data?.length ?? 0) - 1;
            return (
              <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums leading-none">
                  {d.revenue > 0 ? fmt(d.revenue) : ""}
                </span>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isCurrentMonth
                        ? "bg-blue-500 dark:bg-blue-500"
                        : "bg-blue-200 dark:bg-blue-900"
                    }`}
                    style={{ height: `${Math.max(pct, d.revenue > 0 ? 6 : 2)}%` }}
                    title={`${d.label}: ${fmt(d.revenue)}`}
                  />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize truncate w-full text-center">
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type DormantClient = {
  id: string;
  name: string;
  phone: string;
  _count: { workOrders: number };
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
    unpaidOrders: number;
    monthRevenue: number;
    doneThisMonth: number;
  };
  recentOrders: RecentOrder[];
  lowStockParts?: Array<{
    id: string;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
  }>;
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
    queryFn: () =>
      api
        .get("/work-orders", { params: { scheduledDate: "today", limit: 100 } })
        .then((r) => r.data.items),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: revenueChart, isLoading: chartLoading } = useQuery<RevenueBar[]>({
    queryKey: ["dashboard-revenue-chart"],
    queryFn: () => api.get("/dashboard/revenue-chart").then((r) => r.data),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: dormantClients } = useQuery<DormantClient[]>({
    queryKey: ["dashboard-dormant-clients"],
    queryFn: () => api.get("/dashboard/dormant-clients").then((r) => r.data),
    staleTime: 10 * 60_000,
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
    { label: "Activas",     value: stats?.activeOrders,     href: "/work-orders", color: "text-blue-600 dark:text-blue-400" },
    { label: "Hoy",         value: stats?.todayOrders,      href: "/work-orders?status=TODAY", color: "text-indigo-600" },
    { label: "Pendientes",  value: stats?.pendingOrders,    href: "/work-orders?status=PENDING", color: "text-yellow-600" },
    { label: "En progreso", value: stats?.inProgressOrders, href: "/work-orders?status=IN_PROGRESS", color: "text-orange-600" },
    { label: "Por cobrar",  value: stats?.unpaidOrders,     href: "/work-orders?paymentStatus=UNPAID", color: "text-red-600" },
    { label: "Clientes",    value: stats?.totalClients,     href: "/clients", color: "text-gray-700" },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">No se pudo conectar con el servidor.</p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">Verificá tu conexión o intentá recargar la página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>

      {/* Revenue banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Ingresos este mes</p>
          {isLoading ? (
            <div className="mt-1.5 mb-0.5 h-9 w-28 bg-green-200/60 dark:bg-green-800/30 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-green-800 dark:text-green-300 mt-0.5 tabular-nums">{fmtMoney(monthRevenue)}</p>
          )}
          {!isLoading && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
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
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{c.label}</p>
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
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Turnos de hoy</h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium px-2 py-0.5 rounded-full">
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
                  className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{o.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {o.client.name} · <span className="font-mono">{o.vehicle.plate}</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {time && <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300">{time}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <RevenueChart data={revenueChart} isLoading={chartLoading} />

      {/* Low stock alert */}
      {(data?.lowStockParts?.length ?? 0) > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-orange-500 dark:text-orange-400 shrink-0" />
            <h2 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              Repuestos con stock bajo
            </h2>
            <span className="text-[10px] font-bold bg-orange-200 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full">
              {data!.lowStockParts!.length}
            </span>
          </div>
          <ul className="space-y-1.5">
            {data!.lowStockParts!.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {p.name}
                </span>
                <span className="shrink-0 text-xs text-orange-600 dark:text-orange-400 tabular-nums">
                  Stock: {p.stock} {p.unit}{" "}
                  <span className="text-gray-400 dark:text-gray-500">
                    (mínimo: {p.minStock})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800/60">
            <Link
              href="/inventory"
              className="text-xs font-medium text-orange-700 dark:text-orange-400 hover:underline"
            >
              Ver inventario →
            </Link>
          </div>
        </div>
      )}

      {/* Active orders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Órdenes activas</h2>
          <Link href="/work-orders" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            Ver todas →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : !data?.recentOrders.length ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 py-12 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No hay órdenes activas.</p>
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
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{o.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {o.client.name} · {o.vehicle.brand} {o.vehicle.model}{" "}
                      <span className="font-mono">({o.vehicle.plate})</span>
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
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

      {/* Dormant clients */}
      {(dormantClients?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UserX size={16} className="text-gray-400 dark:text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Clientes sin actividad (90+ días)
            </h2>
            <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 font-medium px-2 py-0.5 rounded-full">
              {dormantClients!.length}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {dormantClients!.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.phone}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
                  {c._count.workOrders} {c._count.workOrders === 1 ? "orden" : "órdenes"}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Link href="/clients" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              Ver todos los clientes →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
