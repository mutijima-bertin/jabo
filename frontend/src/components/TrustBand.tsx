"use client";

import { useI18n } from "@/lib/i18n";

const STATS = [
  { value: "2015", labelKey: "trust_since_label" as const },
  { value: "10+", labelKey: "trust_years_label" as const },
  { value: "4+", labelKey: "trust_clients_label" as const },
];

/**
 * Credibility band under the hero: "Since 2015" statement + factual stats.
 * Numerals are Fraunces brass; labels are bilingual.
 */
export function TrustBand() {
  const { t } = useI18n();

  return (
    <section className="bg-cream-alt">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center md:py-24">
        <p className="font-serif text-2xl leading-snug text-ink md:text-3xl">{t("trust_statement")}</p>
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
          {STATS.map((stat, i) => (
            <div key={stat.labelKey} className={`sm:px-8 ${i > 0 ? "sm:border-l sm:border-ink/10" : ""}`}>
              <span className="font-serif text-5xl font-semibold text-brass md:text-6xl">{stat.value}</span>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-ink/55">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}