"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, BadgeCheck, Ban, Check, Copy, Globe, KeyRound, Loader2, Lock, ShieldCheck, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { SERIES_COLORS, ShareMeter, fmtInt } from "@/components/admin/charts";
import { Avatar, Badge, Panel, StatTile, fmtBytes, fmtDate } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";
import { LIFETIME_VIDEO_LIMIT, type AdminUserDetail } from "@/lib/types";

type Action = "suspend" | "unsuspend" | "verify";

const ACTION_COPY: Record<Action, { title: string; confirm: string; destructive?: boolean; body: (name: string) => React.ReactNode }> = {
  suspend: {
    title: "Suspend this account?",
    confirm: "Suspend account",
    destructive: true,
    body: (name) => (
      <>
        <span className="text-ink">{name}</span> is locked out of the app and their API keys stop working
        immediately. Their videos stay stored, and public embeds keep playing. You can lift this at any time.
      </>
    ),
  },
  unsuspend: {
    title: "Lift suspension?",
    confirm: "Restore access",
    body: (name) => (
      <>
        <span className="text-ink">{name}</span> will be able to sign in and use their API keys again.
      </>
    ),
  },
  verify: {
    title: "Mark email as verified?",
    confirm: "Mark verified",
    body: (name) => (
      <>
        Skips the email link for <span className="text-ink">{name}</span>. Only do this if you've confirmed they own the
        address.
      </>
    ),
  },
};

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-[11px] text-faint transition-colors hover:text-ink"
      title="Copy user id"
    >
      {value}
      {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.admin.user(id));
      setError(null);
    } catch (e: any) {
      setError({ message: e?.message ?? "Couldn't load user", status: e?.status });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    if (!action || !data) return;
    setBusy(true);
    try {
      const patch = action === "verify" ? { is_verified: true } : { is_suspended: action === "suspend" };
      const res = await api.admin.updateUser(data.user.user_id, patch);
      setData((d) => (d ? { ...d, user: { ...d.user, is_suspended: res.is_suspended, is_verified: res.is_verified } } : d));
      toast.success(action === "suspend" ? "Account suspended" : action === "unsuspend" ? "Access restored" : "Email marked verified");
      setAction(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <main className="shell py-24 text-center">
        {error ? (
          <>
            <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-danger" />
            <p className="text-sm text-muted">{error.status === 404 ? "This user doesn't exist." : error.message}</p>
            <Link href="/admin/users" className="btn-ghost mt-6">
              Back to users
            </Link>
          </>
        ) : (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
        )}
      </main>
    );
  }

  const { user, by_status: s } = data;
  const uploaded = s.uploaded + s.transcoding + s.transcoded;
  const slotsUsed = uploaded + (data.deleted_videos ?? 0);
  const activeKeys = data.api_keys.filter((k) => k.status === "active").length;

  return (
    <main className="shell space-y-6 py-10 sm:py-12">
      <Link href="/admin/users" className="inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" />
        All users
      </Link>

      {/* identity + actions */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={user.name} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-serif text-3xl text-ink sm:text-4xl">{user.name}</h1>
              {user.admin && <Badge tone="accent">Admin</Badge>}
              {user.unlimited && <Badge tone="accent">Unlimited</Badge>}
              {user.is_suspended ? <Badge tone="danger">Suspended</Badge> : user.is_verified ? <Badge tone="ok">Verified</Badge> : <Badge>Unverified</Badge>}
            </div>
            <a href={`mailto:${user.email}`} className="mt-1 block truncate text-sm text-muted hover:text-ink">
              {user.email}
            </a>
            <div className="mt-2">
              <CopyId value={user.user_id} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!user.is_verified && (
            <button onClick={() => setAction("verify")} className="btn-ghost px-4 py-2 text-xs">
              <BadgeCheck className="h-3.5 w-3.5" />
              Mark verified
            </button>
          )}
          {user.admin ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 font-mono text-[11px] text-faint">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admins can't be suspended
            </span>
          ) : user.is_suspended ? (
            <button onClick={() => setAction("unsuspend")} className="btn-primary px-4 py-2 text-xs">
              Restore access
            </button>
          ) : (
            <button
              onClick={() => setAction("suspend")}
              className="btn border border-danger/40 px-4 py-2 text-xs text-danger hover:bg-danger/10"
            >
              <Ban className="h-3.5 w-3.5" />
              Suspend
            </button>
          )}
        </div>
      </div>

      {user.is_suspended && (
        <p className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          <Ban className="h-4 w-4 shrink-0" />
          This account is suspended. Sign-in, the web app and API keys are blocked.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Videos"
          value={fmtInt(uploaded)}
          sub={user.unlimited ? "Unlimited plan" : `${fmtInt(Math.min(slotsUsed, LIFETIME_VIDEO_LIMIT))} of ${LIFETIME_VIDEO_LIMIT} free slots used${data.deleted_videos ? ` · ${fmtInt(data.deleted_videos)} deleted` : ""}`}
        />
        <StatTile
          label="Storage"
          value={fmtBytes(data.storage?.total_bytes ?? (data.storage_computed_at ? 0 : null))}
          sub={
            data.storage
              ? `${fmtBytes(data.storage.source_bytes)} source · ${fmtBytes(data.storage.output_bytes)} renditions`
              : data.storage_computed_at
                ? "No objects in the bucket"
                : "Bucket scan pending"
          }
        />
        <StatTile label="Joined" value={<span className="text-2xl">{fmtDate(user.created_at)}</span>} sub={timeAgo(user.created_at)} />
        <StatTile
          label="Last active"
          value={<span className="text-2xl">{user.last_active_at ? timeAgo(user.last_active_at) : "Never"}</span>}
          sub={user.last_active_at ? fmtDate(user.last_active_at, true) : "No sign-in recorded yet"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-4">
          <Panel title="Pipeline" subtitle="Every upload attempt by this user">
            <ShareMeter
              parts={[
                { label: "Ready", value: s.transcoded, color: SERIES_COLORS.ready },
                { label: "Processing", value: s.uploaded + s.transcoding, color: SERIES_COLORS.processing },
                { label: "Failed", value: s.error, color: SERIES_COLORS.failed },
              ]}
            />
            <dl className="mt-6 space-y-2.5 border-t border-border pt-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Public videos</dt>
                <dd className="tabular-nums text-ink">{fmtInt(data.public_videos)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Folders</dt>
                <dd className="tabular-nums text-ink">{fmtInt(data.folders)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Abandoned upload URLs</dt>
                <dd className="tabular-nums text-ink">{fmtInt(s.signed_url_generated)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="API keys" subtitle={`${activeKeys} active of ${data.api_keys.length}`}>
            {data.api_keys.length === 0 ? (
              <p className="flex items-center gap-2 py-2 text-sm text-faint">
                <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                No keys created
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {data.api_keys.map((k) => (
                  <li key={k.api_key_id} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm text-ink">{k.name}</p>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-label",
                          k.status === "active" ? "text-ok" : k.status === "revoked" ? "text-danger" : "text-faint",
                        )}
                      >
                        {k.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-faint">
                      {k.key_prefix}•••• · used {k.last_used_at ? timeAgo(k.last_used_at) : "never"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Recent videos" subtitle={`Latest ${data.recent_videos.length} of ${fmtInt(uploaded + s.error + s.signed_url_generated)} attempts`}>
          {data.recent_videos.length === 0 ? (
            <div className="py-10 text-center">
              <VideoIcon className="mx-auto mb-3 h-6 w-6 text-faint" strokeWidth={1.5} />
              <p className="text-sm text-muted">No uploads yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.recent_videos.map((v) => (
                <li key={v.video_id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm text-ink" title={v.original_filename ?? v.video_id}>
                      {v.is_public ? (
                        <Globe className="h-3.5 w-3.5 shrink-0 text-faint" aria-label="Public" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-faint" aria-label="Private" />
                      )}
                      <span className="truncate">{v.original_filename ?? <span className="text-faint">Untitled</span>}</span>
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-faint">
                      {fmtDate(v.created_at, true)}
                      {v.folder ? ` · ${v.folder}` : ""}
                      {v.renditions ? ` · ${v.renditions} renditions` : ""} · {v.mime_type.replace("video/", "")}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <ConfirmModal
        open={!!action}
        onClose={() => !busy && setAction(null)}
        onConfirm={run}
        loading={busy}
        destructive={action ? ACTION_COPY[action].destructive : false}
        confirmLabel={action ? ACTION_COPY[action].confirm : ""}
        title={action ? ACTION_COPY[action].title : ""}
        description={action ? ACTION_COPY[action].body(user.name) : null}
      />
    </main>
  );
}
