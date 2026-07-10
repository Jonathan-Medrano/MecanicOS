"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-me";

type Vehicle = {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  vin?: string;
  notes?: string;
  client: { name: string };
  _count: { workOrders: number };
};

export default function VehiclesPage() {
  const canEdit = usePermission("EDIT_VEHICLES");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const router = useRouter();

  const debouncedSearch = useDebounce(search, 300);

  const { data: vehicles, isLoading, isError } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", debouncedSearch],
    queryFn: () => api.get("/vehicles", { params: debouncedSearch ? { search: debouncedSearch } : undefined }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      toast.success("Vehículo eliminado");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al eliminar"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Vehículos</h1>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            + Nuevo
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por marca, patente o propietario..."
          className="w-full max-w-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {isError ? (
        <p className="text-sm text-red-500 py-4">Error al cargar vehículos. Verificá tu conexión o permisos.</p>
      ) : isLoading ? (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg h-12 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Vehículo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Patente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Propietario</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Órdenes</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {vehicles?.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer focus-within:bg-gray-50 dark:focus-within:bg-gray-800"
                  onClick={() => router.push(`/vehicles/${v.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/vehicles/${v.id}`)}
                  role="button"
                  tabIndex={0}
                >
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{v.brand} {v.model}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {[v.year, v.color].filter(Boolean).join(" · ")}
                    </p>
                    {/* Propietario inline on mobile */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:hidden">{v.client.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{v.plate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">{v.client.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center hidden sm:table-cell">{v._count.workOrders}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditTarget(v)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(v)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!vehicles?.length && (
            <p className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              {search ? "Sin resultados." : "Todavía no hay vehículos."}
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo vehículo">
            <VehicleForm onSuccess={() => setCreateOpen(false)} />
          </Modal>
          <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar vehículo">
            {editTarget && (
              <VehicleForm vehicle={editTarget} onSuccess={() => setEditTarget(null)} />
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
        title={`¿Eliminar ${deleteTarget?.brand} ${deleteTarget?.model}?`}
        description={deleteTarget ? `Patente ${deleteTarget.plate}. Esta acción no se puede deshacer.` : undefined}
      />
    </div>
  );
}
