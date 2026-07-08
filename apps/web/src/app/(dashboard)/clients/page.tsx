"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ClientForm } from "@/components/forms/client-form";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-me";

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  _count: { vehicles: number; workOrders: number };
};

export default function ClientsPage() {
  const canEdit = usePermission("EDIT_CLIENTS");
  const canDelete = usePermission("DELETE_CLIENTS");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["clients", debouncedSearch],
    queryFn: () => api.get("/clients", { params: debouncedSearch ? { search: debouncedSearch } : undefined }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`),
    onSuccess: () => {
      toast.success("Cliente eliminado");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al eliminar"),
  });

  const handleDelete = (c: Client) => {
    if (!confirm(`¿Eliminar a ${c.name}?`)) return;
    deleteMutation.mutate(c.id);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Clientes</h1>
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
          placeholder="Buscar por nombre, teléfono o email..."
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Vehículos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Órdenes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="text-sm font-medium text-blue-600 hover:underline text-left"
                    >
                      {c.name}
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center hidden sm:table-cell">{c._count.vehicles}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center hidden sm:table-cell">{c._count.workOrders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditTarget(c)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!clients?.length && (
            <p className="px-4 py-12 text-center text-sm text-gray-400">
              {search ? "Sin resultados para esa búsqueda." : "Todavía no hay clientes."}
            </p>
          )}
        </div>
      )}

      {canEdit && (
        <>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo cliente">
            <ClientForm onSuccess={() => setCreateOpen(false)} />
          </Modal>
          <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar cliente">
            {editTarget && <ClientForm client={editTarget} onSuccess={() => setEditTarget(null)} />}
          </Modal>
        </>
      )}
    </div>
  );
}
