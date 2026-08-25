"use client";

import { useI18n } from "@/lib/i18n";
import type { Testimonial } from "@/lib/api";
import { SectionTitle } from "@/components/SectionTitle";

/**
 * Homepage social proof: published client testimonials as elegant cream cards.
 * Data is fetched server-side in page.tsx (same pattern as services/portfolio);
 * renders nothing when there are no published testimonials — no empty state
 * on the public site.
 */
export function TestimonialsSection({ items }: { items: Testimonial[] }) {
  const { locale } = useI18n();

  if (items.length === 0) return null;

  return (
    <section className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-12 text-center">
          <SectionTitle k="testimonials_title" />
          <SectionTitle k="testimonials_sub" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="relative rounded-3xl border border-ink/10 bg-white/60 p-8 shadow-sm">
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
      </div>
    </section>
  );
}
