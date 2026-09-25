"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { INDICATOR_CLASS, useSlidingIndicator } from "@/lib/use-sliding-indicator";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
];

/**
 * Client guard for the admin console. The API is the real gate (every /admin
 * route 403s for non-admins); this only keeps non-admins from seeing the chrome.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const activeTab = TABS.find((t) => isActive(t.href))?.href;
  const { containerRef: tabsRef, indicatorRef: tabsIndicatorRef } = useSlidingIndicator<HTMLElement>(activeTab, "admin-tabs");

  useEffect(() => {
    if (!loading && user && !user.admin) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || !user.admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={user} />
      <div className="border-b border-border">
        <div className="shell flex h-12 items-center justify-between gap-4">
          <nav ref={tabsRef} className="group/tabs relative flex items-center gap-1 font-mono text-xs">
            <span aria-hidden ref={tabsIndicatorRef} className={cn(INDICATOR_CLASS, "rounded-full bg-surface")} />
            {TABS.map((t) => {
              const active = isActive(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 rounded-full px-3 py-1.5 transition-colors duration-200",
                    active ? "bg-surface text-ink group-data-[indicator=ready]/tabs:bg-transparent" : "text-muted hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-faint">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            Admin console
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
