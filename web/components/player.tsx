"use client";

import { useEffect, useState } from "react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, Poster, Track, isHLSProvider, type MediaProviderAdapter } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { api, captionVttUrl, isApiUrl, tokens } from "@/lib/api";
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
        // Let ABR choose the opening rendition (-1) instead of pinning the
        // lowest. A generous default bandwidth estimate means a fast connection
        // starts at a high rendition immediately and only downshifts if the
        // measured throughput can't sustain it. Pinning level 0 (the old value)
        // made every viewer start at the worst quality and crawl up.
        startLevel: -1,
        abrEwmaDefaultEstimate: 5_000_000, // 5 Mbps cold-start assumption
        // Small startup buffer for instant playback, but let a fast connection
        // race ahead so high-bitrate (4k/1440p) playback doesn't rebuffer.
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        xhrSetup(xhr: XMLHttpRequest, url: string) {
          // Only our own API (the playlists) is auth-gated. Segments now load
          // straight from signed CloudFront URLs; attaching a header there would
          // trigger a CORS preflight and defeat edge caching.
          if (authed && isApiUrl(url)) {
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
      <MediaProvider>{poster && <Poster className="vds-poster" alt={title ?? ""} />}</MediaProvider>
      {tracks.map((t) => (
        <Track key={t.lang} src={t.src} kind="subtitles" label={t.label} language={t.lang} default={t.default} type="vtt" />
      ))}
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
