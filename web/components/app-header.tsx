"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { logout } from "@/lib/use-auth";
import type { AuthUser } from "@/lib/types";

export function AppHeader({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden font-mono text-xs text-muted sm:inline" title={user.email}>
              {user.name ? user.name : user.email}
            </span>
          )}
          <button
            onClick={() => logout(router)}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 font-mono text-xs text-muted transition-colors hover:border-faint hover:text-ink"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
