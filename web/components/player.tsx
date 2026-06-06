"use client";

import { useEffect, useState } from "react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, Track, isHLSProvider, type MediaProviderAdapter } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { api, captionVttUrl, tokens } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BlobTrack {
  src: string;
  label: string;
  lang: string;
  default: boolean;
}

export function VideoPlayer({
  src,
  videoId,
  title,
  poster,
  authed = true,
  className,
}: {
  src: string;
  videoId: string;
  title?: string;
  poster?: string;
  authed?: boolean;
  className?: string;
}) {
  const [tracks, setTracks] = useState<BlobTrack[]>([]);

  // Captions: fetch each .vtt as text (with auth for the private app) and serve
  // it as a same-origin Blob URL track. Avoids the cross-origin / auth-less
  // native track load that browsers block ("Unsafe attempt to load URL").
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    (async () => {
      try {
        const { tracks: list } = authed ? await api.captions(videoId) : await api.publicCaptions(videoId);
        const headers: HeadersInit = {};
        if (authed) {
          const t = tokens.access();
          if (t) (headers as Record<string, string>).Authorization = `Bearer ${t}`;
        }
        const built: BlobTrack[] = [];
        for (const tr of list) {
          const res = await fetch(captionVttUrl(videoId, tr.path, !authed), { headers });
          if (!res.ok) continue;
          const blobUrl = URL.createObjectURL(new Blob([await res.text()], { type: "text/vtt" }));
          created.push(blobUrl);
          built.push({ src: blobUrl, label: tr.label, lang: tr.lang, default: tr.lang === "en" });
        }
        if (active) setTracks(built);
        else created.forEach((u) => URL.revokeObjectURL(u));
      } catch {
        /* no captions */
      }
    })();
    return () => {
      active = false;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [videoId, authed]);

  function onProviderChange(provider: MediaProviderAdapter | null) {
    if (isHLSProvider(provider)) {
      provider.library = () => import("hls.js");
      provider.config = {
        xhrSetup(xhr) {
          if (authed) {
            const t = tokens.access();
            if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
          }
        },
      };
    }
  }

  return (
    <MediaPlayer
      className={cn("aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black", className)}
      style={{ "--video-brand": "#cdfb46" }}
      title={title}
      src={{ src, type: "application/x-mpegurl" }}
      playsInline
      poster={poster}
      onProviderChange={onProviderChange}
    >
      <MediaProvider />
      {tracks.map((t) => (
        <Track key={t.lang} src={t.src} kind="subtitles" label={t.label} language={t.lang} default={t.default} type="vtt" />
      ))}
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
