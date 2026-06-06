"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        // transform-gpu + will-change isolate the blurred bar onto its own
        // compositor layer, preventing Chrome's backdrop-filter ghosting on scroll.
        "fixed inset-x-0 top-0 z-50 transform-gpu isolate [will-change:transform] [backface-visibility:hidden] transition-all duration-300",
        scrolled ? "border-b border-border bg-bg/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="shell flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 font-mono text-xs text-muted md:flex">
          <a href="#how" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-ink">
            Features
          </a>
          <a href="#pipeline" className="transition-colors hover:text-ink">
            Pipeline
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden px-4 py-2 font-mono text-xs text-muted transition-colors hover:text-ink sm:inline-flex">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
