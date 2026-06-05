"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Captions, Loader2, TriangleAlert } from "lucide-react";
import { streamUrl, tokens } from "@/lib/api";

interface Level {
  height: number;
  index: number;
}

export function HlsPlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [subtitles, setSubtitles] = useState<{ id: number; label: string }[]>([]);
  const [currentSub, setCurrentSub] = useState(-1); // -1 = off

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const src = streamUrl(videoId);

    const attachAuth = (xhr: XMLHttpRequest) => {
      const t = tokens.access();
      if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);
    };

    if (!Hls.isSupported()) {
      setStatus("error");
      setErrorMsg("Your browser can't play adaptive HLS streams. Try a desktop Chrome, Edge or Firefox.");
      return;
    }

    const hls = new Hls({
      xhrSetup: attachAuth,
      enableWorker: true,
      lowLatencyMode: false,
    });
    hlsRef.current = hls;

    hls.loadSource(src);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
      setStatus("ready");
      const lv = data.levels
        .map((l, i) => ({ height: l.height, index: i }))
        .filter((l) => l.height)
        .sort((a, b) => b.height - a.height);
      setLevels(lv);
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
      if (hls.autoLevelEnabled) setCurrentLevel(-1);
      else setCurrentLevel(data.level);
    });

    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
      setSubtitles(data.subtitleTracks.map((t, i) => ({ id: i, label: (t.name || t.lang || `Track ${i + 1}`).toUpperCase() })));
    });

    hls.on(Hls.Events.ERROR, (_e, data) => {
      if (!data.fatal) return;
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError();
          break;
        default:
          setStatus("error");
          setErrorMsg("This stream couldn't be loaded. It may still be processing.");
          hls.destroy();
      }
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [videoId]);

  const setLevel = (idx: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = idx; // -1 => auto
    setCurrentLevel(idx);
  };

  const setSub = (id: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.subtitleTrack = id; // -1 => off
    setCurrentSub(id);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-black">
      <video ref={videoRef} controls playsInline className="aspect-video w-full bg-black" />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center">
          <TriangleAlert className="h-7 w-7 text-danger" />
          <p className="max-w-sm text-sm text-muted">{errorMsg}</p>
        </div>
      )}

      {status === "ready" && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface px-4 py-3">
          {/* quality */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-label text-faint">Quality</span>
            <Chip active={currentLevel === -1} onClick={() => setLevel(-1)}>
              Auto
            </Chip>
            {levels.map((l) => (
              <Chip key={l.index} active={currentLevel === l.index} onClick={() => setLevel(l.index)}>
                {l.height}p
              </Chip>
            ))}
          </div>

          {subtitles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Captions className="h-3.5 w-3.5 text-faint" />
              <Chip active={currentSub === -1} onClick={() => setSub(-1)}>
                Off
              </Chip>
              {subtitles.map((s) => (
                <Chip key={s.id} active={currentSub === s.id} onClick={() => setSub(s.id)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 font-mono text-[11px] transition-colors ${
        active ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
