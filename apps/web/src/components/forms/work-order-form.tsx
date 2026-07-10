"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { Field, inputClass } from "@/components/ui/field";
import { toast } from "sonner";

const nowLocalIso = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const TEMPLATES = [
  { label: "Cambio de aceite",    description: "Cambio de aceite y filtros" },
  { label: "Frenos",              description: "Cambio de pastillas y discos de freno" },
  { label: "Distribución",        description: "Cambio de cadena/correa de distribución" },
  { label: "Inyectores",          description: "Limpieza y diagnóstico de inyectores" },
  { label: "Embrague",            description: "Cambio de kit de embrague" },
  { label: "Revisión general",    description: "Revisión general del vehículo" },
  { label: "Batería",             description: "Cambio de batería" },
  { label: "Alineación",          description: "Alineación y balanceo de ruedas" },
  { label: "Suspensión",          description: "Revisión y cambio de amortiguadores" },
  { label: "Diagnóstico",         description: "Diagnóstico electrónico con scanner" },
];

const createSchema = z.object({
  clientId: z.string().uuid("Seleccioná un cliente"),
  vehicleId: z.string().uuid("Seleccioná un vehículo"),
  description: z.string().min(1, "Describí el trabajo"),
  estimatedCost: z.coerce.number().positive().optional().or(z.literal("")),
  scheduledAt: z.string().optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

const editSchema = z.object({
  description: z.string().min(1, "Describí el trabajo"),
  estimatedCost: z.coerce.number().positive().optional().or(z.literal("")),
  finalCost: z.coerce.number().positive().optional().or(z.literal("")),
  mechanicNotes: z.string().max(2000).optional(),
  scheduledAt: z.string().optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

type WorkOrderData = {
  id: string;
  description: string;
  estimatedCost?: number;
  finalCost?: number;
  mechanicNotes?: string;
  scheduledAt?: string;
  assignedToId?: string;
  client: { name: string };
  vehicle: { brand: string; model: string; plate: string };
};

interface WorkOrderFormProps {
  onSuccess: () => void;
  workOrder?: WorkOrderData;
  defaultClientId?: string;
  defaultVehicleId?: string;
}

export function WorkOrderForm({ onSuccess, workOrder, defaultClientId, defaultVehicleId }: WorkOrderFormProps) {
  const qc = useQueryClient();
  const isEdit = !!workOrder;
  const [selectedClientId, setSelectedClientId] = useState(defaultClientId ?? "");

  const { data: clients } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then((r) => r.data),
    enabled: !isEdit,
  });

  const { data: vehicles } = useQuery<{ id: string; brand: string; model: string; plate: string }[]>({
    queryKey: ["vehicles", selectedClientId],
    queryFn: () => api.get("/vehicles", { params: { clientId: selectedClientId } }).then((r) => r.data),
    enabled: !!selectedClientId && !isEdit,
  });

  const { data: employees } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["employees"],
    queryFn: () => api.get("/employees").then((r) => r.data),
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      ...(defaultClientId ? { clientId: defaultClientId } : {}),
      ...(defaultVehicleId ? { vehicleId: defaultVehicleId } : {}),
    },
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: workOrder
      ? {
          description: workOrder.description,
          estimatedCost: workOrder.estimatedCost ?? "",
          finalCost: workOrder.finalCost ?? "",
          mechanicNotes: workOrder.mechanicNotes ?? "",
          scheduledAt: workOrder.scheduledAt
            ? new Date(workOrder.scheduledAt).toISOString().slice(0, 16)
            : "",
          assignedToId: workOrder.assignedToId ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: CreateValues | EditValues) =>
      isEdit
        ? api.patch(`/work-orders/${workOrder.id}`, data)
        : api.post("/work-orders", data),
    onSuccess: () => {
      toast.success(isEdit ? "Orden actualizada" : "Orden creada");
      qc.invalidateQueries({ queryKey: ["work-orders"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  if (isEdit) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = editForm;
    const onEditSubmit = (d: EditValues) => {
      const payload: any = { ...d };
      if (payload.scheduledAt) {
        payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
      } else {
        delete payload.scheduledAt;
      }
      if (!payload.estimatedCost) delete payload.estimatedCost;
      if (!payload.finalCost) delete payload.finalCost;
      if (!payload.mechanicNotes) delete payload.mechanicNotes;
      if (!payload.assignedToId) payload.assignedToId = null;
      mutation.mutate(payload);
    };
    return (
      <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300">{workOrder.client.name}</p>
          <p>{workOrder.vehicle.brand} {workOrder.vehicle.model} – {workOrder.vehicle.plate}</p>
        </div>

        <Field label="Descripción del trabajo" error={errors.description?.message} required>
          <textarea className={inputClass} {...register("description")} rows={3} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Costo estimado ($)" error={errors.estimatedCost?.message}>
            <input className={inputClass} {...register("estimatedCost")} type="number" step="0.01" placeholder="Opcional" />
          </Field>
          <Field label="Costo final ($)" error={errors.finalCost?.message}>
            <input className={inputClass} {...register("finalCost")} type="number" step="0.01" placeholder="Opcional" />
          </Field>
        </div>

        <Field label="Turno (fecha y hora)" error={errors.scheduledAt?.message}>
          <input className={inputClass} {...register("scheduledAt")} type="datetime-local" min={nowLocalIso()} />
        </Field>

        {employees && employees.length > 0 && (
          <Field label="Mecánico asignado" error={errors.assignedToId?.message}>
            <select className={inputClass} {...register("assignedToId")}>
              <option value="">Sin asignar</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Notas del mecánico" error={errors.mechanicNotes?.message}>
          <textarea className={inputClass} {...register("mechanicNotes")} rows={3} placeholder="Observaciones internas..." />
        </Field>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    );
  }

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = createForm;
  const { onChange: onClientChange, ...clientRegist } = register("clientId");

  const onSubmit = (d: CreateValues) => {
    const payload: any = { ...d };
    if (payload.scheduledAt) {
      payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
    } else {
      delete payload.scheduledAt;
    }
    if (!payload.estimatedCost) delete payload.estimatedCost;
    if (!payload.assignedToId) delete payload.assignedToId;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Cliente" error={errors.clientId?.message} required>
        <select
          className={inputClass}
          {...clientRegist}
          onChange={(e) => {
            onClientChange(e);
            setValue("vehicleId", "");
            setSelectedClientId(e.target.value);
          }}
        >
          <option value="">Seleccioná un cliente</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Vehículo" error={errors.vehicleId?.message} required>
        <select className={inputClass} {...register("vehicleId")} disabled={!selectedClientId}>
          <option value="">
            {selectedClientId ? "Seleccioná un vehículo" : "Primero elegí un cliente"}
          </option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>{v.brand} {v.model} – {v.plate}</option>
          ))}
        </select>
      </Field>

      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Plantillas rápidas</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setValue("description", t.description, { shouldValidate: true })}
              className="text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:border-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Descripción del trabajo" error={errors.description?.message} required>
        <textarea className={inputClass} {...register("description")} rows={3} placeholder="Cambio de aceite y filtros..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Presupuesto estimado ($)" error={errors.estimatedCost?.message}>
          <input className={inputClass} {...register("estimatedCost")} type="number" step="0.01" placeholder="Opcional" />
        </Field>
        <Field label="Turno (fecha y hora)" error={errors.scheduledAt?.message}>
          <input className={inputClass} {...register("scheduledAt")} type="datetime-local" min={nowLocalIso()} />
        </Field>
      </div>

      {employees && employees.length > 0 && (
        <Field label="Mecánico asignado" error={(errors as any).assignedToId?.message}>
          <select className={inputClass} {...register("assignedToId")}>
            <option value="">Sin asignar</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </Field>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : "Crear orden"}
        </button>
      </div>
    </form>
  );
}
