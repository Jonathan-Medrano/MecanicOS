"use client";

import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { api } from "@/lib/api";

const STATUS_COLOR: Record<string, string> = {
  PENDING:       "border-l-yellow-400 bg-yellow-50 dark:bg-yellow-950/20",
  IN_PROGRESS:   "border-l-blue-400 bg-blue-50 dark:bg-blue-950/20",
  WAITING_PARTS: "border-l-orange-400 bg-orange-50 dark:bg-orange-950/20",
  DONE:          "border-l-green-400 bg-green-50 dark:bg-green-950/20",
  DELIVERED:     "border-l-gray-300 bg-gray-50 dark:bg-gray-800/40",
  CANCELLED:     "border-l-red-300 bg-red-50/50 dark:bg-red-950/10 opacity-60",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING:       "Pendiente",
  IN_PROGRESS:   "En progreso",
  WAITING_PARTS: "Esperando",
  DONE:          "Listo",
  DELIVERED:     "Entregado",
  CANCELLED:     "Cancelado",
};

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CalendarOrder = {
  id: string;
  description: string;
  status: string;
  scheduledAt: string;
  client: { id: string; name: string };
  vehicle: { brand: string; model: string; plate: string };
  assignedTo?: { name: string } | null;
};

function getWeekDays(offset: number): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isToday(d: Date) {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function CalendarInner() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const days = getWeekDays(weekOffset);
  const from = days[0];
  const to = new Date(days[6]);
  to.setHours(23, 59, 59, 999);

  const { data, isLoading } = useQuery<{ items: CalendarOrder[] }>({
    queryKey: ["calendar-orders", from.toISOString(), to.toISOString()],
    queryFn: () =>
      api
        .get("/work-orders", {
          params: {
            scheduledFrom: from.toISOString(),
            scheduledTo: to.toISOString(),
            limit: 100,
          },
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const ordersByDay = days.map((day) =>
    (data?.items ?? []).filter((o) => {
      const d = new Date(o.scheduledAt);
      return (
        d.getDate() === day.getDate() &&
        d.getMonth() === day.getMonth() &&
        d.getFullYear() === day.getFullYear()
      );
    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
  );

  const monthLabel = from.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Calendario</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Hoy
          </button>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week range */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {from.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} —{" "}
        {to.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        {" "}· {(data?.items ?? []).length} turno{(data?.items ?? []).length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {days.map((day, i) => {
            const today = isToday(day);
            const dayOrders = ordersByDay[i];
            return (
              <div key={i} className="flex flex-col min-h-[160px]">
                {/* Day header */}
                <div
                  className={`text-center py-2 mb-2 rounded-lg text-xs font-semibold ${
                    today
                      ? "bg-blue-600 text-white"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`text-base font-bold mt-0.5 ${today ? "text-white" : "text-gray-900 dark:text-gray-100"}`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Orders */}
                <div className="flex flex-col gap-1.5 flex-1">
                  {isLoading ? (
                    <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ) : dayOrders.length === 0 ? (
                    <div className="flex-1 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center min-h-[80px]">
                      <button
                        onClick={() => router.push("/work-orders?create=1")}
                        className="text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors"
                        title="Nueva orden"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      {dayOrders.map((o) => {
                        const colorClass = STATUS_COLOR[o.status] ?? "border-l-gray-300 bg-gray-50";
                        const time = new Date(o.scheduledAt).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <button
                            key={o.id}
                            onClick={() => router.push(`/work-orders/${o.id}`)}
                            className={`text-left w-full border-l-2 rounded-r-md px-2 py-1.5 text-[11px] hover:opacity-80 transition-opacity ${colorClass}`}
                          >
                            <p className="font-semibold text-gray-700 dark:text-gray-200 leading-tight text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                              {time} · {STATUS_LABEL[o.status] ?? o.status}
                            </p>
                            <p className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight">
                              {o.description}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {o.client.name} · {o.vehicle.plate}
                            </p>
                            {o.assignedTo && (
                              <p className="text-gray-400 dark:text-gray-500 truncate">{o.assignedTo.name}</p>
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarInner />
    </Suspense>
  );
}
