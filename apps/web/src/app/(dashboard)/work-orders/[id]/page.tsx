"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft, FileDown, CalendarClock, Plus, Trash2, Pencil, Check, X, Bot, MessageCircle, BadgeDollarSign, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { useState } from "react";
import { usePermission } from "@/hooks/use-me";

const STATUS: Record<string, { label: string; color: string }> = {
  PENDING:       { label: "Pendiente",        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
  IN_PROGRESS:   { label: "En progreso",      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  WAITING_PARTS: { label: "Esperando piezas", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  DONE:          { label: "Listo",            color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  DELIVERED:     { label: "Entregado",        color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  CANCELLED:     { label: "Cancelado",        color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  UNPAID:  { label: "Sin cobrar", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  PARTIAL: { label: "Pago parcial", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  PAID:    { label: "Cobrado", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

const PAYMENT_CYCLE: Record<string, string> = {
  UNPAID: "PARTIAL",
  PARTIAL: "PAID",
  PAID: "UNPAID",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH:     "Efectivo",
  TRANSFER: "Transferencia",
  CARD:     "Tarjeta",
  MIXED:    "Mixto",
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH:     "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  TRANSFER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  CARD:     "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  MIXED:    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

type WorkOrderItem = {
  id: string;
  type: "PART" | "LABOR";
  description: string;
  quantity: number;
  unitPrice: number;
};

type Payment = {
  id: string;
  amount: number;
  method: string;
  note?: string;
  createdAt: string;
};

type WorkOrderDetail = {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  budgetApproved: boolean;
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
  assignedTo?: { id: string; name: string } | null;
  items: WorkOrderItem[];
  payments: Payment[];
};

type ItemFormData = { type: "PART" | "LABOR"; description: string; quantity: number; unitPrice: number };
const EMPTY_ITEM: ItemFormData = { type: "PART", description: "", quantity: 1, unitPrice: 0 };

function ItemRow({
  item,
  onDelete,
  onUpdate,
  readOnly = false,
}: {
  item: WorkOrderItem;
  onDelete: () => void;
  onUpdate: (data: Partial<WorkOrderItem>) => void;
  readOnly?: boolean;
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
      <tr className="group border-b border-gray-100 last:border-0 dark:border-gray-800">
        <td className="py-2 pr-3">
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${item.type === "PART" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400" : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"}`}>
            {item.type === "PART" ? "Repuesto" : "M.O."}
          </span>
        </td>
        <td className="py-2 pr-3 text-sm text-gray-800 dark:text-gray-200">{item.description}</td>
        <td className="py-2 pr-3 text-sm text-gray-600 dark:text-gray-400 text-right tabular-nums">{Number(item.quantity).toLocaleString("es-AR")}</td>
        <td className="py-2 pr-3 text-sm text-gray-600 dark:text-gray-400 text-right tabular-nums">${Number(item.unitPrice).toLocaleString("es-AR")}</td>
        <td className="py-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right tabular-nums">${total.toLocaleString("es-AR")}</td>
        <td className="py-2 pl-3 w-14">
          {!readOnly && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
              <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded">
                <Pencil size={12} />
              </button>
              <button onClick={onDelete} className="text-gray-400 hover:text-red-500 p-1 rounded">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 bg-gray-50 dark:bg-gray-800 dark:border-gray-800">
      <td className="py-2 pr-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PART" | "LABOR" }))}
          className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          className="text-xs border border-gray-300 rounded px-2 py-1 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          className="text-xs border border-gray-300 rounded px-2 py-1 w-20 text-right dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          value={form.unitPrice}
          min={0}
          step={0.01}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1 w-24 text-right dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </td>
      <td className="py-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right tabular-nums">
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
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded">
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
    if (!form.description.trim() || form.quantity <= 0) return;
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
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            <Plus size={13} /> Agregar item
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/40 border-t border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
      <td className="pt-3 pb-2 pr-2">
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PART" | "LABOR" }))}
          className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-full dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-20 text-right dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </td>
      <td className="pt-3 pb-2 pr-2">
        <input
          type="number"
          value={form.unitPrice}
          min={0}
          step={0.01}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))}
          className="text-xs border border-gray-300 rounded px-2 py-1.5 w-24 text-right dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          placeholder="0"
        />
      </td>
      <td className="pt-3 pb-2 text-sm font-medium text-gray-900 dark:text-gray-100 text-right tabular-nums">
        ${(form.quantity * form.unitPrice).toLocaleString("es-AR")}
      </td>
      <td className="pt-3 pb-2 pl-2 w-14">
        <div className="flex gap-1 justify-end">
          <button onClick={handle} className="text-green-600 hover:text-green-700 p-1 rounded">
            <Check size={13} />
          </button>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded">
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function MechanicNotesEditor({
  notes,
  canEdit,
  onSave,
  isPending,
}: {
  notes?: string;
  canEdit: boolean;
  onSave: (notes: string) => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes ?? "");

  if (!canEdit && !notes) return null;

  if (!editing) {
    return (
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Notas del mecánico</p>
          {canEdit && (
            <button
              onClick={() => { setValue(notes ?? ""); setEditing(true); }}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400 flex items-center gap-1"
            >
              <Pencil size={11} /> {notes ? "Editar" : "Agregar nota"}
            </button>
          )}
        </div>
        {notes ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin notas.</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Notas del mecánico</p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Ej: Se reemplazó la correa de distribución, próxima revisión en 10.000 km..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => { onSave(value); setEditing(false); }}
          disabled={isPending}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

type PaymentFormData = { amount: number; method: string; note: string };
const EMPTY_PAYMENT: PaymentFormData = { amount: 0, method: "CASH", note: "" };

function PaymentHistory({
  payments,
  canEdit,
  onAdd,
  isPending,
}: {
  payments: Payment[];
  canEdit: boolean;
  onAdd: (data: PaymentFormData) => void;
  isPending: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PaymentFormData>(EMPTY_PAYMENT);

  const total = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  const handleAdd = () => {
    if (form.amount <= 0) return;
    onAdd(form);
    setForm(EMPTY_PAYMENT);
    setFormOpen(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          Cobros registrados
        </p>
        {payments.length > 0 && (
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
            Total cobrado: ${total.toLocaleString("es-AR")}
          </span>
        )}
      </div>

      {payments.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic mb-3">
          No hay cobros registrados aún.
        </p>
      )}

      {payments.length > 0 && (
        <ul className="space-y-2 mb-3">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0 dark:border-gray-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    PAYMENT_METHOD_COLORS[p.method] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                </span>
                {p.note && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.note}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  ${Number(p.amount).toLocaleString("es-AR")}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmt(p.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && !formOpen && (
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
        >
          <Plus size={13} /> Registrar cobro
        </button>
      )}

      {canEdit && formOpen && (
        <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Monto
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 text-right dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Método
              </label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              Nota (opcional)
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ej: Seña, saldo restante..."
              className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending || form.amount <= 0}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setFormOpen(false); setForm(EMPTY_PAYMENT); }}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [budgetPdfLoading, setBudgetPdfLoading] = useState(false);
  const [deleteItem, setDeleteItem] = useState<WorkOrderItem | null>(null);
  const canEdit = usePermission("EDIT_ORDERS");
  const canChangeStatus = usePermission("CHANGE_ORDER_STATUS");
  const canNotify = usePermission("SEND_WHATSAPP");

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await api.get(`/pdf/work-orders/${id}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `orden-${id.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadBudgetPdf() {
    setBudgetPdfLoading(true);
    try {
      const res = await api.get(`/pdf/work-orders/${id}/budget`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `presupuesto-${id.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al generar el presupuesto");
    } finally {
      setBudgetPdfLoading(false);
    }
  }

  const { data: order, isLoading, isError } = useQuery<WorkOrderDetail>({
    queryKey: ["work-orders", id],
    queryFn: () => api.get(`/work-orders/${id}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/work-orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al cambiar estado"),
  });

  const notesMutation = useMutation({
    mutationFn: (mechanicNotes: string) => api.patch(`/work-orders/${id}/status`, { mechanicNotes }),
    onSuccess: () => {
      toast.success("Nota guardada");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar nota"),
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

  const notifyMutation = useMutation({
    mutationFn: () => api.post(`/work-orders/${id}/notify`),
    onSuccess: () => toast.success("Mensaje enviado por WhatsApp"),
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al enviar WhatsApp"),
  });

  const paymentMutation = useMutation({
    mutationFn: (paymentStatus: string) => api.patch(`/work-orders/${id}/status`, { paymentStatus }),
    onSuccess: () => {
      toast.success("Estado de pago actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al actualizar pago"),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (dto: PaymentFormData) =>
      api.post(`/work-orders/${id}/payments`, {
        amount: dto.amount,
        method: dto.method,
        note: dto.note || undefined,
      }),
    onSuccess: () => {
      toast.success("Cobro registrado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
      qc.invalidateQueries({ queryKey: ["work-orders"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al registrar cobro"),
  });

  const budgetApprovalMutation = useMutation({
    mutationFn: (budgetApproved: boolean) =>
      api.patch(`/work-orders/${id}/status`, { budgetApproved }),
    onSuccess: () => {
      toast.success("Presupuesto actualizado");
      qc.invalidateQueries({ queryKey: ["work-orders", id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al actualizar presupuesto"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl animate-pulse">
        <div className="h-8 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }
  if (isError) return <p className="text-sm text-red-500">Error al cargar la orden. Verificá tu conexión o permisos.</p>;
  if (!order) return <p className="text-sm text-red-500">Orden no encontrada.</p>;

  const s = STATUS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
      : "—";
  const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

  const itemsTotal = (order.items ?? []).reduce(
    (acc, it) => {
      const val = Number(it.quantity) * Number(it.unitPrice);
      return acc + (isNaN(val) ? 0 : val);
    },
    0,
  );
  const hasItems = order.items && order.items.length > 0;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => router.back()} className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 shrink-0 dark:hover:text-gray-300 dark:hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug">{order.description}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Creada {fmt(order.createdAt)}
          </p>
        </div>
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setEditOpen(true)}
              className="text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Editar
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/track/${id}`);
              toast.success("Link copiado");
            }}
            className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Link2 size={13} /> Compartir
          </button>
          <button
            onClick={downloadBudgetPdf}
            disabled={budgetPdfLoading}
            title="Descargar PDF de presupuesto"
            className="flex items-center gap-1 text-xs border border-indigo-200 text-indigo-600 px-3 py-2 rounded-md hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            <FileDown size={13} /> {budgetPdfLoading ? "..." : "Presupuesto"}
          </button>
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            title="Descargar PDF de orden de trabajo"
            className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <FileDown size={13} /> {pdfLoading ? "..." : "PDF"}
          </button>
          <Link
            href={`/assistant?vehicle=${encodeURIComponent(`${order.vehicle.brand} ${order.vehicle.model}${order.vehicle.year ? ` ${order.vehicle.year}` : ""}`)}`}
            className="flex items-center gap-1 text-xs border border-blue-200 text-blue-600 px-3 py-2 rounded-md hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
            title="Consultar asistente IA"
          >
            <Bot size={13} /> IA
          </Link>
          {canNotify && (
            <button
              onClick={() => notifyMutation.mutate()}
              disabled={notifyMutation.isPending || !order.client.phone}
              title={order.client.phone ? "Enviar actualización por WhatsApp" : "Sin número de teléfono"}
              className="flex items-center gap-1 text-xs border border-green-200 text-green-600 px-3 py-2 rounded-md hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-green-800 dark:hover:bg-green-950/30"
            >
              <MessageCircle size={13} /> WA
            </button>
          )}
          {order.paymentMethod && (
            <span
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${
                PAYMENT_METHOD_COLORS[order.paymentMethod] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </span>
          )}
          {["DONE", "DELIVERED"].includes(order.status) && canEdit && (() => {
            const ps = PAYMENT_STATUS[order.paymentStatus] ?? PAYMENT_STATUS.UNPAID;
            const next = PAYMENT_CYCLE[order.paymentStatus] ?? "PAID";
            return (
              <button
                onClick={() => paymentMutation.mutate(next)}
                disabled={paymentMutation.isPending}
                title={`Clic para marcar como ${PAYMENT_STATUS[next]?.label}`}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full cursor-pointer disabled:opacity-50 transition-opacity ${ps.color}`}
              >
                <BadgeDollarSign size={12} /> {ps.label}
              </button>
            );
          })()}
          {canEdit && !["DONE", "DELIVERED", "CANCELLED"].includes(order.status) && (
            <button
              onClick={() => budgetApprovalMutation.mutate(!order.budgetApproved)}
              disabled={budgetApprovalMutation.isPending}
              title={order.budgetApproved ? "Presupuesto aprobado — clic para revocar" : "Clic para marcar presupuesto como aprobado"}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                order.budgetApproved
                  ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/60"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              <Check size={11} />
              {order.budgetApproved ? "Aprobado" : "Sin aprobar"}
            </button>
          )}
          {canChangeStatus ? (
            <select
              value={order.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className={`text-xs font-medium px-3 py-2 rounded-full border-0 cursor-pointer appearance-none min-w-[100px] ${s.color}`}
            >
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          ) : (
            <span className={`text-xs font-medium px-3 py-2 rounded-full min-w-[100px] text-center ${s.color}`}>
              {s.label}
            </span>
          )}
        </div>
      </div>

      {/* Client + Vehicle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Cliente</p>
          <Link
            href={`/clients/${order.client.id}`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {order.client.name}
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{order.client.phone}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Vehículo</p>
          <Link
            href={`/vehicles/${order.vehicle.id}`}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {order.vehicle.brand} {order.vehicle.model}
          </Link>
          <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mt-0.5">{order.vehicle.plate}</p>
          {(order.vehicle.year || order.vehicle.color) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {[order.vehicle.year, order.vehicle.color].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Mecánico</p>
          {order.assignedTo ? (
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{order.assignedTo.name}</p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin asignar</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Línea de tiempo</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {order.scheduledAt && (
            <div>
              <p className="text-xs text-indigo-500 flex items-center gap-1">
                <CalendarClock size={11} /> Turno
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">
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
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="font-medium text-gray-900 dark:text-gray-100 mt-0.5">{fmt(date)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Description + Notes */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 dark:bg-gray-900 dark:border-gray-700">
        <div>
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Descripción del trabajo</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{order.description}</p>
        </div>
        <MechanicNotesEditor
          notes={order.mechanicNotes}
          canEdit={canChangeStatus}
          onSave={(notes) => notesMutation.mutate(notes)}
          isPending={notesMutation.isPending}
        />
      </div>

      {/* Presupuesto (items) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 dark:bg-gray-900 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Presupuesto</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase pr-3">Tipo</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase pr-3">Descripción</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase pr-3 text-right">Cant.</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase pr-3 text-right">P. Unit.</th>
                <th className="pb-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase text-right">Total</th>
                <th className="pb-2 w-14" />
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onDelete={canEdit ? () => setDeleteItem(item) : () => {}}
                  onUpdate={canEdit ? (data) => updateItemMutation.mutate({ itemId: item.id, data }) : () => {}}
                  readOnly={!canEdit}
                />
              ))}
              {canEdit && <AddItemRow onAdd={(data) => addItemMutation.mutate(data)} />}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
          {hasItems && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Subtotal items</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{money(itemsTotal)}</span>
            </div>
          )}
          {order.estimatedCost != null && !hasItems && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Presupuesto estimado</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{money(Number(order.estimatedCost))}</span>
            </div>
          )}
          {order.finalCost != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Costo final</span>
              <span className="font-semibold text-green-700 dark:text-green-400 tabular-nums">{money(Number(order.finalCost))}</span>
            </div>
          )}
          {!hasItems && order.estimatedCost == null && order.finalCost == null && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Sin items ni costos cargados aún.</p>
          )}
        </div>
      </div>

      {/* Payment history */}
      <PaymentHistory
        payments={order.payments ?? []}
        canEdit={canEdit}
        onAdd={(dto) => addPaymentMutation.mutate(dto)}
        isPending={addPaymentMutation.isPending}
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar orden">
        <WorkOrderForm workOrder={order as any} onSuccess={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["work-orders", id] }); }} />
      </Modal>

      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => {
          if (deleteItem) deleteItemMutation.mutate(deleteItem.id, { onSettled: () => setDeleteItem(null) });
        }}
        title="Eliminar item"
        description={deleteItem ? `"${deleteItem.description}" — Esta acción no se puede deshacer.` : undefined}
        loading={deleteItemMutation.isPending}
      />
    </div>
  );
}
