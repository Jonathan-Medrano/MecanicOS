"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { relativeTime } from "@/lib/relative-time";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-me";

type WorkOrder = {
  id: string;
  status: string;
  description: string;
  createdAt: string;
  scheduledAt?: string;
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

const STATUS_TABS = [
  { key: "", label: "Todas" },
  { key: "TODAY", label: "Hoy" },
  { key: "PENDING", label: "Pendientes" },
  { key: "IN_PROGRESS", label: "En progreso" },
  { key: "WAITING_PARTS", label: "Esperando" },
  { key: "DONE", label: "Listas" },
  { key: "DELIVERED", label: "Entregadas" },
];

function WorkOrdersInner() {
  const canEdit = usePermission("EDIT_ORDERS");
  const canChangeStatus = usePermission("CHANGE_ORDER_STATUS");
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const initialStatus = searchParams.get("status") ?? "";
  const initialClientId = searchParams.get("clientId") ?? "";

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const isToday = statusFilter === "TODAY";

  const { data: orders, isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["work-orders", debouncedSearch, statusFilter, initialClientId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (isToday) params.set("scheduledDate", "today");
      else if (statusFilter) params.set("status", statusFilter);
      if (initialClientId) params.set("clientId", initialClientId);
      const qs = params.toString();
      return api.get(`/work-orders${qs ? `?${qs}` : ""}`).then((r) => r.data);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/work-orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al cambiar estado"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/work-orders/${id}`),
    onSuccess: () => {
      toast.success("Orden eliminada");
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al eliminar"),
  });

  const filtered = orders;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Órdenes de trabajo</h1>
          {initialClientId && (
            <p className="text-sm text-gray-500 mt-0.5">Filtradas por cliente</p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            + Nueva orden
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descripción, cliente o patente..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:max-w-xs"
        />
        {/* Mobile: select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:hidden border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {STATUS_TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>{tab.label}</option>
          ))}
        </select>
        {/* Desktop: tabs */}
        <div className="hidden sm:flex gap-1 flex-wrap">
          {STATUS_TABS.map((tab) => (
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
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((o) => {
            const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
            const isChangingStatus = statusMutation.isPending && (statusMutation.variables as any)?.id === o.id;
            return (
              <div
                key={o.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3 hover:border-blue-200 transition-colors"
              >
                <button
                  className="min-w-0 text-left flex-1"
                  onClick={() => router.push(`/work-orders/${o.id}`)}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{o.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {o.client.name} · <span className="font-mono">{o.vehicle.plate}</span>
                    {" "}· {o.vehicle.brand} {o.vehicle.model}
                    {(o.finalCost != null || o.estimatedCost != null) && (
                      <span className="text-gray-400"> · ${(o.finalCost ?? o.estimatedCost)!.toLocaleString("es-AR")}</span>
                    )}
                  </p>
                </button>

                {o.scheduledAt && (
                  <span className="shrink-0 hidden sm:flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <CalendarClock size={12} />
                    {new Date(o.scheduledAt).toLocaleString("es-AR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                  {relativeTime(o.createdAt)}
                </span>

                {canEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditTarget(o); }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!confirm(`¿Eliminar la orden "${o.description.slice(0, 40)}"?`)) return;
                      deleteMutation.mutate(o.id);
                    }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                {canChangeStatus ? (
                  <select
                    value={o.status}
                    disabled={isChangingStatus}
                    onChange={(e) => { e.stopPropagation(); statusMutation.mutate({ id: o.id, status: e.target.value }); }}
                    onClick={(e) => e.stopPropagation()}
                    className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 transition-opacity ${s.color} ${isChangingStatus ? "opacity-50" : ""}`}
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
                ) : (
                  <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${s.color}`}>
                    {s.label}
                  </span>
                )}
              </div>
            );
          })}
          {!filtered?.length && (
            <p className="text-center text-sm text-gray-400 py-12">
              {search || statusFilter ? "Sin resultados." : "Todavía no hay órdenes."}
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva orden de trabajo">
            <WorkOrderForm
              onSuccess={() => {
                setCreateOpen(false);
                qc.invalidateQueries({ queryKey: ["work-orders"] });
                qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
              }}
            />
          </Modal>
          <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar orden">
            {editTarget && (
              <WorkOrderForm workOrder={editTarget} onSuccess={() => setEditTarget(null)} />
            )}
          </Modal>
        </>
      )}
    </div>
  );
}

export default function WorkOrdersPage() {
  return (
    <Suspense>
      <WorkOrdersInner />
    </Suspense>
  );
}
