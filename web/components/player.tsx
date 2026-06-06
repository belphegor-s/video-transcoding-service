"use client";

import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, isHLSProvider, type MediaProviderAdapter } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { tokens } from "@/lib/api";
import { cn } from "@/lib/utils";

export function VideoPlayer({
  src,
  title,
  poster,
  authed = true,
  className,
}: {
  src: string;
  title?: string;
  poster?: string;
  authed?: boolean;
  className?: string;
}) {
  function onProviderChange(provider: MediaProviderAdapter | null) {
    if (isHLSProvider(provider)) {
      // Use the bundled hls.js instead of Vidstack's default CDN fetch
      // (blocked by our CSP, and avoids a third-party runtime dependency).
      provider.library = () => import("hls.js");
      provider.config = {
        // Let hls.js fetch + render captions itself (via its CORS-open, auth-aware
        // loader) instead of a native <track src> which can't send the auth header
        // and is blocked cross-origin ("Unsafe attempt to load URL").
        renderTextTracksNatively: false,
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
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
