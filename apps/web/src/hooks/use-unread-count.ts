"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermission } from "./use-me";

type Conversation = { phone: string; unread: number };

export function useUnreadCount() {
  const canView = usePermission("VIEW_WHATSAPP");

  const { data } = useQuery<Conversation[]>({
    queryKey: ["wa-conversations-badge"],
    queryFn: () => api.get("/whatsapp/conversations").then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    enabled: canView,
  });

  if (!data) return 0;
  return data.reduce((sum, c) => sum + (c.unread ?? 0), 0);
}
