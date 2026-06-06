"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokens } from "@/lib/api";
import { Logo } from "./logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "/docs", label: "API docs" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAuthed(!!tokens.access());
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transform-gpu isolate [will-change:transform] [backface-visibility:hidden] transition-all duration-300",
        scrolled || menuOpen ? "border-b border-border bg-bg/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="shell flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-8 font-mono text-xs text-muted md:flex">
          {LINKS.map((l) =>
            l.href.startsWith("#") ? (
              <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-ink">
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-4 py-2 font-mono text-xs text-muted transition-colors hover:text-ink sm:inline-flex">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
            </>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:text-ink md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {menuOpen && (
        <div className="border-t border-border md:hidden">
          <nav className="shell flex flex-col py-3">
            {LINKS.map((l) =>
              l.href.startsWith("#") ? (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 font-mono text-sm text-muted transition-colors hover:bg-surface hover:text-ink">
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 font-mono text-sm text-muted transition-colors hover:bg-surface hover:text-ink">
                  {l.label}
                </Link>
              ),
            )}
            {!authed && (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 font-mono text-sm text-muted transition-colors hover:bg-surface hover:text-ink">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
