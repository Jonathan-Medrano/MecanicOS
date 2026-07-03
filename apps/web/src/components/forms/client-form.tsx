"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";
import { Field, inputClass } from "@/components/ui/field";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().min(8, "Teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClientFormProps {
  onSuccess: () => void;
  client?: { id: string; name: string; phone: string; email?: string; notes?: string };
}

export function ClientForm({ onSuccess, client }: ClientFormProps) {
  const qc = useQueryClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: client
      ? { name: client.name, phone: client.phone, email: client.email ?? "", notes: client.notes ?? "" }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      isEdit
        ? api.patch(`/clients/${client.id}`, data)
        : api.post("/clients", data),
    onSuccess: () => {
      toast.success(isEdit ? "Cliente actualizado" : "Cliente creado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4"
    >
      <Field label="Nombre" error={errors.name?.message} required>
        <input className={inputClass} {...register("name")} placeholder="Juan García" />
      </Field>

      <Field label="Teléfono" error={errors.phone?.message} required>
        <input className={inputClass} {...register("phone")} placeholder="+54 11 1234-5678" />
      </Field>

      <Field label="Email" error={errors.email?.message}>
        <input className={inputClass} {...register("email")} type="email" placeholder="juan@email.com" />
      </Field>

      <Field label="Notas" error={errors.notes?.message}>
        <textarea
          className={inputClass}
          {...register("notes")}
          rows={2}
          placeholder="Info adicional..."
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}
