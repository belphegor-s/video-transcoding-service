"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "./logo";
import { logout } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { INDICATOR_CLASS, useSlidingIndicator } from "@/lib/use-sliding-indicator";
import type { AuthUser } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Library" },
  { href: "/dashboard/api-keys", label: "API keys" },
  { href: "/docs", label: "Docs" },
];

export function AppHeader({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const pathname = usePathname();

  const nav = user?.admin ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
  const activeHref = nav.find((item) => isActive(item.href))?.href;
  // Each page renders its own header, so persist the position to slide across route changes.
  const { containerRef: mobileNavRef, indicatorRef: mobileIndicatorRef } = useSlidingIndicator<HTMLElement>(activeHref, "app-nav-mobile");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-6 font-mono text-xs md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
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
      <nav
        ref={mobileNavRef}
        className="group/mnav relative flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 font-mono text-xs md:hidden"
      >
        <span aria-hidden ref={mobileIndicatorRef} className={cn(INDICATOR_CLASS, "rounded-full bg-surface")} />
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 shrink-0 rounded-full px-3 py-1.5 transition-colors duration-200",
                active ? "bg-surface text-ink group-data-[indicator=ready]/mnav:bg-transparent" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
