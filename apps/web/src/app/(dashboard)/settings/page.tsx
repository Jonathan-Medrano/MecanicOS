"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/use-me";
import { toast } from "sonner";
import { MessageCircle, Bot } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: me, isLoading } = useMe();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [botAutoReply, setBotAutoReply] = useState(false);
  const [botAutoReplyMsg, setBotAutoReplyMsg] = useState("");

  useEffect(() => {
    if (me?.workshop) {
      setName(me.workshop.name ?? "");
      setPhone(me.workshop.phone ?? "");
      setAddress(me.workshop.address ?? "");
      setBotAutoReply(me.workshop.botAutoReply ?? false);
      setBotAutoReplyMsg(me.workshop.botAutoReplyMsg ?? "");
    }
  }, [me]);

  const mutation = useMutation({
    mutationFn: (data: { name: string; phone: string; address: string; botAutoReply: boolean; botAutoReplyMsg: string }) =>
      api.patch("/workshop/settings", data),
    onSuccess: () => {
      toast.success("Configuración guardada");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-8">Cargando...</p>;
  }

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
            onClick={() => mutation.mutate({ name, phone, address, botAutoReply, botAutoReplyMsg })}
            disabled={mutation.isPending || !name.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Bot WhatsApp settings */}
      <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Bot de WhatsApp</h2>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-3">
            El bot permite que los mecánicos controlen órdenes por voz/texto desde su WhatsApp personal.
            Vinculá su número en la sección <strong>Empleados</strong>.
          </p>
          <div className="bg-gray-50 rounded-md p-3 font-mono text-xs text-gray-700 space-y-1">
            <p className="font-sans text-gray-500 font-medium text-[11px] mb-1">Variables de entorno requeridas:</p>
            <div>EVOLUTION_API_URL=http://localhost:8080</div>
            <div>EVOLUTION_API_KEY=tu-api-key</div>
            <div>EVOLUTION_INSTANCE=mecanico</div>
            <div>GEMINI_API_KEY=tu-gemini-key</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-green-600" />
                <p className="text-sm font-medium text-gray-800">Auto-respuesta a clientes</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Responde automáticamente cuando un cliente escribe al número del taller (máx. 1 vez por hora).
              </p>
            </div>
            <button
              role="switch"
              aria-checked={botAutoReply}
              onClick={() => setBotAutoReply((v) => !v)}
              className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${botAutoReply ? "bg-green-500" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${botAutoReply ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {botAutoReply && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mensaje de auto-respuesta
              </label>
              <textarea
                value={botAutoReplyMsg}
                onChange={(e) => setBotAutoReplyMsg(e.target.value)}
                rows={3}
                placeholder="¡Hola! 👋 Gracias por escribirnos. En breve te atendemos."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dejalo vacío para usar el mensaje por defecto.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => mutation.mutate({ name, phone, address, botAutoReply, botAutoReplyMsg })}
              disabled={mutation.isPending}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {mutation.isPending ? "Guardando..." : "Guardar configuración del bot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
