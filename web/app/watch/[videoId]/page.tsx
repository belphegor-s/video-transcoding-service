"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Layers, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { HlsPlayer } from "@/components/hls-player";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/use-auth";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import type { Video } from "@/lib/types";

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading || !user) return;
    api
      .videos()
      .then((list) => setVideo(list.find((v) => v.video_id === videoId) ?? null))
      .catch(() => setVideo(null));
  }, [authLoading, user, videoId]);

  if (authLoading || !user || video === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const fileName = video ? (video.s3_key.split("/").pop() ?? "video").replace(/^video-/, "") : "";

  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={user} />

      <main className="shell py-8 sm:py-12">
        <Link href="/dashboard" className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to library
        </Link>

        {video === null ? (
          <div className="rounded-2xl border border-dashed border-border py-24 text-center">
            <p className="font-serif text-2xl text-ink">Video not found</p>
            <p className="mt-2 text-sm text-muted">It may have been removed, or the link is wrong.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {video.status === "transcoded" ? (
              <HlsPlayer videoId={video.video_id} />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface text-center">
                {video.status === "error" ? (
                  <p className="font-serif text-2xl text-danger">Transcoding failed</p>
                ) : (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-accent" />
                    <div>
                      <p className="font-serif text-2xl text-ink">Still processing</p>
                      <p className="mt-1 text-sm text-muted">This page will be ready once transcoding completes.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-mono text-lg text-ink">{fileName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-faint">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(video.created_at)}
                  </span>
                  {video.transcoded_urls?.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-accent" />
                      {video.transcoded_urls.length} renditions
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={video.status} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
