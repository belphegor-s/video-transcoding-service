"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return "—";
  return new Date(d).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Signed change vs the previous period of the same length. */
export function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) return <span className="font-mono text-[11px] text-faint">no change {label}</span>;
  if (previous === 0) return <span className="font-mono text-[11px] text-faint">new {label}</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
      <span className={cn("inline-flex items-center gap-0.5", up ? "text-ok" : "text-danger")}>
        <Icon className="h-3 w-3" aria-hidden />
        {up ? "+" : "−"}
        {Math.abs(pct) >= 100 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%
      </span>
      <span className="text-faint">{label}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  footer,
  className,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  return (
    <div className={cn("card flex flex-col justify-between gap-4 p-5 transition-opacity", loading && "opacity-60", className)}>
      <p className="eyebrow">{label}</p>
      <div>
        <p className="text-[2rem] font-semibold leading-none tracking-tight text-ink">{value}</p>
        {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
      </div>
      {footer && <div className="border-t border-border pt-3">{footer}</div>}
    </div>
  );
}

/**
 * Card chrome for a chart: title, optional legend/actions, and a chart ⇄ table
 * toggle so every plotted value is reachable without hovering.
 */
export function Panel({
  title,
  subtitle,
  actions,
  legend,
  table,
  children,
  className,
  loading,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  legend?: React.ReactNode;
  table?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={cn("card flex min-w-0 flex-col p-5 transition-opacity", loading && "opacity-60", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {table && (
            <button
              onClick={() => setAsTable((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-faint hover:text-ink"
              aria-label={asTable ? "Show chart" : "Show as table"}
              title={asTable ? "Show chart" : "Show as table"}
            >
              {asTable ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </header>
      {legend && !asTable && <div className="mb-3">{legend}</div>}
      <div className="min-w-0 flex-1">{asTable && table ? <div className="max-h-[260px] overflow-auto">{table}</div> : children}</div>
    </section>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 bg-surface">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={cn("border-b border-border py-2 font-mono text-[10px] font-normal uppercase tracking-label text-faint", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border/60 last:border-0">
            {r.map((c, j) => (
              <td key={j} className={cn("py-1.5", j === 0 ? "text-muted" : "text-right tabular-nums text-ink")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "ok" | "danger"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-label",
        tone === "neutral" && "border-border text-muted",
        tone === "accent" && "border-accent/40 text-accent",
        tone === "ok" && "border-ok/30 text-ok",
        tone === "danger" && "border-danger/40 text-danger",
      )}
    >
      {children}
    </span>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-full border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors",
            o.value === value ? "bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--border)]" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-[11px] text-muted",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
