"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { toast } from "sonner";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (me?.workshop) {
      setName(me.workshop.name ?? "");
      setPhone(me.workshop.phone ?? "");
      setAddress(me.workshop.address ?? "");
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; phone: string; address: string }) =>
      api.patch("/workshop/settings", data),
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  if (!me?.isOwner) {
    return (
      <div className="text-center py-20 text-gray-400 text-sm">
        Solo el dueño del taller puede acceder a esta sección.
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración del taller</h1>
        <p className="text-sm text-gray-500 mt-1">
          Esta información se usa en los PDFs y comunicaciones con clientes.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre del taller *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Taller Mecánico San Martín"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Teléfono / WhatsApp del taller
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="+5491112345678"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se usa como número de contacto en los presupuestos PDF.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dirección</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Av. Corrientes 1234, Buenos Aires"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => mutation.mutate({ name, phone, address })}
              disabled={mutation.isPending || !name.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Integración WhatsApp</h2>
        <p className="text-xs text-gray-500">
          Para activar el bot de WhatsApp y las notificaciones automáticas a clientes, configurá
          las variables de entorno en el servidor:
        </p>
        <div className="mt-3 bg-gray-50 rounded-md p-3 font-mono text-xs text-gray-700 space-y-1">
          <div>EVOLUTION_API_URL=http://localhost:8080</div>
          <div>EVOLUTION_API_KEY=tu-api-key</div>
          <div>EVOLUTION_INSTANCE=mecanico</div>
        </div>
      </div>
    </div>
  );
}
