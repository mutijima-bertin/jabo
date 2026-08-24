import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Themed 404 — cream/brass design language, server-rendered (no locale context). */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-28 text-center md:py-36">
      <Logo className="mx-auto h-14 w-auto" />
      <p className="mt-12 font-serif text-7xl font-semibold text-brass">404</p>
      <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-ink">
        This page is out of frame
      </h1>
      <p className="mt-4 leading-relaxed text-ink/60">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Head back home or browse our latest
        stories.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brass px-7 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
        >
          Back home
        </Link>
        <Link
          href="/blog"
          className="rounded-full border border-ink/15 px-7 py-3.5 text-sm font-bold text-ink/70 transition hover:border-brass hover:text-brass"
        >
          Read the blog
        </Link>
      </div>
    </div>
  );
}