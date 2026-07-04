"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/lib/api";
import { Field, inputClass } from "@/components/ui/field";
import { toast } from "sonner";

const createSchema = z.object({
  clientId: z.string().uuid("Seleccioná un cliente"),
  vehicleId: z.string().uuid("Seleccioná un vehículo"),
  description: z.string().min(1, "Describí el trabajo"),
  estimatedCost: z.coerce.number().positive().optional().or(z.literal("")),
  scheduledAt: z.string().optional(),
});

const editSchema = z.object({
  description: z.string().min(1, "Describí el trabajo"),
  estimatedCost: z.coerce.number().positive().optional().or(z.literal("")),
  finalCost: z.coerce.number().positive().optional().or(z.literal("")),
  mechanicNotes: z.string().max(2000).optional(),
  scheduledAt: z.string().optional(),
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
      mutation.mutate(payload);
    };
    return (
      <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
        <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-700">{workOrder.client.name}</p>
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
          <input className={inputClass} {...register("scheduledAt")} type="datetime-local" />
        </Field>

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

  const onSubmit = (d: CreateValues) => {
    const payload: any = { ...d };
    if (payload.scheduledAt) {
      payload.scheduledAt = new Date(payload.scheduledAt).toISOString();
    } else {
      delete payload.scheduledAt;
    }
    if (!payload.estimatedCost) delete payload.estimatedCost;
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Cliente" error={errors.clientId?.message} required>
        <select
          className={inputClass}
          {...register("clientId")}
          onChange={(e) => {
            setValue("clientId", e.target.value);
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

      <Field label="Descripción del trabajo" error={errors.description?.message} required>
        <textarea className={inputClass} {...register("description")} rows={3} placeholder="Cambio de aceite y filtros..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Presupuesto estimado ($)" error={errors.estimatedCost?.message}>
          <input className={inputClass} {...register("estimatedCost")} type="number" step="0.01" placeholder="Opcional" />
        </Field>
        <Field label="Turno (fecha y hora)" error={errors.scheduledAt?.message}>
          <input className={inputClass} {...register("scheduledAt")} type="datetime-local" />
        </Field>
      </div>

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
