"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-me";

type Guide = {
  id: string;
  title: string;
  vehicle?: string;
  category?: string;
  createdAt: string;
};

type GuideDetail = Guide & { content: string };

const CATEGORIES = ["Motor", "Frenos", "Transmisión", "Suspensión", "Eléctrico", "Refrigeración", "Dirección", "Otro"];

function GuideForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ title: "", vehicle: "", category: "", content: "" });
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.post("/guides", form),
    onSuccess: () => {
      toast.success("Guía guardada");
      setForm({ title: "", vehicle: "", category: "", content: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["guides"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={15} /> Nueva guía
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Nueva guía técnica</p>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ej: Cambio de aceite de motor"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vehículo</label>
          <input
            type="text"
            value={form.vehicle}
            onChange={(e) => setForm((f) => ({ ...f, vehicle: e.target.value }))}
            placeholder="Ej: Toyota Corolla 2019"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sin categoría</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Contenido de la guía *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          rows={8}
          placeholder={`Pegá o escribí el procedimiento técnico paso a paso.\n\nEj:\n1. Levantar el vehículo con el gato hidráulico\n2. Ubicar el tapón del cárter...\n3. ...`}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        />
      </div>
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !form.title.trim() || form.content.length < 10}
        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "Guardando..." : "Guardar guía"}
      </button>
    </div>
  );
}

function GuideRow({ guide, canEdit }: { guide: Guide; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const { data: detail } = useQuery<GuideDetail>({
    queryKey: ["guide", guide.id],
    queryFn: () => api.get(`/guides/${guide.id}`).then((r) => r.data),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/guides/${guide.id}`),
    onSuccess: () => {
      toast.success("Guía eliminada");
      qc.invalidateQueries({ queryKey: ["guides"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al eliminar"),
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <BookOpen size={16} className="text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{guide.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {guide.vehicle && (
              <span className="text-xs text-gray-500">{guide.vehicle}</span>
            )}
            {guide.category && (
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                {guide.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
              className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {detail ? (
            <pre className="mt-3 text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 max-h-64 overflow-y-auto">
              {detail.content}
            </pre>
          ) : (
            <p className="mt-3 text-xs text-gray-400">Cargando...</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuidesPage() {
  const canEdit = usePermission("EDIT_ORDERS");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: guides, isLoading, isError } = useQuery<Guide[]>({
    queryKey: ["guides", debouncedSearch],
    queryFn: () => {
      const qs = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : "";
      return api.get(`/guides${qs}`).then((r) => r.data);
    },
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Guías técnicas</h1>
          <p className="text-xs text-gray-400 mt-0.5">El asistente de IA las usa para responder preguntas técnicas</p>
        </div>
        {canEdit && <GuideForm onSuccess={() => {}} />}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar guías..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isError ? (
        <p className="text-sm text-red-500 py-4">Error al cargar guías. Verificá tu conexión o permisos.</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : !guides?.length ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {search ? "Sin resultados" : "No hay guías cargadas todavía"}
          </p>
          {!search && (
            <p className="text-xs mt-1">Cargá procedimientos técnicos para que el asistente pueda usarlos</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {guides.map((g) => <GuideRow key={g.id} guide={g} canEdit={canEdit} />)}
        </div>
      )}
    </div>
  );
}
