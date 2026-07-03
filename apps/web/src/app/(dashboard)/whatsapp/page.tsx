"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, UserCheck } from "lucide-react";
import { api } from "@/lib/api";

type Conversation = {
  phone: string;
  client: { id: string; name: string } | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

type Message = {
  id: string;
  phone: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  createdAt: string;
  client: { id: string; name: string } | null;
};

type Client = { id: string; name: string };

export default function WhatsAppPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyClientId, setClassifyClientId] = useState("");
  const qc = useQueryClient();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["wa-conversations"],
    queryFn: () => api.get("/whatsapp/conversations").then((r) => r.data),
    refetchInterval: 10_000,
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["wa-messages", selectedPhone],
    queryFn: () => api.get(`/whatsapp/conversations/${selectedPhone}`).then((r) => r.data),
    enabled: !!selectedPhone,
    refetchInterval: 5_000,
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients").then((r) => r.data),
    enabled: classifyOpen,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/whatsapp/conversations/${selectedPhone}/send`, { text }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedPhone] });
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
  });

  const classifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/whatsapp/conversations/${selectedPhone}/classify`, {
        clientId: classifyClientId,
      }),
    onSuccess: () => {
      setClassifyOpen(false);
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedPhone] });
    },
  });

  const selected = conversations?.find((c) => c.phone === selectedPhone);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8 overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-base font-semibold text-gray-900">WhatsApp</h1>
          <p className="text-xs text-gray-400 mt-0.5">Mensajes recibidos</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!conversations?.length && (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Sin mensajes aún.
            </p>
          )}
          {conversations?.map((conv) => (
            <button
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                selectedPhone === conv.phone ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {conv.client?.name ?? (
                    <span className="text-orange-600">Sin clasificar</span>
                  )}
                </p>
                {conv.unread > 0 && (
                  <span className="shrink-0 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                    {conv.unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{conv.phone}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Seleccioná una conversación</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selected?.client?.name ?? (
                    <span className="text-orange-600">Sin clasificar</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">{selectedPhone}</p>
              </div>
              {!selected?.client && (
                <button
                  onClick={() => setClassifyOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                >
                  <UserCheck size={13} /> Asociar cliente
                </button>
              )}
            </div>

            {/* Classify modal */}
            {classifyOpen && (
              <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center gap-3">
                <select
                  value={classifyClientId}
                  onChange={(e) => setClassifyClientId(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                >
                  <option value="">Seleccioná un cliente...</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => classifyMutation.mutate()}
                  disabled={!classifyClientId || classifyMutation.isPending}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  Guardar
                </button>
                <button onClick={() => setClassifyOpen(false)} className="text-gray-500 text-sm">
                  Cancelar
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages?.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                      m.direction === "OUTBOUND"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p
                      className={`text-xs mt-1 ${
                        m.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Send */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    sendMutation.mutate();
                  }
                }}
                placeholder="Escribí un mensaje..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => sendMutation.mutate()}
                disabled={!text.trim() || sendMutation.isPending}
                className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
