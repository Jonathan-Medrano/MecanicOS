"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Send, Bot, User, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { usePermission } from "@/hooks/use-me";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  usedGuides?: { id: string; title: string; vehicle?: string }[];
  error?: boolean;
};

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-1.5">{children}</h3>,
        code: ({ children }) => <code className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-gray-100 rounded p-2 my-2 text-xs font-mono overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 text-gray-600 my-2">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isUser ? "bg-blue-600" : "bg-gray-800"}`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>
      <div className={`flex-1 max-w-2xl ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600 text-white rounded-tr-sm"
              : msg.error
              ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
              : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
          }`}
        >
          {msg.error && <AlertCircle size={13} className="inline mr-1.5 mb-0.5" />}
          {isUser || msg.error ? (
            <span className="whitespace-pre-wrap">{msg.content}</span>
          ) : (
            <AssistantMarkdown content={msg.content} />
          )}
        </div>
        {msg.usedGuides && msg.usedGuides.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.usedGuides.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                <BookOpen size={9} /> {g.title}{g.vehicle ? ` · ${g.vehicle}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center">
        <Bot size={13} className="text-white" />
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <Loader2 size={14} className="text-gray-400 animate-spin" />
      </div>
    </div>
  );
}

function AssistantContent() {
  const canView = usePermission("VIEW_ORDERS");
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const v = searchParams.get("vehicle");
    if (v) setVehicle(v);
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: vehicle ? `[${vehicle}] ${question}` : question,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/assistant/ask", { question, vehicle: vehicle || undefined });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        usedGuides: data.usedGuides,
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.response?.data?.message ?? "Error al conectar con el asistente. Revisá la clave de Gemini.",
        error: true,
      };
      setMessages((m) => [...m, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.length === 0;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center text-gray-400">
        <Bot size={40} className="opacity-30 mb-4" />
        <p className="text-sm font-medium text-gray-500">Sin acceso al asistente técnico</p>
        <p className="text-xs mt-1">Necesitás permiso de visualización de órdenes</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bot size={20} className="text-gray-700" /> Asistente técnico
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Preguntá sobre procedimientos de reparación. Usa tus guías técnicas como contexto.
          </p>
        </div>
        <div className="shrink-0 w-52">
          <input
            type="text"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            placeholder="Vehículo (opcional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-12">
            <Bot size={40} className="opacity-30 mb-4" />
            <p className="text-sm font-medium text-gray-500">¿En qué necesitás ayuda?</p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md">
              {[
                "¿Cómo cambio los frenos de disco?",
                "Pasos para hacer un service de aceite",
                "¿Cómo diagnostico una falla de encendido?",
                "Procedimiento para cambiar la correa de distribución",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="text-left text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded-lg px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 shrink-0">
        <div className="flex gap-2 items-end bg-white border border-gray-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Preguntá algo técnico… (Enter para enviar, Shift+Enter para nueva línea)"
            className="flex-1 text-sm resize-none focus:outline-none max-h-32 min-h-[36px] py-1 px-1"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Las respuestas se basan en las guías técnicas que cargaste + conocimiento general de mecánica
        </p>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense>
      <AssistantContent />
    </Suspense>
  );
}
