"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, CalendarClock, Download } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { relativeTime } from "@/lib/relative-time";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-me";

type WorkOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  description: string;
  createdAt: string;
  scheduledAt?: string;
  estimatedCost?: number;
  finalCost?: number;
  mechanicNotes?: string;
  client: { id: string; name: string };
  vehicle: { brand: string; model: string; plate: string };
};

type PaginatedOrders = {
  items: WorkOrder[];
  total: number;
  page: number;
  pages: number;
};

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const STATUS_TABS = [
  { key: "", label: "Todas" },
  { key: "TODAY", label: "Hoy" },
  { key: "PENDING", label: "Pendientes" },
  { key: "IN_PROGRESS", label: "En progreso" },
  { key: "WAITING_PARTS", label: "Esperando" },
  { key: "DONE", label: "Listas" },
  { key: "DELIVERED", label: "Entregadas" },
  { key: "UNPAID", label: "Sin cobrar" },
];

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "Sin cobrar", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL: { label: "Pago parcial", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  PAID:    { label: "Cobrado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

function WorkOrdersInner() {
  const canEdit = usePermission("EDIT_ORDERS");
  const canChangeStatus = usePermission("CHANGE_ORDER_STATUS");
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const clientId = searchParams.get("clientId") ?? "";
  const paymentFilterParam = searchParams.get("paymentStatus") ?? "";
  const rawStatusFilter = searchParams.get("status") ?? "";
  const statusFilter = paymentFilterParam ? "UNPAID" : rawStatusFilter;
  const setStatusFilter = (value: string) => {
    resetPage();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("paymentStatus");
    if (value === "UNPAID") {
      params.set("paymentStatus", "UNPAID");
      params.delete("status");
    } else if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const isToday = statusFilter === "TODAY";
  const isUnpaid = statusFilter === "UNPAID";

  // Reset to page 1 when filters change
  const resetPage = () => setPage(1);

  const { data: ordersData, isLoading, isError } = useQuery<PaginatedOrders>({
    queryKey: ["work-orders", debouncedSearch, statusFilter, clientId, paymentFilterParam, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (isToday) params.set("scheduledDate", "today");
      else if (isUnpaid) params.set("paymentStatus", "UNPAID");
      else if (statusFilter) params.set("status", statusFilter);
      if (clientId) params.set("clientId", clientId);
      params.set("page", String(page));
      params.set("limit", "25");
      return api.get(`/work-orders?${params.toString()}`).then((r) => r.data);
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

  const orders = ordersData?.items ?? [];
  const totalPages = ordersData?.pages ?? 1;
  const totalCount = ordersData?.total ?? 0;

  const STATUS_LABEL: Record<string, string> = {
    PENDING: "Pendiente", IN_PROGRESS: "En progreso", WAITING_PARTS: "Esperando piezas",
    DONE: "Listo", DELIVERED: "Entregado", CANCELLED: "Cancelado",
  };
  const PAYMENT_LABEL: Record<string, string> = { UNPAID: "Sin cobrar", PARTIAL: "Parcial", PAID: "Cobrado" };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (isToday) params.set("scheduledDate", "today");
      else if (isUnpaid) params.set("paymentStatus", "UNPAID");
      else if (statusFilter) params.set("status", statusFilter);
      if (clientId) params.set("clientId", clientId);
      params.set("limit", "1000");
      const { data } = await api.get<PaginatedOrders>(`/work-orders?${params.toString()}`);
      const headers = ["ID", "Descripción", "Cliente", "Patente", "Vehículo", "Estado", "Pago", "Presupuesto", "Costo Final", "Creado", "Turno"];
      const rows = data.items.map((o) => [
        o.id,
        o.description,
        o.client.name,
        o.vehicle.plate,
        `${o.vehicle.brand} ${o.vehicle.model}`,
        STATUS_LABEL[o.status] ?? o.status,
        PAYMENT_LABEL[o.paymentStatus] ?? o.paymentStatus,
        o.estimatedCost != null ? String(o.estimatedCost) : "",
        o.finalCost != null ? String(o.finalCost) : "",
        new Date(o.createdAt).toLocaleDateString("es-AR"),
        o.scheduledAt ? new Date(o.scheduledAt).toLocaleString("es-AR") : "",
      ]);
      downloadCsv(headers, rows, `ordenes-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      toast.error("Error al exportar");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Órdenes de trabajo</h1>
          {clientId && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Filtradas por cliente</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={isExporting}
            title="Exportar CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? "..." : "CSV"}
          </button>
          {canEdit && (
            <button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              + Nueva orden
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por descripción, cliente o patente..."
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:max-w-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
        {/* Mobile: select */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:hidden border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-red-500 py-4">Error al cargar órdenes. Verificá tu conexión o permisos.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg h-16 animate-pulse dark:bg-gray-800 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const s = STATUS[o.status] ?? { label: o.status, color: "bg-gray-100 text-gray-700" };
            const isChangingStatus = statusMutation.isPending && statusMutation.variables?.id === o.id;
            return (
              <div
                key={o.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-wrap sm:flex-nowrap items-center gap-3 hover:border-blue-200 transition-colors dark:bg-gray-900 dark:border-gray-700 dark:hover:border-blue-800"
              >
                <button
                  className="min-w-0 text-left flex-1 basis-full sm:basis-0"
                  onClick={() => router.push(`/work-orders/${o.id}`)}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{o.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {o.client.name} · <span className="font-mono">{o.vehicle.plate}</span>
                    {" "}· {o.vehicle.brand} {o.vehicle.model}
                    {(o.finalCost != null || o.estimatedCost != null) && (
                      <span className="text-gray-400 dark:text-gray-500"> · ${(o.finalCost ?? o.estimatedCost)!.toLocaleString("es-AR")}</span>
                    )}
                  </p>
                </button>

                {["DONE", "DELIVERED"].includes(o.status) && (() => {
                  const p = PAYMENT_STATUS[o.paymentStatus] ?? PAYMENT_STATUS.UNPAID;
                  return (
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline-flex ${p.color}`}>
                      {p.label}
                    </span>
                  );
                })()}

                {o.scheduledAt && (
                  <span className="shrink-0 hidden sm:flex items-center gap-1 text-xs text-indigo-600 font-medium">
                    <CalendarClock size={12} />
                    {new Date(o.scheduledAt).toLocaleString("es-AR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block">
                  {relativeTime(o.createdAt)}
                </span>

                {canEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditTarget(o); }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(o); }}
                    className="shrink-0 flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
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
          {!orders.length && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
              {search || statusFilter ? "Sin resultados." : "Todavía no hay órdenes."}
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {totalCount} {totalCount === 1 ? "orden" : "órdenes"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
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
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
          }
        }}
        loading={deleteMutation.isPending}
        title="¿Eliminar esta orden?"
        description={deleteTarget ? `"${deleteTarget.description.slice(0, 60)}"` : undefined}
      />
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
