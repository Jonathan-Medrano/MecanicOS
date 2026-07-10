"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, UserCheck, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/relative-time";
import { toast } from "sonner";
import { usePermission } from "@/hooks/use-me";

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
  const canView = usePermission("VIEW_WHATSAPP");
  const canSend = usePermission("SEND_WHATSAPP");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyClientId, setClassifyClientId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: conversations, isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["wa-conversations"],
    queryFn: () => api.get("/whatsapp/conversations").then((r) => r.data),
    refetchInterval: 10_000,
    enabled: canView,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages) {
      qc.invalidateQueries({ queryKey: ["wa-conversations-badge"] });
    }
  }, [messages, qc]);

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`/whatsapp/conversations/${selectedPhone}/send`, { text }),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedPhone] });
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al enviar el mensaje"),
  });

  const classifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/whatsapp/conversations/${selectedPhone}/classify`, {
        clientId: classifyClientId,
      }),
    onSuccess: () => {
      setClassifyOpen(false);
      setClassifyClientId("");
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedPhone] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Error al asociar el cliente"),
  });

  if (!canView) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500 text-sm">
        No tenés permisos para ver las conversaciones de WhatsApp.
      </div>
    );
  }

  const selected = conversations?.find((c) => c.phone === selectedPhone);

  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    setClassifyOpen(false);
  };

  const handleBack = () => {
    setSelectedPhone(null);
    setClassifyOpen(false);
  };

  // On mobile: show list when no conversation selected, show chat when selected
  // On desktop (md+): always show both panels

  const ConversationList = (
    <div className={`
      flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
      w-full md:w-72 md:shrink-0
      ${selectedPhone ? "hidden md:flex" : "flex"}
    `}>
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">WhatsApp</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Mensajes de clientes</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {convsLoading && (
          <div className="space-y-px animate-pulse px-4 pt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[60px] bg-gray-100 dark:bg-gray-700 rounded-lg mb-1" />
            ))}
          </div>
        )}
        {!convsLoading && !conversations?.length && (
          <p className="px-4 py-8 text-sm text-gray-400 dark:text-gray-500 text-center">Sin mensajes aún.</p>
        )}
        {conversations?.map((conv) => (
          <button
            key={conv.phone}
            onClick={() => handleSelectConversation(conv.phone)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 transition-colors ${
              selectedPhone === conv.phone ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {conv.client?.name ?? (
                  <span className="text-orange-500">Sin clasificar</span>
                )}
              </p>
              {conv.unread > 0 && (
                <span className="shrink-0 bg-blue-600 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
                  {conv.unread}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{conv.phone}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1 mr-2">{conv.lastMessage}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{relativeTime(conv.lastAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const ChatPanel = (
    <div className={`
      flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 min-w-0
      ${selectedPhone ? "flex" : "hidden md:flex"}
    `}>
      {!selectedPhone ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Seleccioná una conversación</p>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              onClick={handleBack}
              className="md:hidden flex items-center justify-center w-9 h-9 text-gray-500 dark:text-gray-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {selected?.client?.name ?? (
                  <span className="text-orange-500">Sin clasificar</span>
                )}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{selectedPhone}</p>
            </div>
            {!selected?.client && canSend && (
              <button
                onClick={() => setClassifyOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600 shrink-0"
              >
                <UserCheck size={13} /> Asociar
              </button>
            )}
          </div>

          {/* Classify panel */}
          {classifyOpen && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center gap-2 shrink-0">
              <select
                value={classifyClientId}
                onChange={(e) => setClassifyClientId(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-sm flex-1 bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Seleccioná un cliente...</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => classifyMutation.mutate()}
                disabled={!classifyClientId || classifyMutation.isPending}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50 font-medium whitespace-nowrap"
              >
                {classifyMutation.isPending ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => setClassifyOpen(false)}
                className="flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
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
                  className={`max-w-[80%] sm:max-w-sm lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                    m.direction === "OUTBOUND"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      m.direction === "OUTBOUND" ? "text-blue-100" : "text-gray-400 dark:text-gray-500"
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
            <div ref={messagesEndRef} />
          </div>

          {/* Send */}
          {canSend ? (
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && text.trim() && selectedPhone) {
                    e.preventDefault();
                    sendMutation.mutate();
                  }
                }}
                enterKeyHint="send"
                inputMode="text"
                placeholder="Escribí un mensaje..."
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                onClick={() => sendMutation.mutate()}
                disabled={!text.trim() || sendMutation.isPending}
                className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3 shrink-0">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Solo lectura — sin permiso para enviar mensajes.</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3rem)] md:h-screen -m-4 md:-m-6 overflow-hidden">
      {ConversationList}
      {ChatPanel}
    </div>
  );
}
