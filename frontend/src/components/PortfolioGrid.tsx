"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { PortfolioItem } from "@/lib/api";

interface Filter {
  key:
    | "portfolio_filter_all"
    | "portfolio_filter_weddings"
    | "portfolio_filter_events"
    | "portfolio_filter_corporate"
    | "portfolio_filter_concerts"
    | "portfolio_filter_documentaries"
    | "portfolio_filter_portraits";
  /** English label used to match against the API category field. */
  match: string | null;
}

const FILTERS: Filter[] = [
  { key: "portfolio_filter_all", match: null },
  { key: "portfolio_filter_weddings", match: "Weddings" },
  { key: "portfolio_filter_events", match: "Events" },
  { key: "portfolio_filter_corporate", match: "Corporate" },
  { key: "portfolio_filter_concerts", match: "Concerts" },
  { key: "portfolio_filter_documentaries", match: "Documentaries" },
  { key: "portfolio_filter_portraits", match: "Portraits" },
];

/** Case-insensitive match with singular/plural tolerance; empty → no match. */
function matchesCategory(category: string, filter: string | null): boolean {
  if (!filter) return true;
  const a = category.trim().toLowerCase();
  if (!a) return false;
  const b = filter.toLowerCase();
  if (a === b) return true;
  if (a.endsWith("s")) return a.slice(0, -1) === b;
  return `${a}s` === b;
}

export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const { locale, t } = useI18n();
  const [activeKey, setActiveKey] = useState<Filter["key"]>("portfolio_filter_all");

  const activeFilter = FILTERS.find((f) => f.key === activeKey) ?? FILTERS[0];
  const filtered = items.filter((i) => matchesCategory(i.category ?? "", activeFilter.match));
  // Graceful degradation: no category values or no matches → show everything.
  const visible = filtered.length > 0 ? filtered : items;

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveKey(f.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              activeKey === f.key
                ? "bg-brass font-semibold text-cream"
                : "border border-ink/15 text-ink/60 hover:border-brass/50 hover:text-brass"
            }`}
          >
            {t(f.key)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <figure
            key={item.id}
            className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white/70 shadow-sm"
          >
            <img
              src={item.coverUrl}
              alt={locale === "rw" ? item.titleRw ?? item.titleEn : item.titleEn}
              className="aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent p-4 pt-14">
              <p className="translate-y-1 text-sm font-semibold text-cream transition-transform duration-300 group-hover:translate-y-0">
                {locale === "rw" ? item.titleRw ?? item.titleEn : item.titleEn}
              </p>
              <p className="mt-0.5 translate-y-1 text-xs text-cream/70 transition-transform delay-75 duration-300 group-hover:translate-y-0">
                {item.category}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
      {items.length === 0 && <p className="py-16 text-center text-ink/40">—</p>}
    </div>
  );
}