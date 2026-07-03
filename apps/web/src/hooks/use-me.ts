"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MeData = {
  isOwner: boolean;
  permissions: string[];
  workshop: { id: string; name: string; phone?: string; address?: string } | null;
};

export function useMe() {
  return useQuery<MeData>({
    queryKey: ["me"],
    queryFn: () => api.get("/me").then((r) => r.data),
    staleTime: 60_000,
  });
}

export function usePermission(permission: string) {
  const { data } = useMe();
  if (!data) return false;
  if (data.isOwner) return true;
  return data.permissions.includes(permission);
}
