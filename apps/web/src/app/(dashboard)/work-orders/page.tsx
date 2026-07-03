"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { WorkOrderForm } from "@/components/forms/work-order-form";

type WorkOrder = {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  estimatedCost?: number;
  finalCost?: number;
  mechanicNotes?: string;
  client: { id: string; name: string };
  vehicle: { brand: string; model: string; plate: string };
};

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800" },
};

const FILTER_TABS = [
  { key: "", label: "Todas" },
  { key: "PENDING", label: "Pendientes" },
  { key: "IN_PROGRESS", label: "En progreso" },
  { key: "WAITING_PARTS", label: "Esperando" },
  { key: "DONE", label: "Listas" },
  { key: "DELIVERED", label: "Entregadas" },
];

export default function WorkOrdersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const router = useRouter();

  const { data: orders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["work-orders"],
    queryFn: () => api.get("/work-orders").then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/work-orders/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["work-orders"] }),
  });

  const filtered = orders?.filter((o) => {
    const matchStatus = !statusFilter || o.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.description.toLowerCase().includes(q) ||
      o.client.name.toLowerCase().includes(q) ||
      o.vehicle.plate.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Órdenes de trabajo</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          + Nueva orden
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descripción, cliente o patente..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:max-w-xs"
        />
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {filtered?.map((o) => {
            const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
            return (
              <div
                key={o.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4 hover:border-blue-200 transition-colors"
              >
                <button
                  className="min-w-0 text-left flex-1"
                  onClick={() => router.push(`/work-orders/${o.id}`)}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{o.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.client.name} · {o.vehicle.brand} {o.vehicle.model} ({o.vehicle.plate})
                  </p>
                </button>

                <button
                  onClick={() => setEditTarget(o)}
                  className="shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>

                <select
                  value={o.status}
                  onChange={(e) => statusMutation.mutate({ id: o.id, status: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ${s.color}`}
                  style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.25rem center",
                    backgroundSize: "1rem",
                  }}
                >
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
          {!filtered?.length && (
            <p className="text-center text-sm text-gray-400 py-10">
              {search || statusFilter ? "Sin resultados." : "Todavía no hay órdenes."}
            </p>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva orden de trabajo">
        <WorkOrderForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar orden">
        {editTarget && (
          <WorkOrderForm workOrder={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
