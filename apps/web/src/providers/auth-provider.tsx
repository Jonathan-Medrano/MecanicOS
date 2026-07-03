"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { registerTokenGetter } from "@/lib/api";

export function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      registerTokenGetter(getToken);
    } else {
      registerTokenGetter(async () => null);
    }
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}
