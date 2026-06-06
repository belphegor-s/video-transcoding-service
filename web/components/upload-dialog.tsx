"use client";

import { useCallback, useRef, useState } from "react";
import { Film, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { MAX_FILE_BYTES } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALLOWED = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-flv", "video/webm"];

type Phase = "idle" | "uploading" | "done" | "error";

function uploadToS3(url: string, fields: Record<string, string>, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export function UploadDialog({
  onClose,
  onUploaded,
  maxBytes = MAX_FILE_BYTES,
}: {
  onClose: () => void;
  onUploaded: () => void;
  maxBytes?: number;
}) {
  const maxGb = Math.round(maxBytes / (1024 * 1024 * 1024));
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback((f: File | null) => {
    setError(null);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Unsupported format. Use MP4, MOV, WebM, MPEG, AVI or FLV.");
      return;
    }
    if (f.size > maxBytes) {
      setError(`File exceeds the ${maxGb} GB limit.`);
      return;
    }
    setFile(f);
  }, []);

  const start = async () => {
    if (!file) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);
    try {
      const { url, fields } = await api.presignUpload(file.type, file.name);
      await uploadToS3(url, fields, file, setProgress);
      setPhase("done");
      toast.success("Upload complete — transcoding has started.");
      onUploaded();
      setTimeout(onClose, 900);
    } catch (e: any) {
      setPhase("error");
      const msg = e instanceof ApiError ? e.message : e?.message ?? "Upload failed";
      setError(msg);
      toast.error(msg);
    }
  };

  const busy = phase === "uploading";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md animate-rise rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">Upload a video</h2>
          <button onClick={onClose} disabled={busy} className="text-faint transition-colors hover:text-ink disabled:opacity-40">
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
              dragging ? "border-accent bg-accent/5" : "border-border hover:border-faint hover:bg-surface-2",
            )}
          >
            <UploadCloud className="h-8 w-8 text-accent" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-ink">Drop a file or click to browse</p>
              <p className="mt-1 font-mono text-[11px] text-faint">MP4 · MOV · WebM · MPEG · AVI · FLV, up to {maxGb} GB</p>
            </div>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-4">
              <Film className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{file.name}</p>
                <p className="font-mono text-[11px] text-faint">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              {!busy && phase !== "done" && (
                <button onClick={() => setFile(null)} className="text-faint hover:text-ink">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {(busy || phase === "done") && (
              <div>
                <div className="mb-1.5 flex justify-between font-mono text-[11px] text-muted">
                  <span>{phase === "done" ? "Uploaded" : "Uploading"}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 font-mono text-[11px] text-danger">{error}</p>}

        {file && phase !== "done" && (
          <button onClick={start} disabled={busy} className="btn-primary mt-5 w-full py-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start upload"}
          </button>
        )}
      </div>
    </div>
  );
}
