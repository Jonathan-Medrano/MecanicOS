"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type MechanicRevenue = {
  mechanicId: string;
  mechanicName: string;
  orderCount: number;
  revenue: number;
};

type TopService = {
  description: string;
  _count: { description: number };
};

type AvgTime = {
  avgHours: number;
  count: number;
};

const fmtMoney = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}k`
    : `$${n.toLocaleString("es-AR")}`;

export default function ReportsPage() {
  const { data: byMechanic, isLoading: loadingMechanic } = useQuery<MechanicRevenue[]>({
    queryKey: ["reports-by-mechanic"],
    queryFn: () => api.get("/dashboard/reports/by-mechanic").then((r) => r.data),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: topServices, isLoading: loadingServices } = useQuery<TopService[]>({
    queryKey: ["reports-top-services"],
    queryFn: () => api.get("/dashboard/reports/top-services").then((r) => r.data),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: avgTime, isLoading: loadingAvg } = useQuery<AvgTime>({
    queryKey: ["reports-avg-time"],
    queryFn: () => api.get("/dashboard/reports/avg-time").then((r) => r.data),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const maxRevenue = Math.max(...(byMechanic?.map((m) => m.revenue) ?? [0]), 1);
  const maxServiceCount = Math.max(...(topServices?.map((s) => s._count.description) ?? [0]), 1);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Reportes</h1>

      {/* Revenue by mechanic */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Ingresos por mecánico</h2>

        {loadingMechanic ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : !byMechanic?.length ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos disponibles.</p>
        ) : (
          <div className="space-y-3">
            {byMechanic.map((m) => {
              const pct = (m.revenue / maxRevenue) * 100;
              return (
                <div key={m.mechanicId}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{m.mechanicName}</span>
                    <div className="shrink-0 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      <span>{m.orderCount} {m.orderCount === 1 ? "orden" : "órdenes"}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{fmtMoney(m.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, m.revenue > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Top services */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Servicios más frecuentes</h2>

        {loadingServices ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : !topServices?.length ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos disponibles.</p>
        ) : (
          <ol className="space-y-3">
            {topServices.map((s, i) => {
              const count = s._count.description;
              const pct = (count / maxServiceCount) * 100;
              return (
                <li key={s.description}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-blue-500 dark:text-blue-400 tabular-nums w-5 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.description}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 tabular-nums shrink-0">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-full overflow-hidden ml-7">
                    <div
                      className="h-full bg-blue-400 dark:bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Average repair time */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Tiempo promedio de reparación</h2>

        {loadingAvg ? (
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        ) : !avgTime ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin datos disponibles.</p>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-5 py-4 flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold text-green-800 dark:text-green-300 tabular-nums">
                {avgTime.avgHours % 1 === 0
                  ? avgTime.avgHours
                  : avgTime.avgHours.toFixed(1)}{" "}
                <span className="text-lg font-medium">horas promedio</span>
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                basado en {avgTime.count} {avgTime.count === 1 ? "orden" : "órdenes"}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
