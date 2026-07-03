"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, Plus, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { relativeTime } from "@/lib/relative-time";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type WorkOrder = {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  estimatedCost?: number;
  finalCost?: number;
};

type VehicleDetail = {
  id: string;
  brand: string;
  model: string;
  year?: number;
  plate: string;
  color?: string;
  vin?: string;
  client: { id: string; name: string; phone: string };
  workOrders: WorkOrder[];
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const { data: vehicle, isLoading } = useQuery<VehicleDetail>({
    queryKey: ["vehicles", id],
    queryFn: () => api.get(`/vehicles/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-32 bg-gray-200 animate-pulse rounded-lg" />
        <div className="h-48 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }
  if (!vehicle) return <p className="text-sm text-red-500">Vehículo no encontrado.</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="text-sm font-mono text-gray-500">{vehicle.plate}</p>
        </div>
      </div>

      {/* Vehicle info */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        {[
          { label: "Año",   value: vehicle.year ?? "—" },
          { label: "Color", value: vehicle.color ?? "—" },
          { label: "VIN",   value: vehicle.vin ?? "—" },
          { label: "Patente", value: vehicle.plate },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="font-medium text-gray-900 mt-1 truncate font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Owner */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Propietario</p>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              href={`/clients/${vehicle.client.id}`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              {vehicle.client.name}
            </Link>
            <p className="text-sm text-gray-500 mt-0.5">{vehicle.client.phone}</p>
          </div>
          <Link
            href={`/clients/${vehicle.client.id}`}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 shrink-0"
          >
            Ver cliente <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Work orders */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Historial de órdenes{" "}
            <span className="text-gray-400 font-normal">({vehicle.workOrders.length})</span>
          </h2>
          <button
            onClick={() => setNewOrderOpen(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-md hover:bg-blue-700"
          >
            <Plus size={12} /> Nueva orden
          </button>
        </div>

        {vehicle.workOrders.length === 0 ? (
          <p className="text-sm text-gray-400">Sin órdenes registradas.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Descripción", "Estado", "Costo", "Fecha"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicle.workOrders.map((o) => {
                  const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
                  const cost = o.finalCost ?? o.estimatedCost;
                  return (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/work-orders/${o.id}`)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-2.5 text-sm text-gray-900 max-w-[220px]">
                        <p className="truncate">{o.description}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                        {cost != null ? `$${cost.toLocaleString("es-AR")}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
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

      <Modal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} title="Nueva orden de trabajo">
        <WorkOrderForm
          defaultClientId={vehicle.client.id}
          defaultVehicleId={vehicle.id}
          onSuccess={() => {
            setNewOrderOpen(false);
            qc.invalidateQueries({ queryKey: ["vehicles", id] });
          }}
        />
      </Modal>
    </div>
  );
}
