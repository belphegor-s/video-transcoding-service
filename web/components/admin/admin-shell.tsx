"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

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

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={user} />
      <div className="border-b border-border">
        <div className="shell flex h-12 items-center justify-between gap-4">
          <nav className="flex items-center gap-1 font-mono text-xs">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors",
                  isActive(t.href) ? "bg-surface text-ink" : "text-muted hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            ))}
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
