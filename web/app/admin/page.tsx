"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, HardDrive, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { AreaTrend, Legend, RankedBars, SERIES_COLORS, ShareMeter, StackedColumns, fmtBucket, fmtInt } from "@/components/admin/charts";
import { Avatar, DataTable, Delta, Panel, Segmented, StatTile, fmtBytes, fmtDate } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import type { AdminOverview, AdminRange } from "@/lib/types";

const RANGE_OPTIONS: { label: string; value: AdminRange }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "12m", value: 365 },
];

const UPLOAD_SERIES = [
  { key: "ready" as const, label: "Ready", color: SERIES_COLORS.ready },
  { key: "processing" as const, label: "Processing", color: SERIES_COLORS.processing },
  { key: "failed" as const, label: "Failed", color: SERIES_COLORS.failed },
];

const RANGE_STORAGE_KEY = "vt_admin_range";

function readRange(): AdminRange {
  try {
    const v = Number(localStorage.getItem(RANGE_STORAGE_KEY));
    return ([7, 30, 90, 365] as number[]).includes(v) ? (v as AdminRange) : 30;
  } catch {
    return 30;
  }
}

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(n === 1 ? 0 : 1)}%`);

export default function AdminOverviewPage() {
  const [days, setDays] = useState<AdminRange>(30);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingStorage, setRefreshingStorage] = useState(false);

  useEffect(() => setDays(readRange()), []);

  const load = useCallback(async (range: AdminRange) => {
    setLoading(true);
    try {
      setData(await api.admin.overview(range));
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  // A cold bucket scan outlasts the overview request; pick it up when it lands.
  const storageMissing = !!data && !data.storage;
  useEffect(() => {
    if (!storageMissing) return;
    let active = true;
    api.admin
      .storage()
      .then((storage) => active && setData((d) => (d ? { ...d, storage } : d)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storageMissing]);

  const changeRange = (r: AdminRange) => {
    setDays(r);
    try {
      localStorage.setItem(RANGE_STORAGE_KEY, String(r));
    } catch {
      /* storage unavailable: range just won't persist */
    }
  };

  const refreshStorage = async () => {
    setRefreshingStorage(true);
    try {
      const storage = await api.admin.storage(true);
      setData((d) => (d ? { ...d, storage } : d));
      toast.success(`Storage recalculated in ${(storage.duration_ms / 1000).toFixed(1)}s`);
    } catch (e: any) {
      toast.error(e?.message ?? "Storage scan failed");
    } finally {
      setRefreshingStorage(false);
    }
  };

  if (!data) {
    return (
      <main className="shell flex justify-center py-24">
        {error ? (
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-danger" />
            <p className="text-sm text-muted">{error}</p>
            <button onClick={() => load(days)} className="btn-ghost mt-5">
              Try again
            </button>
          </div>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        )}
      </main>
    );
  }

  const { users, videos, series, range, storage } = data;
  const bucketLabels = series.map((p) => fmtBucket(p.date, range.bucket));
  const bucketTitles = series.map((p) => fmtBucket(p.date, range.bucket, true));
  const rangeLabel = `vs prior ${range.days === 365 ? "12m" : `${range.days}d`}`;
  const inFlight = videos.by_status.uploaded + videos.by_status.transcoding;

  return (
    <main className="shell space-y-6 py-10 sm:py-12">
      {/* title + scope controls: one row, scoping everything below */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">Admin</p>
          <h1 className="font-serif text-4xl text-ink sm:text-5xl">Overview</h1>
          <p className="mt-2 font-mono text-[11px] text-faint">
            {fmtDate(range.from)} – {fmtDate(range.to)} · UTC · {range.bucket === "week" ? "weekly" : "daily"} buckets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Segmented ariaLabel="Date range" value={days} onChange={changeRange} options={RANGE_OPTIONS} />
          <button
            onClick={() => load(days)}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-faint hover:text-ink disabled:opacity-50"
            aria-label="Reload analytics"
            title="Reload"
          >
            <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}. Showing the last loaded data.
        </p>
      )}

      {/* headline stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          loading={loading}
          label="Users"
          value={fmtInt(users.total)}
          sub={
            <>
              <span className="text-ink">+{fmtInt(users.new_in_range)}</span> new in range · {fmtInt(users.verified)} verified
            </>
          }
          footer={<Delta current={users.new_in_range} previous={users.new_prev} label={rangeLabel} />}
        />
        <StatTile
          loading={loading}
          label="Active users · 7d"
          value={fmtInt(users.active_7d)}
          sub={
            <>
              {fmtInt(users.active_1d)} today · {fmtInt(users.active_30d)} in 30d
            </>
          }
          footer={
            <span className="font-mono text-[11px] text-faint">
              {users.total ? Math.round((users.active_30d / users.total) * 100) : 0}% of accounts active monthly
            </span>
          }
        />
        <StatTile
          loading={loading}
          label="Videos uploaded"
          value={fmtInt(videos.total)}
          sub={
            <>
              <span className="text-ink">+{fmtInt(videos.in_range)}</span> in range · {fmtInt(videos.uploaders)} uploaders
            </>
          }
          footer={<Delta current={videos.in_range} previous={videos.prev} label={rangeLabel} />}
        />
        <StatTile
          loading={loading}
          label="Transcode success"
          value={pct(videos.success_rate)}
          sub={
            <>
              {fmtInt(videos.by_status.transcoded)} ready · {fmtInt(videos.by_status.error)} failed
            </>
          }
          footer={
            <span className="font-mono text-[11px] text-faint">
              {inFlight > 0 ? `${fmtInt(inFlight)} in the pipeline now` : "Pipeline idle"}
            </span>
          }
        />
      </div>

      {/* time series */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Panel
          loading={loading}
          title="Uploads"
          subtitle={`${fmtInt(videos.in_range)} files landed · by outcome, per ${range.bucket}`}
          legend={<Legend items={UPLOAD_SERIES.map((s) => ({ label: s.label, color: s.color }))} />}
          table={
            <DataTable
              head={[range.bucket === "week" ? "Week" : "Day", "Ready", "Processing", "Failed", "Abandoned"]}
              rows={series.map((p, i) => [bucketTitles[i], p.ready, p.processing, p.failed, p.abandoned])}
            />
          }
        >
          <StackedColumns
            ariaLabel={`Uploads per ${range.bucket} by outcome`}
            data={series}
            series={UPLOAD_SERIES}
            labels={bucketLabels}
            titles={bucketTitles}
            extraRows={(i) => [{ label: "Abandoned URLs", value: fmtInt(series[i].abandoned) }]}
          />
        </Panel>
        <Panel
          loading={loading}
          title="Sign-ups"
          subtitle={`${fmtInt(users.new_in_range)} new accounts, per ${range.bucket}`}
          table={<DataTable head={[range.bucket === "week" ? "Week" : "Day", "Sign-ups"]} rows={series.map((p, i) => [bucketTitles[i], p.signups])} />}
        >
          <AreaTrend
            ariaLabel={`Sign-ups per ${range.bucket}`}
            values={series.map((p) => p.signups)}
            labels={bucketLabels}
            titles={bucketTitles}
            label="Sign-ups"
          />
        </Panel>
      </div>

      {/* breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel loading={loading} title="Pipeline" subtitle="All-time status of every upload">
          <ShareMeter
            parts={[
              { label: "Ready", value: videos.by_status.transcoded, color: SERIES_COLORS.ready },
              { label: "Processing", value: inFlight, color: SERIES_COLORS.processing },
              { label: "Failed", value: videos.by_status.error, color: SERIES_COLORS.failed },
            ]}
          />
          <dl className="mt-6 space-y-2.5 border-t border-border pt-4 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted">Public &amp; embeddable</dt>
              <dd className="tabular-nums text-ink">{fmtInt(videos.public)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Presigned, never uploaded</dt>
              <dd className="tabular-nums text-ink">{fmtInt(videos.by_status.signed_url_generated)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Active API keys</dt>
              <dd className="tabular-nums text-ink">
                {fmtInt(data.api_keys.active)} <span className="text-faint">· {fmtInt(data.api_keys.used_30d)} used in 30d</span>
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel loading={loading} title="Account funnel" subtitle="Where users drop off, all-time">
          <RankedBars
            rows={[
              { label: "Signed up", value: users.total },
              { label: "Verified email", value: users.verified, hint: users.total ? `${Math.round((users.verified / users.total) * 100)}%` : undefined },
              { label: "Uploaded a video", value: videos.uploaders, hint: users.total ? `${Math.round((videos.uploaders / users.total) * 100)}%` : undefined },
              { label: "Active in 30d", value: users.active_30d, hint: users.total ? `${Math.round((users.active_30d / users.total) * 100)}%` : undefined },
            ]}
          />
          {users.suspended > 0 && (
            <p className="mt-5 font-mono text-[11px] text-faint">
              {fmtInt(users.suspended)} account{users.suspended === 1 ? "" : "s"} currently suspended
            </p>
          )}
        </Panel>

        <Panel
          loading={loading || refreshingStorage}
          title="Storage"
          subtitle={storage ? `Scanned ${timeAgo(storage.computed_at)} · ${fmtInt(storage.objects)} objects` : "Bucket scan pending"}
          actions={
            <button
              onClick={refreshStorage}
              disabled={refreshingStorage}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-faint hover:text-ink disabled:opacity-50"
              aria-label="Rescan storage"
              title="Rescan bucket"
            >
              <RefreshCw className={refreshingStorage ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            </button>
          }
        >
          {storage ? (
            <>
              <p className="text-[2rem] font-semibold leading-none tracking-tight text-ink">{fmtBytes(storage.total_bytes)}</p>
              <p className="mt-2 text-xs text-muted">across {fmtInt(storage.users_with_data)} users</p>
              <div className="mt-5">
                <RankedBars
                  rows={[
                    { label: "Renditions & captions", value: storage.output_bytes },
                    { label: "Source uploads", value: storage.source_bytes },
                  ].map((r) => ({
                    ...r,
                    display: fmtBytes(r.value),
                    hint: storage.total_bytes ? `${Math.round((r.value / storage.total_bytes) * 100)}%` : undefined,
                  }))}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <HardDrive className="mb-3 h-5 w-5 text-faint" strokeWidth={1.5} />
              <p className="text-sm text-muted">The bucket is still being scanned.</p>
              <button onClick={refreshStorage} disabled={refreshingStorage} className="btn-ghost mt-4 px-4 py-2 text-xs">
                {refreshingStorage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scan now"}
              </button>
            </div>
          )}
        </Panel>
      </div>

      {/* people + activity */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <Panel
          loading={loading}
          title="Top uploaders"
          subtitle="By videos uploaded, all-time"
          actions={
            <Link href="/admin/users?sort=videos" className="inline-flex items-center gap-1 font-mono text-[11px] text-muted hover:text-ink">
              All users <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {data.top_users.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">No uploads yet</p>
          ) : (
            <ul className="-mx-2">
              {data.top_users.map((u) => (
                <li key={u.user_id}>
                  <Link href={`/admin/users/${u.user_id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2">
                    <Avatar name={u.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{u.name}</p>
                      <p className="truncate font-mono text-[11px] text-faint">{u.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-ink">{fmtInt(u.videos)}</p>
                      <p className="font-mono text-[11px] text-faint">{fmtBytes(u.bytes)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel loading={loading} title="Recent activity" subtitle="Latest upload attempts across all users">
          {data.recent_videos.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">Nothing yet</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_videos.map((v) => (
                <li key={v.video_id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink" title={v.original_filename ?? v.video_id}>
                      {v.original_filename ?? <span className="text-faint">Untitled</span>}
                    </p>
                    <p className="truncate font-mono text-[11px] text-faint">
                      <Link href={`/admin/users/${v.user.user_id}`} className="hover:text-ink">
                        {v.user.email}
                      </Link>{" "}
                      · {timeAgo(v.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel loading={loading} title="Upload formats" subtitle="Source container types, all-time">
        <RankedBars
          rows={data.mime_types.map((m) => ({
            label: m.mime_type,
            value: m.count,
            hint: videos.total ? `${Math.round((m.count / videos.total) * 100)}%` : undefined,
          }))}
          empty="No uploads yet"
        />
      </Panel>
    </main>
  );
}
