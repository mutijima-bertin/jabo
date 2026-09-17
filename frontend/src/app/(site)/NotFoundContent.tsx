"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/shared/Logo";

/** Themed 404 — client component so the copy follows the persisted locale
 * (server has no locale context; SSR defaults to English). */
export default function NotFoundContent() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-lg px-4 py-28 text-center md:py-36">
      <Logo className="mx-auto h-14 w-auto" />
      <p className="mt-12 font-serif text-7xl font-semibold text-brass">404</p>
      <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight text-ink">{t("notfound_title")}</h1>
      <p className="mt-4 leading-relaxed text-ink/60">{t("notfound_body")}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-brass-deep px-7 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
        >
          {t("notfound_back_home")}
        </Link>
        <Link
          href="/blog"
          className="rounded-full border border-ink/15 px-7 py-3.5 text-sm font-bold text-ink/70 transition hover:border-brass hover:text-brass"
        >
          {t("notfound_read_blog")}
        </Link>
      </div>
    </div>
  );
}
