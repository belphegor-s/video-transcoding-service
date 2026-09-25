import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { LegalToc } from "./legal-toc";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export const CONTACT_EMAIL = "hello@ayushsharma.me";

/** Shared chrome for /privacy and /terms: quiet header, sticky contents, numbered sections. */
export function LegalPage({
  eyebrow,
  title,
  accent,
  updated,
  summary,
  sections,
  sibling,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  updated: string;
  summary: React.ReactNode[];
  sections: LegalSection[];
  sibling: { href: string; label: string };
}) {
  return (
    <div className="relative z-10">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="shell flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-5 font-mono text-xs text-muted">
            <Link href={sibling.href} className="transition-colors hover:text-ink">
              {sibling.label}
            </Link>
            <Link href="/docs" className="hidden transition-colors hover:text-ink sm:inline">
              API docs
            </Link>
            <Link href="/dashboard" className="btn-ghost px-4 py-2 text-xs">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-240px] h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(205,251,70,0.10), transparent)" }}
        />

        <div className="shell relative pb-10 pt-16 sm:pt-24">
          <p className="eyebrow mb-5 animate-fade">{eyebrow}</p>
          <h1 className="display animate-rise text-[clamp(2.8rem,7vw,5rem)] text-ink">
            {title} <span className="accent-line">{accent}</span>
          </h1>
          <p className="mt-6 font-mono text-[11px] text-faint">
            Last updated <time dateTime={updated}>{new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })}</time>
          </p>
        </div>
      </div>

      <div className="shell grid gap-12 pb-24 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <LegalToc items={sections.map((s, i) => ({ id: s.id, label: s.title, n: i + 1 }))} />
        </aside>

        <article className="min-w-0 max-w-[68ch]">
          <div className="mb-16 rounded-2xl border border-border bg-surface/60 p-6">
            <p className="eyebrow mb-4">The short version</p>
            <ul className="legal-summary space-y-3">
              {summary.map((line, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                  <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-14">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="mb-4 flex items-baseline gap-4">
                  <span className="font-mono text-[11px] tabular-nums text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="font-serif text-[1.65rem] leading-tight text-ink">{s.title}</h2>
                </div>
                <div className="legal-prose space-y-4 text-[15px] leading-[1.75] text-muted">{s.body}</div>
              </section>
            ))}
          </div>

          <div className="hairline my-16" />
          <p className="text-sm text-muted">
            Questions about this page? Write to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline decoration-border underline-offset-4 transition-colors hover:decoration-accent">
              {CONTACT_EMAIL}
            </a>
            . A real person reads every message.
          </p>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
