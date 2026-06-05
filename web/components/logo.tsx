import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface">
        <span className="block h-2.5 w-2.5 rounded-[3px] bg-accent transition-transform duration-300 group-hover:scale-125" />
        <span className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/5" />
      </span>
      <span className="font-mono text-sm font-medium tracking-tight text-ink">
        transcoder<span className="text-accent">.</span>
      </span>
    </Link>
  );
}
