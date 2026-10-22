"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ORDER: ThemePreference[] = ["system", "light", "dark"];

const META: Record<ThemePreference, { label: string; Icon: typeof Sun }> = {
  system: { label: "System", Icon: Monitor },
  light: { label: "Light", Icon: Sun },
  dark: { label: "Dark", Icon: Moon },
};

/**
 * One button that cycles System → Light → Dark. The new palette washes over
 * the page in a rippling wave from the button (View Transitions; instant
 * where unsupported or with reduced motion).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, mounted, setPreference } = useTheme();
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  const label = `Theme: ${META[preference].label}. Switch to ${META[next].label.toLowerCase()}`;

  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPreference(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      aria-label={label}
      title={label}
      data-ready={mounted || undefined}
      className={cn(
        "theme-toggle group relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-muted transition-colors hover:border-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        className,
      )}
    >
      {ORDER.map((p) => {
        const { Icon } = META[p];
        const active = mounted && p === preference;
        return (
          <Icon
            key={p}
            data-icon={p}
            aria-hidden
            strokeWidth={1.75}
            className={cn(
              "absolute h-4 w-4 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none",
              active ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
            )}
          />
        );
      })}
      {/* hover ripple hint */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 scale-0 rounded-full bg-ink/[0.06] transition-transform duration-300 ease-out group-hover:scale-100 motion-reduce:transition-none"
      />
    </button>
  );
}
