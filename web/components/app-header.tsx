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

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-6 font-mono text-xs md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("transition-colors hover:text-ink", isActive(item.href) ? "text-ink" : "text-muted")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden max-w-[160px] truncate font-mono text-xs text-muted sm:inline" title={user.email}>
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

      {/* mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 font-mono text-xs md:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 transition-colors",
              isActive(item.href) ? "bg-surface text-ink" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
