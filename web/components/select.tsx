"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useAnchoredMenu } from "@/lib/use-anchored-menu";
import { cn } from "@/lib/utils";

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
}

export function Select<T extends string | number>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pos = useAnchoredMenu({ open, anchorRef: ref, menuRef: listRef, matchAnchorWidth: true });

  const selected = options.find((o) => o.value === value);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink outline-none transition-colors hover:border-faint focus:border-accent/60"
      >
        <span>{selected?.label}</span>
        <ChevronDown className={cn("h-4 w-4 text-faint transition-transform", open && "rotate-180")} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight || undefined,
              maxWidth: pos.maxWidth || undefined,
            }}
            className={cn(
              "fixed z-50 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-2xl",
              "animate-pop motion-reduce:animate-none",
              pos.placement === "bottom" ? "origin-top" : "origin-bottom",
              !pos.ready && "pointer-events-none opacity-0",
            )}
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    i === active ? "bg-surface-2 text-ink" : "text-muted",
                  )}
                >
                  {o.label}
                  {isSelected && <Check className="h-3.5 w-3.5 text-accent" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
