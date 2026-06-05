import Link from "next/link";
import { Logo } from "./logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[-20%] top-[-10%] h-[560px] w-[560px] rounded-full opacity-50 blur-[120px]"
          style={{ background: "radial-gradient(closest-side, rgba(205,251,70,0.16), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <Logo />
        <div className="relative">
          <p className="display text-[clamp(2rem,3.4vw,3.25rem)] text-ink">
            Upload once.
            <br />
            Stream <span className="accent-line">everywhere</span>.
          </p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
            Adaptive HLS from 144p to 4K, AI-generated captions, and signed global delivery — from a
            single source file.
          </p>
        </div>
        <p className="relative font-mono text-[11px] text-faint">© {new Date().getFullYear()} Ayush Sharma</p>
      </aside>

      {/* form panel */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo />
          <Link href="/" className="font-mono text-xs text-muted hover:text-ink">
            ← Home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-sm animate-rise">
            <h1 className="font-serif text-3xl text-ink sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
