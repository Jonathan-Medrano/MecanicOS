"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Wrench,
  Package,
  Droplets,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { usePermission } from "@/hooks/use-me";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepTool = { id: string; name: string; type: "TOOL" | "PART" | "FLUID"; quantity: number };
type ProcessStep = {
  id: string;
  order: number;
  title: string;
  description?: string;
  durationMinutes?: number;
  tools: StepTool[];
};
type ProcessSummary = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  estimatedMinutes?: number;
  createdAt: string;
  _count: { steps: number };
};
type ProcessDetail = ProcessSummary & { steps: ProcessStep[] };

type DraftTool = { name: string; type: "TOOL" | "PART" | "FLUID"; quantity: number };
type DraftStep = {
  title: string;
  description: string;
  durationMinutes: string;
  tools: DraftTool[];
};

const CATEGORIES = ["Motor", "Frenos", "Transmisión", "Suspensión", "Eléctrico", "Refrigeración", "Dirección", "Otro"];
const TOOL_ICONS = { TOOL: Wrench, PART: Package, FLUID: Droplets };
const TOOL_LABELS = { TOOL: "Herramienta", PART: "Repuesto", FLUID: "Fluido" };

const EMPTY_STEP: DraftStep = { title: "", description: "", durationMinutes: "", tools: [] };

// ---------------------------------------------------------------------------
// Process Form
// ---------------------------------------------------------------------------

function ProcessForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [steps, setSteps] = useState<DraftStep[]>([{ ...EMPTY_STEP }]);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/processes", {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        steps: steps
          .filter((s) => s.title.trim())
          .map((s, i) => ({
            order: i,
            title: s.title.trim(),
            description: s.description.trim() || undefined,
            durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
            tools: s.tools.filter((t) => t.name.trim()),
          })),
      }),
    onSuccess: () => {
      toast.success("Proceso creado");
      setOpen(false);
      setName(""); setDescription(""); setCategory(""); setEstimatedMinutes("");
      setSteps([{ ...EMPTY_STEP }]);
      qc.invalidateQueries({ queryKey: ["processes"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al guardar"),
  });

  function addStep() {
    setSteps((s) => [...s, { ...EMPTY_STEP, tools: [] }]);
  }

  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof DraftStep, value: string) {
    setSteps((s) => s.map((step, idx) => (idx === i ? { ...step, [field]: value } : step)));
  }

  function addTool(stepIdx: number) {
    setSteps((s) =>
      s.map((step, idx) =>
        idx === stepIdx
          ? { ...step, tools: [...step.tools, { name: "", type: "TOOL" as const, quantity: 1 }] }
          : step,
      ),
    );
  }

  function updateTool(stepIdx: number, toolIdx: number, field: keyof DraftTool, value: string | number) {
    setSteps((s) =>
      s.map((step, idx) =>
        idx === stepIdx
          ? { ...step, tools: step.tools.map((t, ti) => (ti === toolIdx ? { ...t, [field]: value } : t)) }
          : step,
      ),
    );
  }

  function removeTool(stepIdx: number, toolIdx: number) {
    setSteps((s) =>
      s.map((step, idx) =>
        idx === stepIdx ? { ...step, tools: step.tools.filter((_, ti) => ti !== toolIdx) } : step,
      ),
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={15} /> Nuevo proceso
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Nuevo proceso</h2>

      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <input
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Nombre del proceso (ej: Cambio de aceite)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Categoría (opcional)</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="number"
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          placeholder="Duración total (minutos)"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
        />
        <div className="sm:col-span-2">
          <textarea
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
            placeholder="Descripción (opcional)"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pasos</p>
        {steps.map((step, si) => (
          <div key={si} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-500 w-5 shrink-0">{si + 1}.</span>
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                placeholder="Título del paso"
                value={step.title}
                onChange={(e) => updateStep(si, "title", e.target.value)}
              />
              <input
                type="number"
                className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                placeholder="min"
                value={step.durationMinutes}
                onChange={(e) => updateStep(si, "durationMinutes", e.target.value)}
              />
              {steps.length > 1 && (
                <button onClick={() => removeStep(si)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none"
              placeholder="Descripción del paso (opcional)"
              rows={2}
              value={step.description}
              onChange={(e) => updateStep(si, "description", e.target.value)}
            />
            {/* Tools */}
            {step.tools.map((tool, ti) => (
              <div key={ti} className="flex items-center gap-2 pl-4">
                <select
                  className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  value={tool.type}
                  onChange={(e) => updateTool(si, ti, "type", e.target.value)}
                >
                  <option value="TOOL">Herramienta</option>
                  <option value="PART">Repuesto</option>
                  <option value="FLUID">Fluido</option>
                </select>
                <input
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  placeholder="Nombre"
                  value={tool.name}
                  onChange={(e) => updateTool(si, ti, "name", e.target.value)}
                />
                <input
                  type="number"
                  className="w-14 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Cant."
                  value={tool.quantity}
                  min={1}
                  onChange={(e) => updateTool(si, ti, "quantity", Number(e.target.value))}
                />
                <button onClick={() => removeTool(si, ti)} className="text-gray-300 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={() => addTool(si)}
              className="text-xs text-blue-500 hover:text-blue-700 pl-4"
            >
              + Herramienta/Repuesto
            </button>
          </div>
        ))}
        <button
          onClick={addStep}
          className="text-xs text-blue-500 hover:text-blue-700 font-medium"
        >
          + Agregar paso
        </button>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={!name.trim() || mutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {mutation.isPending ? "Guardando..." : "Guardar proceso"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process Card
// ---------------------------------------------------------------------------

function ProcessCard({ process, canEdit }: { process: ProcessSummary; canEdit: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const qc = useQueryClient();

  const { data: detail } = useQuery<ProcessDetail>({
    queryKey: ["process", process.id],
    queryFn: () => api.get(`/processes/${process.id}`).then((r) => r.data),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/processes/${process.id}`),
    onSuccess: () => {
      toast.success("Proceso eliminado");
      qc.invalidateQueries({ queryKey: ["processes"] });
    },
    onError: () => toast.error("Error al eliminar"),
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{process.name}</p>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {process.category && (
              <span className="text-xs text-blue-600 dark:text-blue-400">{process.category}</span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {process._count.steps} {process._count.steps === 1 ? "paso" : "pasos"}
            </span>
            {process.estimatedMinutes && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                <Clock size={11} /> {process.estimatedMinutes} min
              </span>
            )}
          </div>
          {process.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{process.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && detail && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4 space-y-4">
          {detail.steps.map((step) => {
            return (
              <div key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-blue-500 w-5 text-center">{step.order + 1}</span>
                  <div className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1" />
                </div>
                <div className="flex-1 pb-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.title}</p>
                    {step.durationMinutes && (
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <Clock size={11} /> {step.durationMinutes} min
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{step.description}</p>
                  )}
                  {step.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {step.tools.map((tool) => {
                        const Icon = TOOL_ICONS[tool.type];
                        return (
                          <span
                            key={tool.id}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full"
                            title={TOOL_LABELS[tool.type]}
                          >
                            <Icon size={10} />
                            {tool.quantity > 1 && <span className="font-mono">{tool.quantity}×</span>}
                            {tool.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar proceso"
        description={`¿Eliminás "${process.name}"? Se borrarán todos sus pasos.`}
        onConfirm={() => { deleteMutation.mutate(); setConfirmDelete(false); }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProcessesPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const canEdit = usePermission("EDIT_ORDERS");

  const { data: processes, isLoading } = useQuery<ProcessSummary[]>({
    queryKey: ["processes", debouncedSearch],
    queryFn: () =>
      api
        .get("/processes", { params: debouncedSearch ? { search: debouncedSearch } : {} })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Layers size={22} className="text-blue-600" />
          Procesos
        </h1>
        {canEdit && <ProcessForm onSuccess={() => {}} />}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
          placeholder="Buscar procesos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !processes?.length ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Layers size={32} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {debouncedSearch ? "Sin resultados" : "No hay procesos creados"}
          </p>
          {!debouncedSearch && canEdit && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Creá protocolos de reparación paso a paso con herramientas y repuestos.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {processes.map((p) => (
            <ProcessCard key={p.id} process={p} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
