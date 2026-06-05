"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokens } from "./api";
import type { AuthUser } from "./types";

/**
 * Client-side route guard. Verifies the session against /user/me.
 * Redirects to /login when there is no valid session.
 */
export function useAuth(redirect = true) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!tokens.access()) {
      if (redirect) router.replace("/login");
      setLoading(false);
      return;
    }

    api
      .me()
      .then((u) => {
        if (active) setUser(u);
      })
      .catch(() => {
        if (!active) return;
        tokens.clear();
        if (redirect) router.replace("/login");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [router, redirect]);

  return { user, loading };
}

export function logout(router: { replace: (p: string) => void }) {
  tokens.clear();
  router.replace("/login");
}
