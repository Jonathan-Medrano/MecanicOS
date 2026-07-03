"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

const ALL_PERMISSIONS = [
  { key: "VIEW_CLIENTS",        label: "Ver clientes" },
  { key: "EDIT_CLIENTS",        label: "Editar clientes" },
  { key: "DELETE_CLIENTS",      label: "Eliminar clientes" },
  { key: "VIEW_VEHICLES",       label: "Ver vehículos" },
  { key: "EDIT_VEHICLES",       label: "Editar vehículos" },
  { key: "VIEW_ORDERS",         label: "Ver órdenes" },
  { key: "EDIT_ORDERS",         label: "Editar órdenes" },
  { key: "CHANGE_ORDER_STATUS", label: "Cambiar estado de orden" },
  { key: "VIEW_WHATSAPP",       label: "Ver WhatsApp" },
  { key: "SEND_WHATSAPP",       label: "Enviar WhatsApp" },
  { key: "MANAGE_EMPLOYEES",    label: "Gestionar empleados" },
];

const PRESETS = {
  mechanic:     ["VIEW_CLIENTS", "VIEW_VEHICLES", "VIEW_ORDERS", "CHANGE_ORDER_STATUS"],
  receptionist: ["VIEW_CLIENTS", "EDIT_CLIENTS", "VIEW_VEHICLES", "EDIT_VEHICLES", "VIEW_ORDERS", "EDIT_ORDERS", "CHANGE_ORDER_STATUS", "VIEW_WHATSAPP", "SEND_WHATSAPP"],
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  permissions: string[];
  clerkUserId?: string;
};

function EmployeeForm({
  employee,
  onSuccess,
}: {
  employee?: Employee;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!employee;

  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [permissions, setPermissions] = useState<string[]>(
    employee?.permissions ?? PRESETS.mechanic,
  );
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? api.patch(`/employees/${employee.id}`, data)
        : api.post("/employees", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      onSuccess();
    },
    onError: (e: any) => setError(e.response?.data?.message ?? "Error al guardar"),
  });

  const togglePerm = (key: string) =>
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );

  const applyPreset = (preset: keyof typeof PRESETS) =>
    setPermissions(PRESETS[preset]);

  return (
    <div className="space-y-4">
      {!isEdit && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => applyPreset("mechanic")}
            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
          >
            Preset: Mecánico
          </button>
          <button
            onClick={() => applyPreset("receptionist")}
            className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
          >
            Preset: Recepcionista
          </button>
        </div>
      )}

      {!isEdit && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="juan@taller.com"
            />
            <p className="text-xs text-gray-400 mt-1">
              El empleado recibirá un link para acceder con este email.
            </p>
          </div>
        </>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Teléfono WhatsApp
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="+5491112345678"
        />
        <p className="text-xs text-gray-400 mt-1">
          Si lo agregás, podrá usar el bot de WhatsApp.
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Permisos</p>
        <div className="space-y-1.5">
          {ALL_PERMISSIONS.map((p) => (
            <label key={p.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={permissions.includes(p.key)}
                onChange={() => togglePerm(p.key)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end pt-2">
        <button
          onClick={() =>
            mutation.mutate({ name, email, phone: phone || undefined, permissions })
          }
          disabled={mutation.isPending || (!isEdit && (!name || !email))}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending
            ? "Guardando..."
            : isEdit
              ? "Guardar cambios"
              : "Agregar empleado"}
        </button>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const qc = useQueryClient();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => api.get("/employees").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Empleados</h1>
          <p className="text-sm text-gray-500 mt-1">
            Los empleados pueden acceder a la web y al bot de WhatsApp según sus permisos.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <UserPlus size={15} /> Agregar empleado
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {employees?.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                  {emp.clerkUserId ? (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      Activo
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                      Pendiente de registro
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{emp.email}</p>
                {emp.phone && (
                  <p className="text-xs text-gray-400">{emp.phone} (WhatsApp)</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {emp.permissions.map((p) => (
                    <span
                      key={p}
                      className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                    >
                      {ALL_PERMISSIONS.find((x) => x.key === p)?.label ?? p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setEditTarget(emp)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`¿Eliminar a ${emp.name}?`)) return;
                    deleteMutation.mutate(emp.id);
                  }}
                  className="text-gray-400 hover:text-red-600 p-1 rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!employees?.length && (
            <p className="text-center text-sm text-gray-400 py-10">
              Todavía no hay empleados. Agregá el primero.
            </p>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Agregar empleado">
        <EmployeeForm onSuccess={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar empleado"
      >
        {editTarget && (
          <EmployeeForm employee={editTarget} onSuccess={() => setEditTarget(null)} />
        )}
      </Modal>
    </div>
  );
}
