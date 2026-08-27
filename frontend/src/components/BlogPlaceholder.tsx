"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Bilingual "coming soon" placeholder for /blog. The real blog engine is a
 * later phase — this page only introduces the route and the design language.
 */
export function BlogPlaceholder() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-2xl px-4 py-28 text-center md:py-36">
      <span className="inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brass">
        <Camera className="h-3.5 w-3.5" />
        Blog
      </span>
      <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">
        {t("blog_title")}
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-ink/65">{t("blog_subtitle")}</p>
      <p className="mt-3 text-sm leading-relaxed text-ink/50">{t("blog_body")}</p>
      <Link
        href="/book"
        className="mt-10 inline-block rounded-full bg-brass-deep px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark"
      >
        {t("blog_cta")}
      </Link>
    </section>
  );
}