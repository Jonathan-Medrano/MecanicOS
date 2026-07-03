"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type Vehicle = { id: string; brand: string; model: string; plate: string; year?: number; color?: string };
type WorkOrder = { id: string; description: string; status: string; createdAt: string; estimatedCost?: number };
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 p-1 rounded"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Teléfono</p>
          <p className="font-medium text-gray-900 mt-0.5">{client.phone}</p>
        </div>
        {client.email && (
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900 mt-0.5">{client.email}</p>
          </div>
        )}
        {client.notes && (
          <div className="sm:col-span-2">
            <p className="text-gray-500">Notas</p>
            <p className="font-medium text-gray-900 mt-0.5">{client.notes}</p>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Vehículos ({client.vehicles.length})
        </h2>
        {client.vehicles.length === 0 ? (
          <p className="text-sm text-gray-400">Sin vehículos registrados.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Marca", "Modelo", "Patente", "Año", "Color"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {client.vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{v.brand}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.model}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{v.plate}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.year ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{v.color ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Órdenes recientes ({client.workOrders.length})
        </h2>
        {client.workOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Sin órdenes registradas.</p>
        ) : (
          <div className="space-y-2">
            {client.workOrders.map((o) => {
              const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
              return (
                <div
                  key={o.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{o.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(o.createdAt).toLocaleDateString("es-AR")}
                      {o.estimatedCost != null && ` · $${o.estimatedCost.toLocaleString("es-AR")}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
