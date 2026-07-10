"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const router = useRouter();
  const qc = useQueryClient();

  const { data: clients, isLoading, isError } = useQuery<Client[]>({
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

  const handleDelete = (c: Client) => setDeleteTarget(c);

  const exportCsv = () => {
    if (!clients) return;
    const headers = ["Nombre", "Teléfono", "Email", "Vehículos", "Órdenes"];
    const rows = clients.map((c) => [
      c.name,
      c.phone,
      c.email ?? "",
      String(c._count.vehicles),
      String(c._count.workOrders),
    ]);
    downloadCsv(headers, rows, `clientes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Clientes</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={!clients?.length}
            title="Exportar CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
          >
            <Download size={14} />
            CSV
          </button>
          {canEdit && (
            <button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
            >
              + Nuevo
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {isError ? (
        <p className="text-sm text-red-500 py-4">Error al cargar clientes. Verificá tu conexión o permisos.</p>
      ) : isLoading ? (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg h-12 animate-pulse dark:bg-gray-800 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto dark:bg-gray-900 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Vehículos</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">Órdenes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {clients?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 text-left"
                    >
                      {c.name}
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 sm:hidden">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center hidden sm:table-cell">{c._count.vehicles}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-center hidden sm:table-cell">{c._count.workOrders}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditTarget(c)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
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
            <p className="px-4 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
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
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, { onSettled: () => setDeleteTarget(null) });
          }
        }}
        loading={deleteMutation.isPending}
        title={`¿Eliminar a ${deleteTarget?.name}?`}
        description="Esta acción no se puede deshacer."
      />
    </div>
  );
}
