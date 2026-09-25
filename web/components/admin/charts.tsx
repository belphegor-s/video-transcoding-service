"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
 * Lightweight SVG charts for the admin console. Deliberately dependency-free and
 * tuned to the site's dark surface: thin marks, hairline grid, one tooltip that
 * lists every series at the hovered position, and keyboard stepping (←/→).
 *
 * Status hues were validated for CVD separation on the #131316 surface.
 */
export const SERIES_COLORS = {
  ready: "#4fa84a",
  processing: "#3f87e0",
  failed: "#e0564a",
  neutral: "#5a5a61",
  line: "#cdfb46",
} as const;

export interface SeriesDef<K extends string> {
  key: K;
  label: string;
  color: string;
}

/* --------------------------------- helpers -------------------------------- */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round a max up to a clean axis ceiling and return evenly spaced ticks. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const s = Math.max(1, step); // counts are integers
  const top = Math.ceil(max / s) * s;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += s) ticks.push(v);
  return ticks;
}

export const fmtInt = (n: number) => n.toLocaleString("en-US");

export function fmtCompact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fmtBucket(date: string, bucket: "day" | "week", long = false) {
  const d = new Date(`${date}T00:00:00Z`);
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!long) return md;
  return bucket === "week" ? `Week of ${md}, ${d.getUTCFullYear()}` : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** A rect whose top corners are rounded (data end) and bottom is square (baseline). */
function topRoundedRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

const PAD = { top: 14, right: 12, bottom: 26, left: 40 };

function Tooltip({
  x,
  containerWidth,
  title,
  rows,
}: {
  x: number;
  containerWidth: number;
  title: string;
  rows: { label: string; value: string; color?: string; strong?: boolean }[];
}) {
  const W = 184;
  const left = x + W + 16 > containerWidth ? x - W - 12 : x + 12;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute top-2 z-10 rounded-xl border border-border bg-bg/95 px-3 py-2.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur"
      style={{ left: Math.max(0, left), width: W }}
    >
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-label text-faint">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-muted">
              {r.color && <span className="h-[2px] w-3 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className={cn("tabular-nums", r.strong ? "font-semibold text-ink" : "text-ink")}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useActiveIndex(n: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };
  return { active, setActive, onKeyDown };
}

function XAxis({ labels, slot, height }: { labels: string[]; slot: number; height: number }) {
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((slot * labels.length) / 72))));
  return (
    <g>
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={i} x={PAD.left + slot * i + slot / 2} y={height - 8} textAnchor="middle" className="fill-faint font-mono text-[10px]">
            {l}
          </text>
        ) : null,
      )}
    </g>
  );
}

function YGrid({ ticks, y, width }: { ticks: number[]; y: (v: number) => number; width: number }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges" />
          <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-faint font-mono text-[10px] tabular-nums">
            {fmtCompact(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/* ------------------------------ stacked columns ---------------------------- */

export function StackedColumns<K extends string>({
  data,
  series,
  labels,
  titles,
  height = 240,
  ariaLabel,
  extraRows,
}: {
  data: Record<K, number>[];
  series: SeriesDef<K>[];
  labels: string[];
  titles: string[];
  height?: number;
  ariaLabel: string;
  /** Additional tooltip rows (values not drawn as marks). */
  extraRows?: (i: number) => { label: string; value: string }[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { active, setActive, onKeyDown } = useActiveIndex(data.length);

  const totals = useMemo(() => data.map((d) => series.reduce((s, def) => s + (d[def.key] || 0), 0)), [data, series]);
  const ticks = niceTicks(Math.max(...totals, 0));
  const top = ticks[ticks.length - 1];

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(1, Math.min(24, slot * 0.64, slot - 2));
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left - PAD.left) / slot);
    setActive(i >= 0 && i < data.length ? i : null);
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          className="block rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
        >
          <YGrid ticks={ticks} y={y} width={width} />
          {active !== null && (
            <rect x={PAD.left + slot * active} y={PAD.top} width={slot} height={plotH} fill="rgb(var(--ink-rgb) / 0.04)" />
          )}
          {data.map((d, i) => {
            const x = PAD.left + slot * i + (slot - barW) / 2;
            let acc = 0;
            const visible = series.filter((s) => (d[s.key] || 0) > 0);
            return (
              <g key={i} opacity={active === null || active === i ? 1 : 0.45} style={{ transition: "opacity 120ms" }}>
                {visible.map((s, j) => {
                  const v = d[s.key];
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  // 2px surface gap between stacked segments.
                  const gap = j > 0 ? 2 : 0;
                  const h = Math.max(0, y0 - y1 - gap);
                  if (h <= 0) return null;
                  const isTop = j === visible.length - 1;
                  return isTop ? (
                    <path key={s.key} d={topRoundedRect(x, y1, barW, h, 4)} fill={s.color} />
                  ) : (
                    <rect key={s.key} x={x} y={y1} width={barW} height={h} fill={s.color} />
                  );
                })}
              </g>
            );
          })}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--faint)" strokeOpacity={0.5} shapeRendering="crispEdges" />
          <XAxis labels={labels} slot={slot} height={height} />
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip
          x={PAD.left + slot * active + slot / 2}
          containerWidth={width}
          title={titles[active]}
          rows={[
            ...series
              .slice()
              .reverse()
              .map((s) => ({ label: s.label, value: fmtInt(data[active][s.key] || 0), color: s.color })),
            { label: "Total", value: fmtInt(totals[active]), strong: true },
            ...(extraRows?.(active) ?? []),
          ]}
        />
      )}
    </div>
  );
}

/* ---------------------------------- area ---------------------------------- */

export function AreaTrend({
  values,
  labels,
  titles,
  label,
  color = SERIES_COLORS.line,
  height = 240,
  ariaLabel,
}: {
  values: number[];
  labels: string[];
  titles: string[];
  label: string;
  color?: string;
  height?: number;
  ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { active, setActive, onKeyDown } = useActiveIndex(values.length);

  const ticks = niceTicks(Math.max(...values, 0));
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = values.length ? plotW / values.length : 0;
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = values.length ? `${line}L${x(values.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const last = values.length - 1;
  const gradId = `area${useId().replace(/:/g, "")}`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left - PAD.left - slot / 2) / slot);
    setActive(Math.min(values.length - 1, Math.max(0, i)));
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          className="block rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.16} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YGrid ticks={ticks} y={y} width={width} />
          <path d={area} fill={`url(#${gradId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--faint)" strokeOpacity={0.5} shapeRendering="crispEdges" />
          {active !== null && (
            <g>
              <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} stroke="var(--muted)" strokeOpacity={0.5} shapeRendering="crispEdges" />
              <circle cx={x(active)} cy={y(values[active])} r={4.5} fill={color} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
          {active === null && last >= 0 && (
            <g>
              <circle cx={x(last)} cy={y(values[last])} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
          <XAxis labels={labels} slot={slot} height={height} />
        </svg>
      )}
      {active !== null && width > 0 && (
        <Tooltip
          x={x(active)}
          containerWidth={width}
          title={titles[active]}
          rows={[{ label, value: fmtInt(values[active]), color, strong: true }]}
        />
      )}
    </div>
  );
}

/* ------------------------------ status meter ------------------------------- */

/** One 100%-stacked bar with a legend: share of a whole by category. */
export function ShareMeter({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Share by status">
        {total > 0 &&
          parts.map((p, i) =>
            p.value > 0 ? (
              <div
                key={p.label}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(p.value / total) * 100}%`, background: p.color, opacity: hover === null || hover === i ? 1 : 0.4 }}
              />
            ) : null,
          )}
      </div>
      <ul className="mt-4 space-y-2.5">
        {parts.map((p, i) => (
          <li
            key={p.label}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            className={cn("flex items-center justify-between gap-3 text-xs transition-opacity", hover !== null && hover !== i && "opacity-50")}
          >
            <span className="flex min-w-0 items-center gap-2 text-muted">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: p.color }} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="tabular-nums text-ink">
              {fmtInt(p.value)}
              <span className="ml-1.5 text-faint">{total ? Math.round((p.value / total) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------- ranked bars ------------------------------- */

/** Horizontal bars for a ranked breakdown (single series, so one hue). */
export function RankedBars({
  rows,
  empty = "No data yet",
}: {
  rows: { label: string; value: number; display?: string; hint?: string }[];
  empty?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (!rows.length) return <p className="py-6 text-center text-sm text-faint">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.label} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-mono text-muted" title={r.label}>
              {r.label}
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {r.display ?? fmtInt(r.value)}
              {r.hint && <span className="ml-1.5 text-faint">{r.hint}</span>}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-ink/45 transition-colors group-hover:bg-ink/70"
              style={{ width: `${max ? Math.max(2, (r.value / max) * 100) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------- legend ---------------------------------- */

export function Legend({ items }: { items: { label: string; color: string; shape?: "rect" | "line" }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 font-mono text-[11px] text-muted">
          {it.shape === "line" ? (
            <span className="h-[2px] w-3.5 rounded-full" style={{ background: it.color }} />
          ) : (
            <span className="h-2 w-2 rounded-[2px]" style={{ background: it.color }} />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}
