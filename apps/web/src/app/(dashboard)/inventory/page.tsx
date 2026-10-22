"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-me";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Part = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  stock: number;
  minStock: number;
  costPrice?: number;
  sellPrice?: number;
  unit: string;
  createdAt: string;
};

type PartFormValues = {
  name: string;
  description: string;
  sku: string;
  unit: string;
  stock: string;
  minStock: string;
  costPrice: string;
  sellPrice: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_FORM: PartFormValues = {
  name: "",
  description: "",
  sku: "",
  unit: "unidad",
  stock: "0",
  minStock: "0",
  costPrice: "",
  sellPrice: "",
};

function partToForm(p: Part): PartFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    sku: p.sku ?? "",
    unit: p.unit,
    stock: String(p.stock),
    minStock: String(p.minStock),
    costPrice: p.costPrice != null ? String(p.costPrice) : "",
    sellPrice: p.sellPrice != null ? String(p.sellPrice) : "",
  };
}

function formToBody(f: PartFormValues) {
  return {
    name: f.name.trim(),
    description: f.description.trim() || undefined,
    sku: f.sku.trim() || undefined,
    unit: f.unit.trim() || "unidad",
    stock: Number(f.stock),
    minStock: Number(f.minStock),
    costPrice: f.costPrice !== "" ? Number(f.costPrice) : undefined,
    sellPrice: f.sellPrice !== "" ? Number(f.sellPrice) : undefined,
  };
}

function isLowStock(p: Part) {
  // La API serializa los Decimal como string: comparar como número, no como texto.
  const min = Number(p.minStock);
  return min > 0 && Number(p.stock) <= min;
}

// ---------------------------------------------------------------------------
// Part form modal (create + edit)
// ---------------------------------------------------------------------------

interface PartFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Part;
}

function PartFormModal({ open, onClose, initial }: PartFormModalProps) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState<PartFormValues>(
    initial ? partToForm(initial) : EMPTY_FORM
  );

  const mutation = useMutation({
    mutationFn: () => {
      const body = formToBody(form);
      return isEdit
        ? api.patch(`/parts/${initial!.id}`, body)
        : api.post("/parts", body);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Repuesto actualizado" : "Repuesto creado");
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
      onClose();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  const field = (
    key: keyof PartFormValues,
    label: string,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label} {opts?.required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
    </div>
  );

  const canSubmit =
    form.name.trim().length > 0 &&
    !isNaN(Number(form.stock)) &&
    !isNaN(Number(form.minStock));

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar repuesto" : "Agregar repuesto"}
    >
      {/* Trigger form reset when component mounts for a new item */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {field("name", "Nombre", { required: true, placeholder: "Ej: Filtro de aceite" })}
          {field("sku", "SKU / Código", { placeholder: "Ej: F-OIL-001" })}
        </div>

        {field("description", "Descripción", {
          placeholder: "Descripción opcional",
        })}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {field("unit", "Unidad", { placeholder: "unidad" })}
          {field("stock", "Stock inicial", { type: "number", placeholder: "0" })}
          {field("minStock", "Stock mínimo", { type: "number", placeholder: "0" })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {field("costPrice", "Precio costo ($)", {
            type: "number",
            placeholder: "0",
          })}
          {field("sellPrice", "Precio venta ($)", {
            type: "number",
            placeholder: "0",
          })}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !canSubmit}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear repuesto"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Part row
// ---------------------------------------------------------------------------

interface PartRowProps {
  part: Part;
  canEdit: boolean;
}

function PartRow({ part, canEdit }: PartRowProps) {
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const lowStock = isLowStock(part);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/parts/${part.id}`),
    onSuccess: () => {
      toast.success("Repuesto eliminado");
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Error al eliminar"),
  });

  const stockMutation = useMutation({
    mutationFn: (delta: number) =>
      api.patch(`/parts/${part.id}/stock`, { delta }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parts"] }),
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Error al actualizar stock"),
  });

  return (
    <>
      <tr
        className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${
          lowStock
            ? "bg-orange-50/60 dark:bg-orange-950/20"
            : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60"
        }`}
      >
        {/* Name + badges */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {part.name}
              </p>
              {part.description && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {part.description}
                </p>
              )}
            </div>
            {lowStock && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-1.5 py-0.5 rounded">
                <AlertTriangle size={10} />
                Stock bajo
              </span>
            )}
          </div>
        </td>

        {/* SKU */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {part.sku ?? "—"}
          </span>
        </td>

        {/* Stock + inline adjust */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => stockMutation.mutate(-1)}
                disabled={stockMutation.isPending || part.stock <= 0}
                aria-label={`Restar 1 ${part.unit} de ${part.name}`}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400 hover:text-red-500 disabled:opacity-30 transition-colors text-sm font-bold leading-none"
              >
                −
              </button>
            )}
            <span
              className={`text-sm font-semibold tabular-nums ${
                lowStock
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {part.stock}
            </span>
            {canEdit && (
              <button
                onClick={() => stockMutation.mutate(1)}
                disabled={stockMutation.isPending}
                aria-label={`Agregar 1 ${part.unit} a ${part.name}`}
                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-400 hover:text-green-600 disabled:opacity-30 transition-colors text-sm font-bold leading-none"
              >
                +
              </button>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {part.unit}
            </span>
          </div>
        </td>

        {/* Min stock */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            {part.minStock} {part.unit}
          </span>
        </td>

        {/* Cost price */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">
            {fmtMoney(part.costPrice)}
          </span>
        </td>

        {/* Sell price */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums">
            {fmtMoney(part.sellPrice)}
          </span>
        </td>

        {/* Actions */}
        {canEdit && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-1 justify-end">
              <button
                onClick={() => setEditOpen(true)}
                aria-label={`Editar ${part.name}`}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                aria-label={`Eliminar ${part.name}`}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        )}
      </tr>

      <PartFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={part}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          deleteMutation.mutate(undefined, {
            onSettled: () => setConfirmOpen(false),
          })
        }
        loading={deleteMutation.isPending}
        title={`¿Eliminar "${part.name}"?`}
        description="Esta acción no se puede deshacer. El repuesto será eliminado del inventario."
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InventoryPage() {
  const canEdit = usePermission("EDIT_ORDERS");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: parts, isLoading, isError } = useQuery<Part[]>({
    queryKey: ["parts", debouncedSearch, lowStockOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (lowStockOnly) params.set("lowStock", "true");
      const qs = params.toString();
      return api.get(`/parts${qs ? `?${qs}` : ""}`).then((r) => r.data);
    },
  });

  const lowStockCount = parts?.filter(isLowStock).length ?? 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Inventario de repuestos
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Controlá el stock de piezas y repuestos del taller
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Agregar repuesto
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <button
          onClick={() => setLowStockOnly((v) => !v)}
          aria-pressed={lowStockOnly}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            lowStockOnly
              ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <Filter size={13} />
          Stock bajo
          {!lowStockOnly && lowStockCount > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {lowStockCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {isError ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            Error al cargar el inventario.
          </p>
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
            Verificá tu conexión o permisos.
          </p>
        </div>
      ) : isLoading ? (
        <div className="animate-pulse space-y-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg"
            />
          ))}
        </div>
      ) : !parts?.length ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <Package
            size={36}
            className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {search || lowStockOnly
              ? "Sin resultados para los filtros aplicados"
              : "No hay repuestos cargados todavía"}
          </p>
          {!search && !lowStockOnly && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Agregá repuestos para llevar el control del stock
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Repuesto
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell">
                    Stock mín.
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                    Costo
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden lg:table-cell">
                    Venta
                  </th>
                  {canEdit && (
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <PartRow key={p.id} part={p} canEdit={canEdit} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {parts.length} {parts.length === 1 ? "repuesto" : "repuestos"}
              {lowStockCount > 0 && (
                <span className="ml-2 text-orange-500 dark:text-orange-400 font-medium">
                  · {lowStockCount} con stock bajo
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Create modal */}
      <PartFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
