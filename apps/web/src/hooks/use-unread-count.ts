"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Conversation = { phone: string; unread: number };

export function useUnreadCount() {
  const { data } = useQuery<Conversation[]>({
    queryKey: ["wa-conversations-badge"],
    queryFn: () => api.get("/whatsapp/conversations").then((r) => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (!data) return 0;
  return data.reduce((sum, c) => sum + (c.unread ?? 0), 0);
}
