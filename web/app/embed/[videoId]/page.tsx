"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, VideoOff } from "lucide-react";
import { VideoPlayer } from "@/components/player";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {meta === undefined ? (
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      ) : meta === null ? (
        <div className="flex flex-col items-center gap-3 px-6 text-center">
          <VideoOff className="h-8 w-8 text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">This video is unavailable or not public.</p>
        </div>
      ) : (
        <VideoPlayer
          src={publicStreamUrl(videoId)}
          title={meta.title}
          poster={poster}
          authed={false}
          className="rounded-none border-0"
        />
      )}
    </div>
  );
}
