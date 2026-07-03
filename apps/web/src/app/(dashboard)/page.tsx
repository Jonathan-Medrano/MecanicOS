"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Stats = {
  totalClients: number;
  totalVehicles: number;
  activeOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
  });

  const cards = [
    { label: "Órdenes activas", value: stats?.activeOrders },
    { label: "Clientes", value: stats?.totalClients },
    { label: "Vehículos", value: stats?.totalVehicles },
    { label: "En progreso", value: stats?.inProgressOrders },
    { label: "Pendientes", value: stats?.pendingOrders },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={isLoading ? "…" : String(c.value ?? 0)} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
