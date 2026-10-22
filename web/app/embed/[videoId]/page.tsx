"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoOff } from "lucide-react";
import { VideoPlayer } from "@/components/player";
import { LoadingRegion, Skeleton } from "@/components/skeleton";
import { api, publicStreamUrl } from "@/lib/api";

interface Meta {
  title: string;
}

export default function EmbedPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [meta, setMeta] = useState<Meta | null | undefined>(undefined);
  const [poster, setPoster] = useState<string | undefined>();

  useEffect(() => {
    api
      .publicMeta(videoId)
      .then((m) => setMeta({ title: m.title }))
      .catch(() => setMeta(null));
    api.publicThumbnail(videoId).then((r) => setPoster(r.url)).catch(() => {});
  }, [videoId]);

  return (
    // Embeds live on other sites over video, so they always use the dark palette.
    <div data-theme="dark" className="fixed inset-0 z-50 flex items-center justify-center bg-black text-ink">
      {meta === undefined ? (
        <LoadingRegion label="Loading video" className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="relative h-14 w-14 rounded-full bg-white/10 ring-1 ring-white/10" />
        </LoadingRegion>
      ) : meta === null ? (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <VideoOff className="h-8 w-8 text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">This video is unavailable or not public.</p>
        </div>
      ) : (
        <VideoPlayer
          src={publicStreamUrl(videoId)}
          videoId={videoId}
          title={meta.title}
          poster={poster}
          authed={false}
          className="rounded-none border-0"
        />
      )}
    </div>
  );
}
