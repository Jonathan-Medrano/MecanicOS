"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { CalendarClock, Car, Wrench, DollarSign, CheckCircle2, Clock, AlertCircle, ThumbsUp } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

type TrackingOrder = {
  id: string;
  workshopName: string;
  vehicle: {
    brand: string;
    model: string;
    year?: number;
    plate: string;
    color?: string;
  };
  status: string;
  statusLabel: string;
  description: string;
  scheduledAt?: string;
  estimatedCost?: number;
  finalCost?: number;
  budgetApproved: boolean;
  createdAt: string;
  completedAt?: string;
};

const STEPS = [
  { key: "PENDING",     label: "Recibido" },
  { key: "IN_PROGRESS", label: "En taller" },
  { key: "DONE",        label: "Listo" },
  { key: "DELIVERED",   label: "Entregado" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function statusToStep(status: string): { stepIndex: number; isPaused: boolean } {
  if (status === "WAITING_PARTS") return { stepIndex: 1, isPaused: true };
  if (status === "CANCELLED")     return { stepIndex: -1, isPaused: false };
  const idx = STEPS.findIndex((s) => s.key === status);
  return { stepIndex: idx === -1 ? 0 : idx, isPaused: false };
}

function ProgressBar({ status }: { status: string }) {
  const { stepIndex, isPaused } = statusToStep(status);
  const isCancelled = status === "CANCELLED";

  return (
    <div role="list" aria-label="Order progress" className="flex items-center gap-0 w-full">
      {STEPS.map((step, i) => {
        const isDone    = !isCancelled && i < stepIndex;
        const isCurrent = !isCancelled && i === stepIndex;
        const isFuture  = isCancelled || i > stepIndex;

        return (
          <div key={step.key} role="listitem" className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors",
                  isDone    ? "bg-blue-600 text-white"                                      : "",
                  isCurrent && !isPaused ? "bg-blue-600 text-white ring-4 ring-blue-100"  : "",
                  isCurrent && isPaused  ? "bg-amber-500 text-white ring-4 ring-amber-100" : "",
                  isFuture  ? "bg-gray-100 text-gray-400"                                   : "",
                ].join(" ")}
              >
                {isDone ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : isCurrent && isPaused ? (
                  <AlertCircle size={16} />
                ) : isCurrent ? (
                  <Clock size={16} />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>
              <span
                className={[
                  "text-[10px] font-medium mt-1 text-center leading-tight",
                  isDone || isCurrent ? "text-gray-800" : "text-gray-400",
                ].join(" ")}
              >
                {step.label}
                {isCurrent && isPaused && (
                  <span className="block text-amber-600 font-semibold">Esperando piezas</span>
                )}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  "h-0.5 flex-1 mx-1 rounded-full transition-colors",
                  isDone ? "bg-blue-600" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-64 bg-gray-200 rounded" />
      <div className="h-20 bg-gray-200 rounded-xl" />
      <div className="h-16 bg-gray-200 rounded-xl" />
      <div className="h-24 bg-gray-200 rounded-xl" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value}</span>
    </div>
  );
}

export default function TrackOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState<boolean | null>(null);

  const { data: order, isLoading, isError } = useQuery<TrackingOrder>({
    queryKey: ["track", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/track/${id}`);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    retry: false,
  });

  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null;

  const fmtDateTime = (d?: string) =>
    d
      ? new Date(d).toLocaleString("es-AR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const money = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`${API_URL}/track/${id}/approve`, { method: "POST" });
      if (res.ok) setApproved(true);
    } finally {
      setApproving(false);
    }
  };

  const isApproved = approved ?? order?.budgetApproved ?? false;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Wrench size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 leading-none">Seguimiento de orden</p>
            {order && (
              <p className="text-sm font-semibold text-gray-900 truncate">{order.workshopName}</p>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          {isLoading && <Skeleton />}

          {isError && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={22} className="text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900">Orden no encontrada</p>
              <p className="text-sm text-gray-500">
                Verificá el enlace o consultá con el taller.
              </p>
            </div>
          )}

          {order && (
            <>
              {/* Status progress */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Estado actual
                </p>
                <ProgressBar status={order.status} />
                {order.status === "CANCELLED" && (
                  <p className="mt-3 text-sm text-red-600 font-medium text-center">
                    Esta orden fue cancelada.
                  </p>
                )}
              </div>

              {/* Vehicle card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Car size={15} className="text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Vehículo
                  </p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {order.vehicle.brand} {order.vehicle.model}
                  {order.vehicle.year && (
                    <span className="text-gray-500 font-normal"> {order.vehicle.year}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {order.vehicle.plate}
                  </span>
                  {order.vehicle.color && (
                    <span className="text-sm text-gray-500">{order.vehicle.color}</span>
                  )}
                </div>
              </div>

              {/* Work description */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Trabajo solicitado
                </p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {order.description}
                </p>
              </div>

              {/* Budget approval */}
              {order.estimatedCost != null && (
                <div className={[
                  "rounded-xl border p-5",
                  isApproved
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200",
                ].join(" ")}>
                  <div className="flex items-start gap-3">
                    <div className={[
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      isApproved ? "bg-green-100" : "bg-amber-100",
                    ].join(" ")}>
                      {isApproved
                        ? <CheckCircle2 size={18} className="text-green-600" />
                        : <DollarSign size={18} className="text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={[
                        "text-sm font-semibold",
                        isApproved ? "text-green-800" : "text-amber-800",
                      ].join(" ")}>
                        {isApproved ? "Presupuesto aprobado" : "Presupuesto pendiente de aprobación"}
                      </p>
                      <p className={[
                        "text-lg font-bold mt-0.5 tabular-nums",
                        isApproved ? "text-green-700" : "text-amber-700",
                      ].join(" ")}>
                        {money(Number(order.estimatedCost))}
                      </p>
                      {!isApproved && (
                        <button
                          onClick={handleApprove}
                          disabled={approving}
                          className="mt-3 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                        >
                          <ThumbsUp size={15} />
                          {approving ? "Aprobando..." : "Aprobar presupuesto"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Details grid */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Detalles
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="Ingreso" value={fmt(order.createdAt) ?? "—"} />
                  {order.scheduledAt && (
                    <InfoRow
                      label="Turno"
                      value={
                        <span className="flex items-center gap-1">
                          <CalendarClock size={13} className="text-indigo-500 shrink-0" />
                          {fmtDateTime(order.scheduledAt)}
                        </span>
                      }
                    />
                  )}
                  {order.completedAt && (
                    <InfoRow label="Completado" value={fmt(order.completedAt) ?? "—"} />
                  )}
                  {order.finalCost != null && (
                    <InfoRow
                      label="Costo final"
                      value={
                        <span className="flex items-center gap-1 text-green-700">
                          <DollarSign size={13} className="shrink-0" />
                          {money(Number(order.finalCost))}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="py-6 text-center">
        <p className="text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold text-gray-500">MecánicOS</span>
        </p>
      </footer>
    </div>
  );
}
