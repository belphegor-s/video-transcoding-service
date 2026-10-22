"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { THEME_COLORS, THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from "./theme-script";

export type { ResolvedTheme, ThemePreference } from "./theme-script";

interface ThemeContextValue {
  /** What the user picked. */
  preference: ThemePreference;
  /** What is actually painted. */
  resolved: ResolvedTheme;
  /** False until the stored preference has been read on the client. */
  mounted: boolean;
  /** Switch themes. With an origin (viewport px) the change sweeps out from that point. */
  setPreference: (next: ThemePreference, origin?: { x: number; y: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const LIGHT_QUERY = "(prefers-color-scheme: light)";

const systemTheme = (): ResolvedTheme => (window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark");

const readPreference = (): ThemePreference => {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};

const writePreference = (p: ThemePreference) => {
  try {
    if (p === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, p);
  } catch {
    /* storage unavailable: the choice lasts for this page view only */
  }
};

const resolve = (p: ThemePreference): ResolvedTheme => (p === "system" ? systemTheme() : p);

function paint(theme: ResolvedTheme, preference: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePref = preference;
  root.style.colorScheme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLORS[theme]));
}

/**
 * Freeze CSS transitions while the palette flips, otherwise every
 * `transition-colors` element animates from the old colours (and a View
 * Transition would snapshot them mid-fade). Returns the release function.
 */
function freezeTransitions() {
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  return () => {
    void window.getComputedStyle(document.body).opacity; // flush with transitions still off
    requestAnimationFrame(() => style.remove());
  };
}

/* ------------------------------- wave reveal ------------------------------- */

const WAVE_DURATION = 1100;
const WAVE_STEPS = 48;
const WAVE_POINTS = 140;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Keyframes for a circle growing out of (x, y) whose rim ripples like a wave:
 * two counter-rotating harmonics, an amplitude that swells mid-way and calms
 * to a clean circle as it covers the screen.
 */
function waveKeyframes(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxR = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  const peakAmp = Math.min(56, Math.max(18, maxR * 0.045));
  const frames: string[] = [];

  for (let s = 0; s <= WAVE_STEPS; s++) {
    const t = s / WAVE_STEPS;
    const r = easeInOutCubic(t) * (maxR + peakAmp) + 2;
    // swell in the middle, settle to a circle at the end; damp near the origin so it opens cleanly
    const amp = peakAmp * Math.sin(Math.PI * t) * Math.min(1, r / (peakAmp * 4));
    const phase = t * Math.PI * 3;
    const pts: string[] = [];
    for (let i = 0; i < WAVE_POINTS; i++) {
      const a = (i / WAVE_POINTS) * Math.PI * 2;
      const ripple = 0.68 * Math.sin(7 * a + phase) + 0.32 * Math.sin(11 * a - phase * 1.6);
      const rr = Math.max(0, r + amp * ripple);
      pts.push(`${(x + rr * Math.cos(a)).toFixed(1)}px ${(y + rr * Math.sin(a)).toFixed(1)}px`);
    }
    frames.push(`polygon(${pts.join(",")})`);
  }
  return frames;
}

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type DocWithVT = Document & { startViewTransition?: (cb: () => void) => ViewTransitionLike };

function waveTransition(commit: () => void, origin: { x: number; y: number }) {
  const doc = document as DocWithVT;
  const root = document.documentElement;
  root.dataset.themeSwitching = "";
  const release = freezeTransitions();

  let vt: ViewTransitionLike;
  try {
    vt = doc.startViewTransition!(commit);
  } catch {
    commit();
    release();
    delete root.dataset.themeSwitching;
    return;
  }

  vt.ready
    .then(() => {
      root.animate(
        { clipPath: waveKeyframes(origin.x, origin.y) },
        { duration: WAVE_DURATION, easing: "linear", fill: "both", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  vt.finished
    .finally(() => {
      release();
      delete root.dataset.themeSwitching;
    })
    .catch(() => {});
}

/* --------------------------------- provider -------------------------------- */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  // Adopt what the boot script already painted.
  useEffect(() => {
    const p = readPreference();
    const r = resolve(p);
    setPref(p);
    setResolved(r);
    paint(r, p);
    setMounted(true);
  }, []);

  // Follow the OS while on "system".
  useEffect(() => {
    if (preference !== "system") return;
    const mql = window.matchMedia(LIGHT_QUERY);
    const onChange = () => {
      const r = systemTheme();
      const release = freezeTransitions();
      setResolved(r);
      paint(r, "system");
      release();
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  // Keep other tabs in step.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY && e.key !== null) return;
      const p = readPreference();
      const r = resolve(p);
      const release = freezeTransitions();
      setPref(p);
      setResolved(r);
      paint(r, p);
      release();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference, origin?: { x: number; y: number }) => {
    const nextResolved = resolve(next);
    writePreference(next);

    const commit = () => {
      flushSync(() => {
        setPref(next);
        setResolved(nextResolved);
      });
      paint(nextResolved, next);
    };

    const visible = nextResolved !== document.documentElement.dataset.theme;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canAnimate = visible && !!origin && !reduceMotion && typeof (document as DocWithVT).startViewTransition === "function";

    if (canAnimate) {
      waveTransition(commit, origin!);
    } else {
      const release = freezeTransitions();
      commit();
      release();
    }
  }, []);

  const value = useMemo(() => ({ preference, resolved, mounted, setPreference }), [preference, resolved, mounted, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
