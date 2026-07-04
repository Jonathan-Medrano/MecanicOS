"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, FileDown, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { useState } from "react";

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
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  client: { id: string; name: string; phone: string };
  vehicle: { id: string; brand: string; model: string; plate: string; year?: number; color?: string };
};

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: order, isLoading } = useQuery<WorkOrderDetail>({
    queryKey: ["work-orders", id],
    queryFn: () => api.get(`/work-orders/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/work-orders/${id}`, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al cambiar estado"),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Cargando...</p>;
  if (!order) return <p className="text-sm text-red-500">Orden no encontrada.</p>;

  const s = STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const money = (n?: number) =>
    n != null ? `$${n.toLocaleString("es-AR")}` : "—";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 leading-snug">{order.description}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Creada {fmt(order.createdAt)}
          </p>
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50"
          >
            Editar
          </button>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api"}/pdf/work-orders/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50"
          >
            <FileDown size={13} /> PDF
          </a>
          <select
            value={order.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            className={`text-xs font-medium px-3 py-2 rounded-full border-0 cursor-pointer appearance-none min-w-[100px] ${s.color}`}
          >
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Client + Vehicle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cliente</p>
          <Link
            href={`/clients/${order.client.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            {order.client.name}
          </Link>
          <p className="text-sm text-gray-500 mt-0.5">{order.client.phone}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Vehículo</p>
          <Link
            href={`/vehicles/${order.vehicle.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            {order.vehicle.brand} {order.vehicle.model}
          </Link>
          <p className="text-sm font-mono text-gray-500 mt-0.5">{order.vehicle.plate}</p>
          {(order.vehicle.year || order.vehicle.color) && (
            <p className="text-xs text-gray-400 mt-0.5">
              {[order.vehicle.year, order.vehicle.color].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Línea de tiempo</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {order.scheduledAt && (
            <div>
              <p className="text-xs text-indigo-500 flex items-center gap-1">
                <CalendarClock size={11} /> Turno
              </p>
              <p className="font-medium text-gray-900 mt-0.5">
                {new Date(order.scheduledAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
          {[
            { label: "Creada",     date: order.createdAt },
            { label: "Iniciada",   date: order.startedAt },
            { label: "Completada", date: order.completedAt },
          ].map(({ label, date }) => (
            <div key={label}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="font-medium text-gray-900 mt-0.5">{fmt(date)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Description + Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Descripción del trabajo</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{order.description}</p>
        </div>
        {order.mechanicNotes && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notas del mecánico</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.mechanicNotes}</p>
          </div>
        )}
      </div>

      {/* Costs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Costos</p>
        <div className="flex items-start gap-8 text-sm">
          <div>
            <p className="text-xs text-gray-500">Presupuesto</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">{money(order.estimatedCost)}</p>
          </div>
          {order.finalCost != null && (
            <div>
              <p className="text-xs text-gray-500">Costo final</p>
              <p className="text-lg font-semibold text-green-700 mt-0.5">{money(order.finalCost)}</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden">
        <WorkOrderForm workOrder={order as any} onSuccess={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["work-orders", id] }); }} />
      </Modal>
    </div>
  );
}
