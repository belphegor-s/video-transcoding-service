"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Sticky contents list that highlights the section currently in view. */
export function LegalToc({ items }: { items: { id: string; label: string; n: number }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-24" aria-label="Contents">
      <p className="eyebrow mb-4">Contents</p>
      <ol className="space-y-0.5 border-l border-border">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={cn(
                "-ml-px flex gap-3 border-l py-1.5 pl-4 text-[13px] transition-colors",
                active === it.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              <span className="font-mono text-[10px] tabular-nums text-faint">{String(it.n).padStart(2, "0")}</span>
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
