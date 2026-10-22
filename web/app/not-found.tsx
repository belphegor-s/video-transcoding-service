import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>
      <Logo />
      <p className="display mt-10 text-[clamp(4rem,16vw,9rem)] text-ink">404</p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        This page drifted off the rendition ladder. Let's get you back.
      </p>
      <Link href="/" className="btn-primary mt-8 px-6 py-3">
        Back home
      </Link>
    </div>
  );
}
