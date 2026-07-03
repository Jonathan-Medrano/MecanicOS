"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { Field, inputClass } from "@/components/ui/field";

const schema = z.object({
  clientId: z.string().uuid("Seleccioná un cliente"),
  brand: z.string().min(1, "Requerido"),
  model: z.string().min(1, "Requerido"),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  plate: z.string().min(1, "Requerido"),
  color: z.string().optional(),
  vin: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type VehicleData = {
  id: string;
  clientId: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color?: string;
  vin?: string;
};

interface VehicleFormProps {
  clientId?: string;
  vehicle?: VehicleData;
  onSuccess: () => void;
}

export function VehicleForm({ clientId, vehicle, onSuccess }: VehicleFormProps) {
  const qc = useQueryClient();
  const isEdit = !!vehicle;

  const { data: clients } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle
      ? {
          clientId: vehicle.clientId,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          color: vehicle.color ?? "",
          vin: vehicle.vin ?? "",
        }
      : { clientId: clientId ?? "", year: new Date().getFullYear() },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit ? api.patch(`/vehicles/${vehicle.id}`, data) : api.post("/vehicles", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      onSuccess();
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
      <Field label="Cliente" error={errors.clientId?.message} required>
        <select className={inputClass} {...register("clientId")} disabled={!!clientId || isEdit}>
          <option value="">Seleccioná un cliente</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca" error={errors.brand?.message} required>
          <input className={inputClass} {...register("brand")} placeholder="Toyota" />
        </Field>
        <Field label="Modelo" error={errors.model?.message} required>
          <input className={inputClass} {...register("model")} placeholder="Corolla" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Año" error={errors.year?.message} required>
          <input className={inputClass} {...register("year")} type="number" />
        </Field>
        <Field label="Patente" error={errors.plate?.message} required>
          <input className={inputClass} {...register("plate")} placeholder="ABC 123" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Color" error={errors.color?.message}>
          <input className={inputClass} {...register("color")} placeholder="Rojo" />
        </Field>
        <Field label="VIN" error={errors.vin?.message}>
          <input className={inputClass} {...register("vin")} placeholder="Opcional" />
        </Field>
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          {(mutation.error as any)?.response?.data?.message ?? "Error al guardar"}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear vehículo"}
        </button>
      </div>
    </form>
  );
}
