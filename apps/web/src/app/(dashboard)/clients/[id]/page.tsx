"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, ExternalLink, Pencil, Plus, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ClientForm } from "@/components/forms/client-form";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { relativeTime } from "@/lib/relative-time";
import { usePermission } from "@/hooks/use-me";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

type Vehicle = { id: string; brand: string; model: string; plate: string; year?: number; color?: string };
type WorkOrder = {
  id: string;
  description: string;
  status: string;
  paymentStatus: string;
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
  outstandingBalance: number;
};

export default function ClientDetailPage() {
  const canEditOrders = usePermission("EDIT_ORDERS");
  const canEdit = usePermission("EDIT_CLIENTS");
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: client, isLoading, isError } = useQuery<ClientDetail>({
    queryKey: ["clients", id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }
  if (isError) return <p className="text-sm text-red-500">Error al cargar el cliente. Verificá tu conexión o permisos.</p>;
  if (!client) return <p className="text-sm text-red-500">Cliente no encontrado.</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex-1">{client.name}</h1>
        {canEdit && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      {/* Outstanding balance banner */}
      {client.outstandingBalance > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">Saldo pendiente</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Órdenes sin cobrar o con pago parcial</p>
          </div>
          <p className="text-xl font-bold text-red-700 dark:text-red-300 tabular-nums shrink-0">
            ${client.outstandingBalance.toLocaleString("es-AR")}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Teléfono</p>
          <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{client.phone}</p>
        </div>
        {client.email && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Email</p>
            <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">{client.email}</p>
          </div>
        )}
        {client.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Notas</p>
            <p className="text-gray-700 dark:text-gray-300 mt-1">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Vehicles */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Vehículos <span className="text-gray-400 dark:text-gray-500 font-normal">({client.vehicles.length})</span>
        </h2>
        {client.vehicles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin vehículos registrados.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Vehículo", "Patente", "Año", "Color"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {client.vehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer focus-within:bg-gray-50 dark:focus-within:bg-gray-800"
                    onClick={() => router.push(`/vehicles/${v.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/vehicles/${v.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <td className="px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {v.brand} {v.model}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-600 dark:text-gray-400">{v.plate}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{v.year ?? "—"}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{v.color ?? "—"}</td>
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
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Órdenes <span className="text-gray-400 dark:text-gray-500 font-normal">({client.workOrders.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/work-orders?clientId=${client.id}`}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline flex items-center gap-1"
            >
              Ver todas <ExternalLink size={11} />
            </Link>
            {canEditOrders && (
              <button
                onClick={() => setNewOrderOpen(true)}
                className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-md hover:bg-blue-700"
              >
                <Plus size={12} /> Nueva orden
              </button>
            )}
          </div>
        </div>

        {client.workOrders.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Sin órdenes registradas.</p>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Descripción", "Vehículo", "Estado", "Pago", "Costo", "Fecha"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {client.workOrders.map((o) => {
                  const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
                  const cost = o.finalCost ?? o.estimatedCost;
                  const payColor =
                    o.paymentStatus === "PAID"    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                    o.paymentStatus === "PARTIAL" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
                  const payLabel = o.paymentStatus === "PAID" ? "Cobrado" : o.paymentStatus === "PARTIAL" ? "Parcial" : "Sin cobrar";
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer focus-within:bg-gray-50 dark:focus-within:bg-gray-800"
                      onClick={() => router.push(`/work-orders/${o.id}`)}
                      onKeyDown={(e) => e.key === "Enter" && router.push(`/work-orders/${o.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 max-w-[180px]">
                        <p className="truncate">{o.description}</p>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-500 dark:text-gray-400">
                        {o.vehicle.plate}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${payColor}`}>
                          {payLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                        {cost != null ? `$${Number(cost).toLocaleString("es-AR")}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">
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

      {canEditOrders && (
        <Modal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} title="Nueva orden de trabajo">
          <WorkOrderForm
            defaultClientId={client.id}
            onSuccess={() => {
              setNewOrderOpen(false);
              qc.invalidateQueries({ queryKey: ["clients", id] });
            }}
          />
        </Modal>
      )}

      {canEdit && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar cliente">
          <ClientForm
            client={client}
            onSuccess={() => {
              setEditOpen(false);
              qc.invalidateQueries({ queryKey: ["clients", id] });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
