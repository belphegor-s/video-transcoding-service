"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { logout } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Library" },
  { href: "/dashboard/api-keys", label: "API keys" },
  { href: "/docs", label: "Docs" },
];

export function AppHeader({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-6 font-mono text-xs md:flex">
            {NAV.map((item) => {
              const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("transition-colors hover:text-ink", active ? "text-ink" : "text-muted")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
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
