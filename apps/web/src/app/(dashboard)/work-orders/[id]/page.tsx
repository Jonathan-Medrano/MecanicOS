"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, FileDown } from "lucide-react";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type WorkOrderDetail = {
  id: string;
  status: string;
  description: string;
  mechanicNotes?: string;
  estimatedCost?: number;
  finalCost?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  client: { id: string; name: string; phone: string };
  vehicle: { brand: string; model: string; plate: string; year?: number; color?: string };
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery<WorkOrderDetail>({
    queryKey: ["work-orders", id],
    queryFn: () => api.get(`/work-orders/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/work-orders/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Cargando...</p>;
  if (!order) return <p className="text-sm text-red-500">Orden no encontrada.</p>;

  const s = STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 p-1 rounded">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 flex-1 truncate">{order.description}</h1>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"}/pdf/work-orders/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50"
        >
          <FileDown size={13} /> PDF
        </a>
        <select
          value={order.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
          className={`text-xs font-medium px-3 py-1 rounded-full border-0 cursor-pointer appearance-none ${s.color}`}
        >
          {Object.entries(STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cliente</h2>
          <p className="text-sm font-medium text-gray-900">{order.client.name}</p>
          <p className="text-sm text-gray-600">{order.client.phone}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Vehículo</h2>
          <p className="text-sm font-medium text-gray-900">
            {order.vehicle.brand} {order.vehicle.model}
          </p>
          <p className="text-sm font-mono text-gray-600">{order.vehicle.plate}</p>
          {order.vehicle.year && <p className="text-sm text-gray-500">{order.vehicle.year} · {order.vehicle.color ?? ""}</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Detalle</h2>
        {order.mechanicNotes && <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.mechanicNotes}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Creada</p>
            <p className="font-medium text-gray-900 mt-0.5">{fmt(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Iniciada</p>
            <p className="font-medium text-gray-900 mt-0.5">{fmt(order.startedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Completada</p>
            <p className="font-medium text-gray-900 mt-0.5">{fmt(order.completedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Costo estimado</p>
            <p className="font-medium text-gray-900 mt-0.5">
              {order.estimatedCost != null ? `$${order.estimatedCost.toLocaleString("es-AR")}` : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
