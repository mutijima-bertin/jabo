"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { Testimonial } from "@/lib/api";
import { cardSurface } from "@/lib/ui";
import { SectionTitle } from "@/components/shared/SectionTitle";

/**
 * Homepage social proof: published client testimonials as elegant cream cards.
 * Data is fetched server-side in page.tsx (same pattern as services/portfolio);
 * renders nothing when there are no published testimonials — no empty state
 * on the public site. Unbounded-list guard: at most six cards render; the
 * remainder becomes one muted "more stories" link to booking.
 */
export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  const { locale, t } = useI18n();

  if (items.length === 0) return null;

  const visible = items.slice(0, 6);
  const hidden = items.length - visible.length;

  return (
    <section className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <SectionTitle k="testimonials_title" />
          <SectionTitle k="testimonials_sub" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <figure key={item.id} className={`relative ${cardSurface} p-8 shadow-sm`}>
              <span aria-hidden className="block font-serif text-6xl leading-none text-brass">
                &ldquo;
              </span>
              <blockquote className="mt-1 font-serif text-lg italic leading-relaxed text-ink/75">
                {locale === "rw" && item.contentRw ? item.contentRw : item.contentEn}
              </blockquote>
              <figcaption className="mt-6 border-t border-ink/10 pt-4">
                <p className="font-semibold text-ink">{item.author}</p>
                {item.role && <p className="mt-0.5 text-sm text-ink/55">{item.role}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
        {hidden > 0 && (
          <p className="mt-8 text-center text-sm text-ink/50">
            <Link
              href="/book"
              className="font-semibold text-brass-deep underline decoration-2 underline-offset-4 transition hover:text-brass"
            >
              {t("testimonials_more").replace("{n}", String(hidden))}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
