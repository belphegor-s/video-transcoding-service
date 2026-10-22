import { cn } from "@/lib/utils";

/*
 * Skeleton placeholders that mirror the real layouts, so content lands in
 * place instead of popping in under a spinner. Server-safe (no hooks): usable
 * from route `loading.tsx` files and client pages alike.
 */

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("skeleton", className)} style={style} />;
}

/** Announces a loading region once to assistive tech; children stay hidden from it. */
export function LoadingRegion({ label = "Loading", className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Eyebrow + serif page title. */
export function PageTitleSkeleton({ className, titleWidth = "w-40 sm:w-52" }: { className?: string; titleWidth?: string }) {
  return (
    <div className={className}>
      <Skeleton className="mb-4 h-2.5 w-24" />
      <Skeleton className={cn("h-9 rounded-lg sm:h-11", titleWidth)} />
    </div>
  );
}

function TextLines({ widths, className }: { widths: string[]; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {widths.map((w, i) => (
        <Skeleton key={i} className={cn(i === 0 ? "h-3" : "h-2.5", w)} />
      ))}
    </div>
  );
}

/* --------------------------------- library --------------------------------- */

export function VideoCardSkeleton({ view = "grid" }: { view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
        <Skeleton className="aspect-video w-24 shrink-0 rounded-lg sm:w-32" />
        <TextLines widths={["w-1/2", "w-1/4"]} className="min-w-0 flex-1" />
        <Skeleton className="hidden h-3 w-14 sm:block" />
        <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <Skeleton className="aspect-video rounded-xl" />
      <div className="flex items-start justify-between gap-3">
        <TextLines widths={["w-36 max-w-full", "w-16"]} className="min-w-0 flex-1" />
        <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-2.5 w-24" />
    </div>
  );
}

export function VideoGridSkeleton({ view = "grid", count = 6 }: { view?: "grid" | "list"; count?: number }) {
  return (
    <div className={cn(view === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-2")}>
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} view={view} />
      ))}
    </div>
  );
}

/** Body of /dashboard while the session resolves. */
export function LibrarySkeleton() {
  return (
    <LoadingRegion label="Loading your library" className="shell py-10 sm:py-14">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <PageTitleSkeleton titleWidth="w-36 sm:w-44" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full max-w-md items-center gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-36 shrink-0 rounded-xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
      <VideoGridSkeleton />
    </LoadingRegion>
  );
}

/* ---------------------------------- watch ---------------------------------- */

export function TranscriptLinesSkeleton({ rows = 7 }: { rows?: number }) {
  const widths = ["w-11/12", "w-4/5", "w-full", "w-3/5", "w-10/12", "w-2/3", "w-9/12", "w-1/2"];
  return (
    <div aria-hidden className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="mt-0.5 h-2.5 w-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className={cn("h-3", widths[i % widths.length])} />
            {i % 3 === 0 && <Skeleton className="h-3 w-2/5" />}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Body of /watch/[id]: player stage, title + meta, and the share/transcript rail. */
export function WatchSkeleton() {
  return (
    <LoadingRegion label="Loading video" className="shell py-8 sm:py-12">
      <Skeleton className="mb-6 h-3 w-28" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface">
            <Skeleton className="absolute inset-0 rounded-none" />
            <div className="relative h-14 w-14 rounded-full bg-surface-2/80 ring-1 ring-border" />
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-7 w-3/4 max-w-sm rounded-lg" />
              <div className="mt-3 flex flex-wrap gap-4">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="mt-4 h-7 w-32 rounded-full" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <div className="card flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
              <TextLines widths={["w-16", "w-4/5"]} className="flex-1" />
            </div>
            <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
          </div>
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <div className="px-5 py-4">
              <TranscriptLinesSkeleton rows={6} />
            </div>
          </div>
        </aside>
      </div>
    </LoadingRegion>
  );
}

/* --------------------------------- API keys -------------------------------- */

export function ApiKeyRowSkeleton() {
  return (
    <li className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-12" />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </li>
  );
}

export function ApiKeyListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading API keys">
      <ul className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <ApiKeyRowSkeleton key={i} />
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Body of /dashboard/api-keys while the session resolves. */
export function ApiKeysPageSkeleton() {
  return (
    <div className="shell max-w-3xl py-10 sm:py-14">
      <Skeleton className="mb-6 h-3 w-28" />
      <div className="mb-8 flex items-end justify-between gap-4">
        <PageTitleSkeleton titleWidth="w-40 sm:w-48" />
        <Skeleton className="h-10 w-32 shrink-0 rounded-full" />
      </div>
      <div className="card mb-8 p-5">
        <Skeleton className="mb-5 h-5 w-32 rounded-md" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Skeleton className="mb-2 h-2.5 w-12" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <div className="sm:w-44">
            <Skeleton className="mb-2 h-2.5 w-14" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-full sm:w-28" />
        </div>
      </div>
      <ApiKeyListSkeleton />
    </div>
  );
}

/* ---------------------------------- admin ---------------------------------- */

export function StatTileSkeleton() {
  return (
    <div className="card flex flex-col justify-between gap-4 p-5">
      <Skeleton className="h-2.5 w-24" />
      <div>
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="mt-3 h-2.5 w-40 max-w-full" />
      </div>
      <div className="border-t border-border pt-3">
        <Skeleton className="h-2.5 w-28" />
      </div>
    </div>
  );
}

const BAR_HEIGHTS = [42, 64, 38, 72, 55, 80, 47, 68, 35, 76, 58, 88, 50, 70];

export function PanelSkeleton({ variant = "bars", className }: { variant?: "bars" | "area" | "list" | "meter"; className?: string }) {
  return (
    <div className={cn("card flex min-w-0 flex-col p-5", className)}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="mt-2 h-2.5 w-44 max-w-full" />
        </div>
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      </div>
      {variant === "bars" && (
        <div className="flex h-[200px] items-end gap-1.5 pl-8">
          {BAR_HEIGHTS.map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-b-none rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      )}
      {variant === "area" && <Skeleton className="h-[200px] rounded-lg [clip-path:polygon(0_70%,12%_58%,26%_64%,40%_40%,55%_48%,70%_26%,85%_34%,100%_14%,100%_100%,0_100%)]" />}
      {variant === "meter" && (
        <div className="space-y-5">
          <Skeleton className="h-3 rounded-full" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <div className="space-y-3 border-t border-border pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-2.5 w-8" />
              </div>
            ))}
          </div>
        </div>
      )}
      {variant === "list" && (
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <TextLines widths={["w-2/5", "w-3/5"]} className="flex-1" />
              <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Body of /admin. */
export function AdminOverviewSkeleton() {
  return (
    <LoadingRegion label="Loading analytics" className="shell space-y-6 py-10 sm:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageTitleSkeleton titleWidth="w-44 sm:w-56" />
          <Skeleton className="mt-3 h-2.5 w-56 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <PanelSkeleton variant="bars" />
        <PanelSkeleton variant="area" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <PanelSkeleton variant="meter" />
        <PanelSkeleton variant="meter" />
        <PanelSkeleton variant="meter" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <PanelSkeleton variant="list" />
        <PanelSkeleton variant="list" />
      </div>
    </LoadingRegion>
  );
}

/** Rows of the /admin/users table; matches its desktop columns and its compact mobile row. */
export function UserRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <LoadingRegion label="Loading users" className="card overflow-hidden">
      <div className="hidden gap-3 border-b border-border px-5 py-3.5 md:flex">
        <Skeleton className="h-2 w-10" />
      </div>
      <ul className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={cn("h-3", i % 2 ? "w-28" : "w-36")} />
              <Skeleton className={cn("h-2.5", i % 3 ? "w-44" : "w-52", "max-w-full")} />
              <Skeleton className="h-2.5 w-40 max-w-full md:hidden" />
            </div>
            <Skeleton className="hidden h-2.5 w-20 md:block" />
            <Skeleton className="hidden h-2.5 w-16 md:block" />
            <Skeleton className="hidden h-3 w-8 md:block" />
            <Skeleton className="hidden h-2.5 w-14 md:block" />
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Body of /admin/users. */
export function AdminUsersSkeleton() {
  return (
    <div className="shell py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageTitleSkeleton titleWidth="w-32 sm:w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Skeleton className="h-11 flex-1 rounded-full" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-full max-w-[22rem] rounded-full sm:w-[22rem]" />
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </div>
      <UserRowsSkeleton />
    </div>
  );
}

/** Body of /admin/users/[id]. */
export function AdminUserSkeleton() {
  return (
    <LoadingRegion label="Loading user" className="shell space-y-6 py-10 sm:py-12">
      <Skeleton className="h-3 w-20" />
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 space-y-2.5">
            <Skeleton className="h-8 w-52 max-w-full rounded-lg" />
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-2.5 w-60 max-w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <PanelSkeleton variant="meter" />
          <PanelSkeleton variant="list" />
        </div>
        <PanelSkeleton variant="list" />
      </div>
    </LoadingRegion>
  );
}

/** Admin console tab bar placeholder (the shell's own chrome while the session resolves). */
export function AdminTabsSkeleton() {
  return (
    <div className="border-b border-border">
      <div className="shell flex h-12 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  );
}

/* ----------------------------------- auth ---------------------------------- */

/** Stand-in for an auth form while an existing session is checked. */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <LoadingRegion label="Checking your session" className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-2.5 w-16" />
          <Skeleton className="h-[46px] rounded-xl" />
        </div>
      ))}
      <div className="flex justify-end">
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-12 rounded-full" />
    </LoadingRegion>
  );
}
