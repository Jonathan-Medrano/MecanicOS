"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, Users, ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";

type SearchClient = { id: string; name: string; phone: string };
type SearchOrder = {
  id: string;
  description: string;
  status: string;
  client: { name: string };
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enabled = debouncedQuery.length >= 2;

  const { data: clients } = useQuery<SearchClient[]>({
    queryKey: ["global-search-clients", debouncedQuery],
    queryFn: () =>
      api.get("/clients", { params: { search: debouncedQuery } }).then((r) => r.data.slice(0, 5)),
    enabled,
    staleTime: 30_000,
  });

  const { data: ordersData } = useQuery<{ items: SearchOrder[] }>({
    queryKey: ["global-search-orders", debouncedQuery],
    queryFn: () =>
      api.get("/work-orders", { params: { search: debouncedQuery, limit: 5 } }).then((r) => r.data),
    enabled,
    staleTime: 30_000,
  });

  const orders = ordersData?.items ?? [];
  const hasResults = (clients?.length ?? 0) + orders.length > 0;
  const showDropdown = open && debouncedQuery.length >= 2;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (href: string) => {
    router.push(href);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative px-2 py-2">
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && (setOpen(false), setQuery(""))}
          placeholder="Buscar... (⌘K)"
          className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {showDropdown && (
        <div className="absolute top-full left-2 right-2 mt-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
          {!hasResults ? (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
              Sin resultados para &quot;{debouncedQuery}&quot;
            </p>
          ) : (
            <>
              {(clients?.length ?? 0) > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/60">
                    Clientes
                  </p>
                  {clients!.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Users size={12} className="shrink-0 text-gray-400 dark:text-gray-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{c.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{c.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {orders.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/60">
                    Órdenes
                  </p>
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/work-orders/${o.id}`)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <ClipboardList size={12} className="shrink-0 text-gray-400 dark:text-gray-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{o.description}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{o.client.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
