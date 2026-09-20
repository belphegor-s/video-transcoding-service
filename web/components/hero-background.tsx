"use client";

import { Dithering } from "@paper-design/shaders-react";
import { ExternalLink, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SHADER_HREF = "https://shaders.paper.design";
const SHADER_NAME = "Paper Shaders";
const SHADER_TITLE =
  "Live WebGL dithered wave by Paper Shaders (Apache-2.0) · shaders.paper.design";

export function HeroBackground() {
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    try {
      setWebgl(!!document.createElement("canvas").getContext("webgl2"));
    } catch {
      setWebgl(false);
    }
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {webgl ? <ShaderField /> : <StaticField />}

      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-bg via-bg/85 to-transparent sm:h-40" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 42%, transparent 30%, rgba(11,11,12,0.5) 80%, #0b0b0c 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg" />
    </div>
  );
}

function ShaderField() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return (
    <Dithering
      className="h-full w-full opacity-35"
      colorBack="#0b0b0c"
      colorFront="#cdfb46"
      shape="wave"
      type="8x8"
      size={4}
      speed={reduceMotion ? 0 : 0.18}
      fit="cover"
      scale={1.15}
      minPixelRatio={1.5}
    />
  );
}

function StaticField() {
  return (
    <div
      className="absolute left-1/2 top-[-10%] h-[520px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
      style={{
        background:
          "radial-gradient(closest-side, rgba(205,251,70,0.18), rgba(205,251,70,0.04) 60%, transparent)",
      }}
    />
  );
}

export function HeroShaderCredit({ className }: { className?: string }) {
  return (
    <a
      href={SHADER_HREF}
      target="_blank"
      rel="noreferrer"
      title={SHADER_TITLE}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg/40 px-3 py-1 font-mono text-[10px] uppercase tracking-label text-faint backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-muted",
        className,
      )}
    >
      <Sparkles className="h-3 w-3 text-accent" />
      <span>Hero shader by {SHADER_NAME}</span>
      <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}
