"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, FileDown, CalendarClock, Plus, Trash2, Pencil, Check, X } from "lucide-react";
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

type WorkOrderItem = {
  id: string;
  type: "PART" | "LABOR";
  description: string;
  quantity: number;
  unitPrice: number;
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
  items: WorkOrderItem[];
};

type ItemFormData = { type: "PART" | "LABOR"; description: string; quantity: number; unitPrice: number };
const EMPTY_ITEM: ItemFormData = { type: "PART", description: "", quantity: 1, unitPrice: 0 };

function ItemRow({
  item,
  onDelete,
  onUpdate,
}: {
  item: WorkOrderItem;
  onDelete: () => void;
  onUpdate: (data: Partial<WorkOrderItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    type: item.type,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  });

  const total = Number(item.quantity) * Number(item.unitPrice);

  if (!editing) {
    return (
      <tr className="group border-b border-gray-100 last:border-0">
        <td className="py-2 pr-3">
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.type === "PART" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
            {item.type === "PART" ? "Repuesto" : "M.O."}
          </span>
        </td>
        <td className="py-2 pr-3 text-sm text-gray-800">{item.description}</td>
        <td className="py-2 pr-3 text-sm text-gray-600 text-right tabular-nums">{Number(item.quantity).toLocaleString("es-AR")}</td>
        <td className="py-2 pr-3 text-sm text-gray-600 text-right tabular-nums">${Number(item.unitPrice).toLocaleString("es-AR")}</td>
        <td className="py-2 text-sm font-medium text-gray-900 text-right tabular-nums">${total.toLocaleString("es-AR")}</td>
        <td className="py-2 pl-3 w-14">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1 rounded">
              <Trash2 size={12} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 bg-gray-50">
      <td className="py-2 pr-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PART" | "LABOR" }))}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white w-full"
        >
          <option value="PART">Repuesto</option>
          <option value="LABOR">M.O.</option>
        </select>
      </td>
      <td className="py-2 pr-2">
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="text-xs border border-gray-300 rounded px-2 py-1 w-full"
          autoFocus
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          value={form.quantity}
          min={0.001}
          step={0.001}
          onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1 w-20 text-right"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          value={form.unitPrice}
          min={0}
          step={0.01}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1 w-24 text-right"
        />
      </td>
      <td className="py-2 text-sm font-medium text-gray-900 text-right tabular-nums">
        ${(form.quantity * form.unitPrice).toLocaleString("es-AR")}
      </td>
      <td className="py-2 pl-2 w-14">
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => { onUpdate(form); setEditing(false); }}
            className="text-green-600 hover:text-green-700 p-1 rounded"
          >
            <Check size={13} />
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddItemRow({ onAdd }: { onAdd: (data: ItemFormData) => void }) {
  const [form, setForm] = useState<ItemFormData>(EMPTY_ITEM);
  const [open, setOpen] = useState(false);

  const handle = () => {
    if (!form.description.trim()) return;
    onAdd(form);
    setForm(EMPTY_ITEM);
    setOpen(false);
  };

  if (!open) {
    return (
      <tr>
        <td colSpan={6} className="pt-3">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={13} /> Agregar item
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/40 border-t border-blue-100">
      <td className="pt-3 pb-2 pr-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PART" | "LABOR" }))}
          className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white w-full"
        >
          <option value="PART">Repuesto</option>
          <option value="LABOR">M.O.</option>
        </select>
      </td>
      <td className="pt-3 pb-2 pr-2">
        <input
          type="text"
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-full"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handle()}
        />
      </td>
      <td className="pt-3 pb-2 pr-2">
        <input
          type="number"
          value={form.quantity}
          min={0.001}
          step={0.001}
          onChange={(e) => setForm((f) => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-20 text-right"
        />
      </td>
      <td className="pt-3 pb-2 pr-2">
        <input
          type="number"
          value={form.unitPrice}
          min={0}
          step={0.01}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-24 text-right"
          placeholder="0"
        />
      </td>
      <td className="pt-3 pb-2 text-sm font-medium text-gray-900 text-right tabular-nums">
        ${(form.quantity * form.unitPrice).toLocaleString("es-AR")}
      </td>
      <td className="pt-3 pb-2 pl-2 w-14">
        <div className="flex gap-1 justify-end">
          <button onClick={handle} className="text-green-600 hover:text-green-700 p-1 rounded">
            <Check size={13} />
          </button>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

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

  const addItemMutation = useMutation({
    mutationFn: (dto: ItemFormData) => api.post(`/work-orders/${id}/items`, dto),
    onSuccess: () => {
      toast.success("Item agregado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al agregar item"),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<WorkOrderItem> }) =>
      api.patch(`/work-orders/${id}/items/${itemId}`, data),
    onSuccess: () => {
      toast.success("Item actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al actualizar item"),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/work-orders/${id}/items/${itemId}`),
    onSuccess: () => {
      toast.success("Item eliminado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al eliminar item"),
  });

  if (isLoading) return <p className="text-gray-400 text-sm">Cargando...</p>;
  if (!order) return <p className="text-sm text-red-500">Orden no encontrada.</p>;

  const s = STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const itemsTotal = (order.items ?? []).reduce(
    (acc, it) => acc + Number(it.quantity) * Number(it.unitPrice),
    0,
  );
  const hasItems = order.items && order.items.length > 0;

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

      {/* Presupuesto (items) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Presupuesto</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-[10px] font-semibold text-gray-400 uppercase pr-3">Tipo</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 uppercase pr-3">Descripción</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 uppercase pr-3 text-right">Cant.</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 uppercase pr-3 text-right">P. Unit.</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Total</th>
                <th className="pb-2 w-14" />
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
                  onUpdate={(data) => updateItemMutation.mutate({ itemId: item.id, data })}
                />
              ))}
              <AddItemRow onAdd={(data) => addItemMutation.mutate(data)} />
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
          {hasItems && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal items</span>
              <span className="font-semibold text-gray-900 tabular-nums">{money(itemsTotal)}</span>
            </div>
          )}
          {order.estimatedCost != null && !hasItems && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Presupuesto estimado</span>
              <span className="font-semibold text-gray-900 tabular-nums">{money(Number(order.estimatedCost))}</span>
            </div>
          )}
          {order.finalCost != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Costo final</span>
              <span className="font-semibold text-green-700 tabular-nums">{money(Number(order.finalCost))}</span>
            </div>
          )}
          {!hasItems && order.estimatedCost == null && order.finalCost == null && (
            <p className="text-xs text-gray-400">Sin items ni costos cargados aún.</p>
          )}
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden">
        <WorkOrderForm workOrder={order as any} onSuccess={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["work-orders", id] }); }} />
      </Modal>
    </div>
  );
}
