"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, UserCheck, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/relative-time";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      setClassifyClientId("");
      qc.invalidateQueries({ queryKey: ["wa-conversations"] });
      qc.invalidateQueries({ queryKey: ["wa-messages", selectedPhone] });
    },
  });

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
      flex flex-col bg-white border-r border-gray-200
      w-full md:w-72 md:shrink-0
      ${selectedPhone ? "hidden md:flex" : "flex"}
    `}>
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900">WhatsApp</h1>
        <p className="text-xs text-gray-400 mt-0.5">Mensajes de clientes</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {!conversations?.length && (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin mensajes aún.</p>
        )}
        {conversations?.map((conv) => (
          <button
            key={conv.phone}
            onClick={() => handleSelectConversation(conv.phone)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
              selectedPhone === conv.phone ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
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
            <p className="text-xs text-gray-400 mt-0.5">{conv.phone}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-gray-400 truncate flex-1 mr-2">{conv.lastMessage}</p>
              <p className="text-xs text-gray-300 shrink-0">{relativeTime(conv.lastAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const ChatPanel = (
    <div className={`
      flex-1 flex flex-col bg-gray-50 min-w-0
      ${selectedPhone ? "flex" : "hidden md:flex"}
    `}>
      {!selectedPhone ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Seleccioná una conversación</p>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
            <button
              onClick={handleBack}
              className="md:hidden flex items-center justify-center w-9 h-9 text-gray-500 rounded-md hover:bg-gray-100"
              aria-label="Volver"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {selected?.client?.name ?? (
                  <span className="text-orange-500">Sin clasificar</span>
                )}
              </p>
              <p className="text-xs text-gray-400">{selectedPhone}</p>
            </div>
            {!selected?.client && (
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
                className="border border-gray-300 rounded px-2 py-2 text-sm flex-1 bg-white"
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
                className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
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
                      : "bg-white border border-gray-200 text-gray-900 rounded-bl-sm shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
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
            <div ref={messagesEndRef} />
          </div>

          {/* Send */}
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 shrink-0">
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
              enterKeyHint="send"
              inputMode="text"
              placeholder="Escribí un mensaje..."
              className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
            <button
              onClick={() => sendMutation.mutate()}
              disabled={!text.trim() || sendMutation.isPending}
              className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
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
