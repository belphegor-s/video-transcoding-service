"use client";

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type Placement = "top" | "bottom";
export type Align = "start" | "end";

export interface AnchoredPosition {
  top: number;
  left: number;
  width?: number;
  maxHeight: number;
  maxWidth: number;
  placement: Placement;
  /** False until the first measurement lands, so the menu can stay invisible. */
  ready: boolean;
}

const GAP = 8; // trigger -> menu
const EDGE = 12; // menu -> viewport edge

const INITIAL: AnchoredPosition = { top: 0, left: 0, maxHeight: 0, maxWidth: 0, placement: "bottom", ready: false };

/**
 * Positions a fixed-position menu against a trigger, using whatever space the
 * viewport actually has: flips above the trigger when below is too tight, keeps
 * clear of both edges, and caps its height so the menu scrolls instead of
 * spilling offscreen. Recomputes on scroll/resize and when the menu resizes.
 */
export function useAnchoredMenu({
  open,
  anchorRef,
  menuRef,
  align = "end",
  matchAnchorWidth = false,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement>;
  menuRef: RefObject<HTMLElement>;
  align?: Align;
  /** Lock the menu to the trigger's width, the way a <select> behaves. */
  matchAnchorWidth?: boolean;
}): AnchoredPosition {
  const [pos, setPos] = useState<AnchoredPosition>(INITIAL);
  const frame = useRef<number>();

  const compute = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const a = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    // Measure the menu at its natural size, before any cap we applied earlier.
    const cappedHeight = menu.style.maxHeight;
    menu.style.maxHeight = "";
    const naturalHeight = menu.scrollHeight;
    const width = matchAnchorWidth ? a.width : menu.offsetWidth;
    menu.style.maxHeight = cappedHeight;

    const below = vh - a.bottom - GAP - EDGE;
    const above = a.top - GAP - EDGE;

    let placement: Placement;
    if (naturalHeight <= below) placement = "bottom";
    else if (naturalHeight <= above) placement = "top";
    else placement = below >= above ? "bottom" : "top"; // neither fits: take the roomier side

    const maxHeight = Math.max(placement === "bottom" ? below : above, 0);
    const height = Math.min(naturalHeight, maxHeight);
    const top = placement === "bottom" ? a.bottom + GAP : a.top - GAP - height;

    // Align to an edge of the trigger, then pull back inside the viewport.
    const maxWidth = vw - EDGE * 2;
    const preferred = matchAnchorWidth || align === "start" ? a.left : a.right - width;
    const left = Math.max(EDGE, Math.min(preferred, vw - EDGE - Math.min(width, maxWidth)));

    setPos({ top, left, width: matchAnchorWidth ? a.width : undefined, maxHeight, maxWidth, placement, ready: true });
  }, [align, anchorRef, menuRef, matchAnchorWidth]);

  const schedule = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(compute);
  }, [compute]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(INITIAL);
      return;
    }

    compute();

    // Follow the trigger rather than closing: scrolling shouldn't drop the menu.
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    // Content or font swaps can change the menu's size after the first pass.
    const observer = new ResizeObserver(schedule);
    if (menuRef.current) observer.observe(menuRef.current);
    if (anchorRef.current) observer.observe(anchorRef.current);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [open, compute, schedule, anchorRef, menuRef]);

  return pos;
}
