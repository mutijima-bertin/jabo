"use client";

import { useI18n } from "@/lib/i18n";

const CLIENTS = ["FAO", "The New Times", "Kigali Today", "Radio 10", "ABIS"];

/**
 * Tasteful row of client names as styled text wordmarks — grayscale/cream
 * chips, brass on hover. Proper nouns, so no translation needed.
 */
export function ClientsWall() {
  const { t } = useI18n();

  return (
    <section className="border-y border-ink/10 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
        <h2 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">{t("clients_title")}</h2>
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {CLIENTS.map((c) => (
            <li
              key={c}
              className="rounded-full border border-ink/10 bg-white/60 px-6 py-2.5 font-serif text-base font-medium tracking-wide text-ink/55 transition hover:border-brass/40 hover:text-brass"
            >
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}