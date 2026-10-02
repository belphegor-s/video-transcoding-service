"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Rect = { x: number; y: number; w: number; h: number };

/** Last indicator position per group, so a group that remounts on navigation still slides. */
const lastRects = new Map<string, Rect>();

const measureActive = (container: HTMLElement): Rect | null => {
  const el = container.querySelector<HTMLElement>('[data-active="true"]');
  if (!el) return null;
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
};

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

/**
 * Base classes for the indicator element. Add shape/colour (rounded-*, bg-*) per group.
 * Items that sit above it need `relative z-10`, and must not transition their
 * background (`transition-[color]`, not `transition-colors`) or the static
 * fallback fades out at the destination while the indicator slides in.
 */
export const INDICATOR_CLASS =
  "pointer-events-none absolute left-0 top-0 opacity-0 transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none";

/**
 * Slides a single background element under the active item of a tab/segmented
 * group. The container must be positioned (`relative`); the active item is the
 * child marked `data-active="true"`.
 *
 * Until the first measurement the container lacks `data-indicator="ready"`, so
 * items can keep a static active background for SSR / pre-hydration paint and
 * drop it with `group-data-[indicator=ready]/<name>:bg-transparent`.
 *
 * Pass `persistKey` for groups that remount between routes (e.g. a header that
 * each page renders itself) so the indicator animates from where it was.
 */
export function useSlidingIndicator<C extends HTMLElement = HTMLDivElement>(activeKey: unknown, persistKey?: string) {
  // Callback refs (via state) so effects re-run if the group mounts after the hook's owner does.
  const [container, containerRef] = useState<C | null>(null);
  const [indicator, indicatorRef] = useState<HTMLSpanElement | null>(null);
  const placedOn = useRef<HTMLElement | null>(null);
  const applied = useRef<Rect | null>(null);

  useIsoLayoutEffect(() => {
    if (!container || !indicator) return;

    const apply = (r: Rect | null) => {
      applied.current = r;
      if (!r) {
        indicator.style.opacity = "0";
        if (persistKey) lastRects.delete(persistKey);
        return;
      }
      indicator.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      indicator.style.width = `${r.w}px`;
      indicator.style.height = `${r.h}px`;
      indicator.style.opacity = "1";
      if (persistKey && r.w > 0) lastRects.set(persistKey, r);
    };

    // Jump without animating (first paint, resizes, font swaps).
    const snap = (r: Rect | null) => {
      indicator.style.transition = "none";
      apply(r);
      void indicator.offsetWidth; // flush so the jump isn't transitioned
      indicator.style.transition = "";
    };

    const next = measureActive(container);
    if (placedOn.current === container) {
      // Coming back from "nothing active": appear in place rather than slide from a stale spot.
      if (indicator.style.opacity === "0") snap(next);
      else apply(next);
    } else {
      const prev = persistKey ? lastRects.get(persistKey) : undefined;
      if (prev && next && next.w > 0) {
        snap(prev);
        apply(next);
      } else {
        snap(next);
      }
      placedOn.current = container;
      container.dataset.indicator = "ready";
    }
  }, [activeKey, persistKey, container, indicator]);

  // Keep aligned when item sizes change (web fonts, viewport, labels) without sliding.
  useEffect(() => {
    if (!container || !indicator || typeof ResizeObserver === "undefined") return;

    const resync = () => {
      const r = measureActive(container);
      // Unchanged covers the callback RO fires on observe: the layout effect already
      // placed it and may be mid-slide. A group hidden at mount (display: none) gets no
      // such callback, so its first real one, on becoming visible, must not be dropped.
      if (!r || sameRect(r, applied.current)) return;
      applied.current = r;
      indicator.style.transition = "none";
      indicator.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      indicator.style.width = `${r.w}px`;
      indicator.style.height = `${r.h}px`;
      void indicator.offsetWidth;
      indicator.style.transition = "";
      if (persistKey && r.w > 0) lastRects.set(persistKey, r);
    };

    const ro = new ResizeObserver(resync);
    ro.observe(container);
    // Items only: the indicator resizes on every slide and would cancel it.
    for (const child of Array.from(container.children)) if (child !== indicator) ro.observe(child);
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(resync).catch(() => {});
    return () => ro.disconnect();
  }, [container, indicator, persistKey]);

  return { containerRef, indicatorRef };
}
