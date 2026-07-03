"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { relativeTime } from "@/lib/relative-time";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type Vehicle = { id: string; brand: string; model: string; plate: string; year?: number; color?: string };
type WorkOrder = {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  estimatedCost?: number;
  finalCost?: number;
  vehicle: { brand: string; model: string; plate: string };
};
type ClientDetail = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  vehicles: Vehicle[];
  workOrders: WorkOrder[];
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ["clients", id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Cargando...</p>;
  if (!client) return <p className="text-sm text-red-500">Cliente no encontrado.</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 p-1 rounded">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Teléfono</p>
          <p className="font-medium text-gray-900 mt-1">{client.phone}</p>
        </div>
        {client.email && (
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
            <p className="font-medium text-gray-900 mt-1">{client.email}</p>
          </div>
        )}
        {client.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Notas</p>
            <p className="text-gray-700 mt-1">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Vehicles */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-2">
          Vehículos <span className="text-gray-400 font-normal">({client.vehicles.length})</span>
        </h2>
        {client.vehicles.length === 0 ? (
          <p className="text-sm text-gray-400">Sin vehículos registrados.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Vehículo", "Patente", "Año", "Color"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                      {v.brand} {v.model}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-600">{v.plate}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{v.year ?? "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{v.color ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Work orders */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Órdenes <span className="text-gray-400 font-normal">({client.workOrders.length})</span>
          </h2>
          <Link
            href={`/work-orders?clientId=${client.id}`}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Ver en órdenes <ExternalLink size={11} />
          </Link>
        </div>

        {client.workOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Sin órdenes registradas.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Descripción", "Vehículo", "Estado", "Costo", "Fecha"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.workOrders.map((o) => {
                  const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
                  const cost = o.finalCost ?? o.estimatedCost;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/work-orders/${o.id}`)}
                    >
                      <td className="px-4 py-2.5 text-sm text-gray-900 max-w-[200px]">
                        <p className="truncate">{o.description}</p>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-500">
                        {o.vehicle.plate}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {cost != null ? `$${cost.toLocaleString("es-AR")}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">
                        {relativeTime(o.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
