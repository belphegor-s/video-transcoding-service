"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, Layers, Loader2, MonitorPlay } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { VideoPlayer } from "@/components/player";
import { DownloadMenu } from "@/components/download-menu";
import { ShareControls } from "@/components/share-controls";
import { TranscriptionPanel } from "@/components/transcription-panel";
import { EditableTitle } from "@/components/editable-title";
import { FolderControl } from "@/components/folder-control";
import { StatusBadge } from "@/components/status-badge";
import { useAuth } from "@/lib/use-auth";
import { api, streamUrl } from "@/lib/api";
import { qualitiesFromVideo, type Video } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function WatchPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [video, setVideo] = useState<Video | null | undefined>(undefined);
  const [poster, setPoster] = useState<string | undefined>();

  useEffect(() => {
    if (authLoading || !user) return;
    api
      .videoById(videoId)
      .then((v) => setVideo(v))
      .catch(() => setVideo(null));
  }, [authLoading, user, videoId]);

  useEffect(() => {
    if (video?.status === "transcoded") {
      api.thumbnail(video.video_id).then((r) => setPoster(r.url)).catch(() => {});
    }
  }, [video]);

  if (authLoading || !user || video === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  const title = video ? video.original_filename ?? (video.s3_key.split("/").pop() ?? "video").replace(/^video-/, "") : "";
  const qualities = video ? qualitiesFromVideo(video) : [];

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
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* left: player + meta + downloads */}
            <div className="min-w-0">
              {video.status === "transcoded" ? (
                <VideoPlayer src={streamUrl(video.video_id)} videoId={video.video_id} title={title} poster={poster} authed />
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

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <EditableTitle
                    videoId={video.video_id}
                    value={title}
                    onSaved={(name) => setVideo({ ...video, original_filename: name })}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-faint">
                    <span className="inline-flex items-center gap-1.5" title={new Date(video.created_at).toLocaleString()}>
                      <Clock className="h-3.5 w-3.5" />
                      {timeAgo(video.created_at)}
                    </span>
                    {qualities.length > 0 && (
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-accent" />
                          {qualities.length} rendition{qualities.length > 1 ? "s" : ""}
                        </span>
                        <span className="inline-flex items-center gap-1.5" title="Highest available rendition">
                          <MonitorPlay className="h-3.5 w-3.5" />
                          {qualities[0].width} &times; {qualities[0].height}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-3">
                    <FolderControl
                      videoId={video.video_id}
                      value={video.folder}
                      onSaved={(folder) => setVideo({ ...video, folder })}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={video.status} />
                  {video.status === "transcoded" && qualities.length > 0 && (
                    <DownloadMenu videoId={video.video_id} qualities={qualities} />
                  )}
                </div>
              </div>
            </div>

            {/* right: share + transcription */}
            {video.status === "transcoded" && (
              <aside className="flex min-w-0 flex-col gap-6">
                <ShareControls videoId={video.video_id} initialPublic={video.is_public} />
                <TranscriptionPanel fetcher={() => api.transcription(video.video_id)} />
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
