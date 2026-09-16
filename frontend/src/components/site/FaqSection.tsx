"use client";

import { useI18n } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// FAQ section — 4 accordion items below the booking form on /book.
// Uses native <details>/<summary> for zero-JS disclosure.
// ---------------------------------------------------------------------------

const FAQ_ITEMS = [
  { q: "book_faq_q1" as const, a: "book_faq_a1" as const },
  { q: "book_faq_q2" as const, a: "book_faq_a2" as const },
  { q: "book_faq_q3" as const, a: "book_faq_a3" as const },
  { q: "book_faq_q4" as const, a: "book_faq_a4" as const },
];

export function FaqSection() {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map(({ q, a }) => (
        <details
          key={q}
          className="rounded-2xl border border-ink/10 bg-white/70"
        >
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-ink/75 transition hover:text-brass-dark [&::-webkit-details-marker]:hidden">
            {t(q)}
          </summary>
          <div className="border-t border-ink/10 px-5 py-4">
            <p className="text-sm leading-relaxed text-ink/55">{t(a)}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
