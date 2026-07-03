"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { VehicleForm } from "@/components/forms/vehicle-form";

type Vehicle = {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  vin?: string;
  client: { name: string };
  _count: { workOrders: number };
};

export default function VehiclesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => api.get("/vehicles").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
    onError: (e: any) => setDeleteError(e.response?.data?.message ?? "Error al eliminar"),
  });

  const filtered = vehicles?.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.plate.toLowerCase().includes(q) ||
      v.client.name.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Vehículos</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
        >
          + Nuevo
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por marca, patente o propietario..."
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg h-12 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Vehículo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Patente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Propietario</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Órdenes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered?.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900">{v.brand} {v.model}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[v.year, v.color].filter(Boolean).join(" · ")}
                    </p>
                    {/* Propietario inline on mobile */}
                    <p className="text-xs text-gray-500 mt-0.5 sm:hidden">{v.client.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{v.plate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{v.client.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center hidden sm:table-cell">{v._count.workOrders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(v)}
                        className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          if (!confirm(`¿Eliminar ${v.brand} ${v.model} (${v.plate})?`)) return;
                          deleteMutation.mutate(v.id);
                        }}
                        className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered?.length && (
            <p className="px-4 py-12 text-center text-sm text-gray-400">
              {search ? "Sin resultados." : "Todavía no hay vehículos."}
            </p>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo vehículo">
        <VehicleForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar vehículo">
        {editTarget && (
          <VehicleForm vehicle={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
