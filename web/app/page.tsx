import Link from "next/link";
import { ArrowUpRight, Captions, Gauge, Globe, Layers, Lock, Sparkles, UploadCloud } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const RESOLUTIONS = ["144p", "240p", "360p", "480p", "720p", "1080p", "2K", "4K"];

const STEPS = [
  {
    n: "01",
    icon: UploadCloud,
    title: "Upload once",
    body: "Drop a file of any size. It streams straight to object storage through a presigned URL — your browser never proxies bytes through us.",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "We transcode",
    body: "An event kicks off an isolated ffmpeg worker on Fargate. It ladders your source into every resolution it can support and writes HLS segments.",
  },
  {
    n: "03",
    icon: Captions,
    title: "Captions, automatically",
    body: "Audio is transcribed with Deepgram, language detected, and WebVTT + SRT tracks generated in the original language and English.",
  },
  {
    n: "04",
    icon: Globe,
    title: "Stream anywhere",
    body: "Adaptive HLS is delivered over a signed global CDN. Players pick the right rendition for the connection, frame by frame.",
  },
];

const FEATURES = [
  { icon: Layers, title: "144p to 4K, automatically", body: "A full rendition ladder built from your source — never upscaled, only what the original can honestly support." },
  { icon: Captions, title: "AI captions in two languages", body: "Detected source language plus English, as both WebVTT and SRT, wired into the master playlist." },
  { icon: Gauge, title: "Adaptive bitrate HLS", body: "Six-second segments and a clean master manifest mean instant starts and zero rebuffering on bad networks." },
  { icon: Lock, title: "Signed, private delivery", body: "Every segment and caption is served behind short-lived CloudFront signatures. No public buckets, ever." },
  { icon: Globe, title: "Global edge CDN", body: "Cached close to your viewers worldwide, so the first frame lands fast no matter where they are." },
  { icon: Sparkles, title: "Serverless under the hood", body: "S3 events, Lambda, and Fargate scale to zero between jobs and fan out under load. You just upload." },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main className="relative z-10">
        {/* ---------------------------------- HERO ---------------------------------- */}
        <section className="relative overflow-hidden pt-36 pb-24 sm:pt-44 sm:pb-32">
          {/* atmospheric glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-10%] -z-10 h-[520px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
            style={{ background: "radial-gradient(closest-side, rgba(205,251,70,0.18), rgba(205,251,70,0.04) 60%, transparent)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
            }}
          />

          <div className="shell">
            <p className="eyebrow animate-fade mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-accent" />
              Adaptive video pipeline
            </p>

            <h1 className="display max-w-4xl text-[clamp(2.75rem,8vw,6.25rem)] text-ink">
              <span className="block animate-rise" style={{ animationDelay: "60ms" }}>
                Upload a video.
              </span>
              <span className="block animate-rise" style={{ animationDelay: "160ms" }}>
                Get a <span className="accent-line">streaming-ready</span>
              </span>
              <span className="block animate-rise" style={{ animationDelay: "260ms" }}>
                pipeline back.
              </span>
            </h1>

            <p
              className="mt-8 max-w-xl animate-rise text-base leading-relaxed text-muted sm:text-lg"
              style={{ animationDelay: "360ms" }}
            >
              From a single source file to adaptive HLS in every resolution, captions in two
              languages, and signed global delivery — without you touching ffmpeg once.
            </p>

            <div className="mt-10 flex animate-rise flex-wrap items-center gap-3" style={{ animationDelay: "440ms" }}>
              <Link href="/signup" className="btn-primary px-6 py-3 text-[15px]">
                Start transcoding
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#how" className="btn-ghost px-6 py-3 text-[15px]">
                See the pipeline
              </a>
            </div>

            {/* resolution ladder strip */}
            <div className="mt-16 animate-fade" style={{ animationDelay: "640ms" }}>
              <p className="eyebrow mb-4">Renditions generated per source</p>
              <div className="flex flex-wrap gap-2">
                {RESOLUTIONS.map((r) => (
                  <span
                    key={r}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs text-muted"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------- HOW IT WORKS ------------------------------ */}
        <section id="how" className="relative border-t border-border py-24 sm:py-32">
          <div className="shell">
            <div className="mb-16 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow mb-4">How it works</p>
                <h2 className="display max-w-2xl text-[clamp(2rem,5vw,3.5rem)] text-ink">
                  Four steps. <span className="accent-line">Zero</span> infrastructure on your side.
                </h2>
              </div>
            </div>

            <div id="pipeline" className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              {STEPS.map((step) => (
                <div key={step.n} className="group relative bg-bg p-8 transition-colors hover:bg-surface sm:p-10">
                  <div className="flex items-start justify-between">
                    <step.icon className="h-6 w-6 text-accent" strokeWidth={1.5} />
                    <span className="font-mono text-xs text-faint">{step.n}</span>
                  </div>
                  <h3 className="mt-8 font-serif text-2xl text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------- FEATURES -------------------------------- */}
        <section id="features" className="relative border-t border-border py-24 sm:py-32">
          <div className="shell">
            <p className="eyebrow mb-4">Built in</p>
            <h2 className="display mb-16 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] text-ink">
              Everything a serious video pipeline needs.
            </h2>

            <div className="grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="group">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface transition-colors group-hover:border-accent/40">
                    <f.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-base font-medium text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------- CTA ----------------------------------- */}
        <section className="relative border-t border-border py-24 sm:py-32">
          <div className="shell">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-16 sm:px-16 sm:py-24">
              <div
                aria-hidden
                className="pointer-events-none absolute right-[-10%] top-[-40%] h-[420px] w-[420px] rounded-full opacity-40 blur-[100px]"
                style={{ background: "radial-gradient(closest-side, rgba(205,251,70,0.25), transparent)" }}
              />
              <p className="eyebrow mb-6">Ready when you are</p>
              <h2 className="display max-w-2xl text-[clamp(2rem,6vw,4rem)] text-ink">
                Ship video that <span className="accent-line">just plays</span>.
              </h2>
              <p className="mt-6 max-w-md text-muted">
                Create an account, upload your first file, and watch it become an adaptive stream in
                minutes.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/signup" className="btn-primary px-6 py-3 text-[15px]">
                  Create your account
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="btn-ghost px-6 py-3 text-[15px]">
                  I already have one
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
