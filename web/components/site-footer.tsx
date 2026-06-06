import Link from "next/link";
import { Logo } from "./logo";

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
            <Link href="/login" className="transition-colors hover:text-ink">
              Sign in
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
          <p>© {new Date().getFullYear()} Ayush Sharma. All rights reserved.</p>
          <p>Built with ffmpeg, AWS &amp; a lot of coffee.</p>
        </div>
      </div>
    </footer>
  );
}
