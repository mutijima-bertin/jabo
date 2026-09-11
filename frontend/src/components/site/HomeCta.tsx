"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/**
 * Homepage closing CTA — the green band with the booking link. Client
 * component so the copy follows the active locale ("Ready to capture your
 * story?" reuses the shared blog CTA title key).
 */
export function HomeCta() {
  const { t } = useI18n();

  return (
    <section className="bg-green">
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h2 className="font-serif text-3xl font-semibold text-cream md:text-4xl">{t("blog_cta_title")}</h2>
        <p className="mt-4 text-cream/70">{t("home_cta_body")}</p>
        <Link
          href="/book"
          className="mt-8 inline-block rounded-full bg-brass-deep px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark"
        >
          {t("hero_cta_book")}
        </Link>
      </div>
    </section>
  );
}