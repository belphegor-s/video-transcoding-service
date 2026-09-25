import Link from "next/link";
import { Logo } from "./logo";
import { SHADER_CREDIT, SHADER_TITLE } from "@/lib/shader-credit";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border">
      <div className="shell py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 font-mono text-xs text-muted">
            <a href="/#how" className="transition-colors hover:text-ink">
              How it works
            </a>
            <a href="/#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <Link href="/docs" className="transition-colors hover:text-ink">
              API docs
            </Link>
            <a
              href="https://github.com/belphegor-s/video-transcoding-service"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              Source
            </a>
          </nav>
        </div>
        <div className="hairline my-8" />
        <div className="flex flex-col gap-2 font-mono text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} Ayush Sharma. All rights reserved.</span>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
          </p>
          <p>
            Built with ffmpeg, AWS &amp; a lot of coffee. Hero noise by{" "}
            <a
              href={SHADER_CREDIT.href}
              target="_blank"
              rel="noreferrer"
              title={SHADER_TITLE}
              className="underline decoration-border underline-offset-2 transition-colors hover:text-accent"
            >
              {SHADER_CREDIT.name}
            </a>{" "}
            ({SHADER_CREDIT.license}).
          </p>
        </div>
      </div>
    </footer>
  );
}
