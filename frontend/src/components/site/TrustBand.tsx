"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Three non-redundant stats — the "2015 / SINCE" stat was dropped from the
 * RENDER (the statement above already says "Since 2015"); the
 * `trust_since_label` key stays in the dictionary for the data layer to
 * re-wire later. Numerals are Fraunces brass; labels are bilingual.
 */
const STATS = [
  { value: "10+", labelKey: "trust_years_label" as const },
  { value: "4+", labelKey: "trust_clients_label" as const },
  { value: "40+", labelKey: "trust_productions_label" as const },
];

/** Credibility band under the hero: "Since 2015" statement + factual stats. */
export function TrustBand() {
  const { t } = useI18n();

  return (
    <section className="bg-cream-alt">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center md:py-20">
        <p className="font-serif text-2xl leading-snug text-ink md:text-3xl">{t("trust_statement")}</p>
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
          {STATS.map((stat, i) => (
            <div key={stat.labelKey} className={`sm:px-8 ${i > 0 ? "sm:border-l sm:border-ink/10" : ""}`}>
              {/* brass-dark, not brass: large-text AA needs 3:1 and brass on
                  cream-alt measures 2.77:1 (brass-dark = 4.17:1). */}
              <span className="font-serif text-4xl font-semibold text-brass-dark md:text-5xl">{stat.value}</span>
              <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-ink/65">{t(stat.labelKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
