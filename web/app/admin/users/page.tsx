"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Loader2, Search, Users, X } from "lucide-react";
import { Select } from "@/components/select";
import { Pagination } from "@/components/pagination";
import { Avatar, Badge, Segmented, fmtBytes, fmtDate } from "@/components/admin/ui";
import { fmtInt } from "@/components/admin/charts";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import type { AdminUserFilter, AdminUserRow, AdminUserSort, Paginated } from "@/lib/types";

const PAGE_SIZE = 20;

const FILTERS: { label: string; value: AdminUserFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active 30d", value: "active" },
  { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" },
  { label: "Suspended", value: "suspended" },
];

const SORTS: { label: string; value: AdminUserSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Recently active", value: "active" },
  { label: "Most videos", value: "videos" },
  { label: "Name A–Z", value: "name" },
];

const pick = <T extends string>(v: string | null, allowed: { value: T }[], fallback: T): T =>
  allowed.some((a) => a.value === v) ? (v as T) : fallback;

function UsersInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // URL is the source of truth so filters survive reloads and back/forward.
  const q = params.get("q") ?? "";
  const status = pick(params.get("status"), FILTERS, "all");
  const sort = pick(params.get("sort"), SORTS, "newest");
  const offset = Math.max(0, Number(params.get("offset")) || 0);

  const [draft, setDraft] = useState(q);
  const [data, setData] = useState<Paginated<AdminUserRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const setParams = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || (k === "offset" && v === 0)) next.delete(k);
        else next.set(k, String(v));
      }
      if (!("offset" in patch)) next.delete("offset");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Follow external URL changes (back/forward) into the search box.
  useEffect(() => setDraft(q), [q]);

  // Debounce the search box into the URL.
  useEffect(() => {
    if (draft === q) return;
    const t = setTimeout(() => setParams({ q: draft || undefined }), 300);
    return () => clearTimeout(t);
  }, [draft, q, setParams]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    api.admin
      .users({ q, status, sort, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (id !== reqId.current) return;
        setData(res);
        setError(null);
      })
      .catch((e) => id === reqId.current && setError(e?.message ?? "Couldn't load users"))
      .finally(() => id === reqId.current && setLoading(false));
  }, [q, status, sort, offset]);

  const rows = data?.items ?? [];

  return (
    <main className="shell py-10 sm:py-12">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">Admin</p>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">Users</h1>
        </div>
        {data && (
          <p className="font-mono text-[11px] text-faint">
            {fmtInt(data.total)} {data.total === 1 ? "account" : "accounts"}
            {status !== "all" || q ? " match" : ""}
          </p>
        )}
      </div>

      {/* controls */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search users"
            className="field-input rounded-full py-2.5 pl-11 pr-10"
          />
          {draft && (
            <button
              onClick={() => setDraft("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-full overflow-x-auto">
            <Segmented ariaLabel="Filter users" value={status} onChange={(v) => setParams({ status: v === "all" ? undefined : v })} options={FILTERS} />
          </div>
          <div className="w-44">
            <Select ariaLabel="Sort users" value={sort} onChange={(v) => setParams({ sort: v === "newest" ? undefined : v })} options={SORTS} />
          </div>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">{error}</p>}

      {!data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Users className="mx-auto mb-3 h-6 w-6 text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">No users match these filters.</p>
        </div>
      ) : (
        <div className={cn("card overflow-hidden transition-opacity", loading && "opacity-60")}>
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-border md:table-header-group">
              <tr className="font-mono text-[10px] uppercase tracking-label text-faint">
                <th className="px-5 py-3 font-normal">User</th>
                <th className="px-3 py-3 font-normal">Joined</th>
                <th className="px-3 py-3 font-normal">Last active</th>
                <th className="px-3 py-3 text-right font-normal">Videos</th>
                <th className="px-3 py-3 text-right font-normal">Storage</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => (
                <tr
                  key={u.user_id}
                  onClick={() => router.push(`/admin/users/${u.user_id}`)}
                  className="group cursor-pointer transition-colors hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/users/${u.user_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-ink outline-none focus-visible:underline"
                          >
                            {u.name}
                          </Link>
                          {u.admin && <Badge tone="accent">Admin</Badge>}
                          {u.is_suspended && <Badge tone="danger">Suspended</Badge>}
                          {!u.is_verified && <Badge>Unverified</Badge>}
                        </div>
                        <p className="truncate font-mono text-[11px] text-faint">{u.email}</p>
                        {/* compact meta on small screens */}
                        <p className="mt-1 font-mono text-[11px] text-faint md:hidden">
                          {fmtInt(u.videos)} videos · {fmtBytes(u.bytes)} · active {u.last_active_at ? timeAgo(u.last_active_at) : "never"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 font-mono text-xs text-muted md:table-cell">{fmtDate(u.created_at)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 font-mono text-xs text-muted md:table-cell" title={u.last_active_at ? fmtDate(u.last_active_at, true) : undefined}>
                    {u.last_active_at ? timeAgo(u.last_active_at) : <span className="text-faint">never</span>}
                  </td>
                  <td className="hidden px-3 py-3.5 text-right tabular-nums md:table-cell">
                    <span className="text-ink">{fmtInt(u.videos)}</span>
                    {u.failed > 0 && <span className="ml-1.5 font-mono text-[11px] text-danger">{u.failed} failed</span>}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 text-right font-mono text-xs text-muted md:table-cell">{fmtBytes(u.bytes)}</td>
                  <td className="px-3 py-3.5 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={(o) => setParams({ offset: o })} noun="users" />}
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      }
    >
      <UsersInner />
    </Suspense>
  );
}
