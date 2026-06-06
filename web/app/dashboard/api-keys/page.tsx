"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, KeyRound, Loader2, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { Field } from "@/components/ui";
import { Select } from "@/components/select";
import { ConfirmModal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { ApiKey, Paginated } from "@/lib/types";

const EXPIRY_PRESETS = [
  { label: "No expiry", days: null },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
] as const;

const PAGE_SIZE = 10;

function statusClasses(status: ApiKey["status"]) {
  if (status === "active") return "text-ok";
  if (status === "expired") return "text-faint";
  return "text-danger";
}

function fmtDate(d: string | null) {
  if (!d) return "never";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function ApiKeysPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Paginated<ApiKey> | null>(null);
  const [offset, setOffset] = useState(0);
  const [name, setName] = useState("");
  const [presetIdx, setPresetIdx] = useState(0);
  const [creating, setCreating] = useState(false);

  const [revealKey, setRevealKey] = useState<{ key: string; rotated: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirm, setConfirm] = useState<{ type: "revoke" | "rotate"; key: ApiKey } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.listApiKeys(PAGE_SIZE, offset));
    } catch {
      /* keep previous */
    }
  }, [offset]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  const create = async () => {
    if (!name.trim()) {
      toast.error("Give your key a name");
      return;
    }
    setCreating(true);
    try {
      const days = EXPIRY_PRESETS[presetIdx].days;
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
      const created = await api.createApiKey(name.trim(), expiresAt);
      setRevealKey({ key: created.key, rotated: false });
      setName("");
      setPresetIdx(0);
      toast.success("API key created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create key");
    } finally {
      setCreating(false);
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === "revoke") {
        await api.revokeApiKey(confirm.key.api_key_id);
        toast.success("Key revoked");
      } else {
        const rotated = await api.rotateApiKey(confirm.key.api_key_id);
        setRevealKey({ key: rotated.key, rotated: true });
        toast.success("Key rotated");
      }
      setConfirm(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const copyKey = () => {
    if (!revealKey) return;
    navigator.clipboard.writeText(revealKey.key);
    setCopied(true);
    toast.success("Key copied");
    setTimeout(() => setCopied(false), 1800);
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const keys = data?.items ?? null;

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={user} />

      <main className="shell max-w-3xl py-10 sm:py-14">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to library
        </Link>

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Developer</p>
            <h1 className="font-serif text-4xl text-ink sm:text-5xl">API keys</h1>
          </div>
          <Link href="/docs" className="btn-ghost shrink-0 px-4 py-2.5">
            Read the docs
          </Link>
        </div>

        {/* reveal newly created / rotated key */}
        {revealKey && (
          <div className="mb-8 rounded-2xl border border-accent/40 bg-accent/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-accent">
              <ShieldAlert className="h-4 w-4" />
              <p className="font-mono text-xs uppercase tracking-label">
                {revealKey.rotated ? "New key — copy it now" : "Copy your key now"}
              </p>
            </div>
            <p className="mb-3 text-sm text-muted">
              This is the only time the full key is shown.{revealKey.rotated ? " The previous key has stopped working." : ""} Store it
              somewhere safe.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg p-3">
              <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-ink">{revealKey.key}</code>
              <button onClick={copyKey} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-[11px] text-muted hover:text-ink">
                {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button onClick={() => setRevealKey(null)} className="mt-3 font-mono text-[11px] text-faint hover:text-ink">
              I've saved it, dismiss
            </button>
          </div>
        )}

        {/* create */}
        <div className="card mb-8 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-xl text-ink">
            <KeyRound className="h-4 w-4 text-accent" />
            Create a key
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name" name="key-name" placeholder="Production server" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="sm:w-44">
              <label className="field-label">Expires</label>
              <Select
                ariaLabel="Expiry"
                value={presetIdx}
                onChange={setPresetIdx}
                options={EXPIRY_PRESETS.map((p, i) => ({ label: p.label, value: i }))}
              />
            </div>
            <button onClick={create} disabled={creating} className="btn-primary px-5 py-3">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>
        </div>

        {/* list */}
        {keys === null ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <KeyRound className="mx-auto mb-3 h-6 w-6 text-faint" strokeWidth={1.5} />
            <p className="text-sm text-muted">No API keys yet. Create one above to start using the API.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {keys.map((k) => (
                <li key={k.api_key_id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm text-ink">{k.name}</p>
                      <span className={cn("font-mono text-[10px] uppercase tracking-label", statusClasses(k.status))}>· {k.status}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-faint">
                      <code className="text-muted">{k.key_prefix}••••••••</code>
                      <span>created {fmtDate(k.created_at)}</span>
                      <span>last used {k.last_used_at ? fmtDate(k.last_used_at) : "never"}</span>
                      <span>expires {fmtDate(k.expires_at)}</span>
                    </div>
                  </div>
                  {!k.revoked && (
                    <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => setConfirm({ type: "rotate", key: k })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-faint hover:text-ink"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Rotate
                      </button>
                      <button
                        onClick={() => setConfirm({ type: "revoke", key: k })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-danger/50 hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {data && <Pagination total={data.total} limit={data.limit} offset={data.offset} onChange={setOffset} noun="keys" />}
          </>
        )}
      </main>

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={actionLoading}
        destructive={confirm?.type === "revoke"}
        confirmLabel={confirm?.type === "revoke" ? "Revoke key" : "Rotate key"}
        title={confirm?.type === "revoke" ? "Revoke API key?" : "Rotate API key?"}
        description={
          confirm?.type === "revoke" ? (
            <>
              <span className="text-ink">{confirm?.key.name}</span> will stop working immediately. Apps using it will start
              getting 401s. This can't be undone.
            </>
          ) : (
            <>
              A new secret will be issued for <span className="text-ink">{confirm?.key.name}</span> and shown once. The current
              key stops working immediately.
            </>
          )
        }
      />
    </div>
  );
}
