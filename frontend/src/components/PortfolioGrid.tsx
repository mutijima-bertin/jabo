"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { portfolioTitle, Lightbox } from "@/components/Lightbox";
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

/**
 * Honest portfolio grid (blueprint §4.3): no silent fallback — an empty
 * category shows a real empty state. Cards open a shared accessible
 * lightbox; used on both the homepage section and /portfolio.
 */
export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  const { locale, t } = useI18n();
  const [activeKey, setActiveKey] = useState<Filter["key"]>("portfolio_filter_all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const activeFilter = FILTERS.find((f) => f.key === activeKey) ?? FILTERS[0];
  const filtered = items.filter((i) => matchesCategory(i.category ?? "", activeFilter.match));
  // No fallback: dead categories honestly show nothing.
  const visible = filtered;

  const selectFilter = (key: Filter["key"]) => {
    setActiveKey(key);
    setOpenIndex(null);
  };

  const closeLightbox = useCallback(() => setOpenIndex(null), []);
  const navigateLightbox = useCallback(
    (i: number) => {
      setOpenIndex((prev) => (prev === null ? prev : (i + visible.length) % visible.length));
    },
    [visible.length],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/15 bg-white/50 px-6 py-16 text-center">
        <p className="font-serif text-lg text-ink/60">{t("portfolio_empty_title")}</p>
        <Link
          href="/book"
          className="mt-5 inline-block text-sm font-semibold text-brass-deep underline decoration-2 underline-offset-4 transition hover:text-brass"
        >
          {t("book_now")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Filter pills — scroll-snap row on mobile so seven pills never wrap raggedly */}
      <div className="-mx-4 mb-8 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0">
        <div className="flex gap-2 snap-x md:flex-wrap md:justify-center">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => selectFilter(f.key)}
              aria-pressed={activeKey === f.key}
              className={`shrink-0 snap-start rounded-full px-4 py-1.5 text-sm transition ${
                activeKey === f.key
                  ? "bg-brass-deep font-semibold text-cream hover:bg-brass-dark"
                  : "border border-ink/15 text-ink/65 hover:border-brass/50 hover:text-brass"
              }`}
            >
              {t(f.key)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        /* Honest per-filter empty state — quiet cream card with actions */
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/50 px-6 py-16 text-center">
          <p className="font-serif text-lg text-ink/60">{t("portfolio_empty_filter_title")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <button
              type="button"
              onClick={() => selectFilter("portfolio_filter_all")}
              className="text-sm font-semibold text-brass-deep underline decoration-2 underline-offset-4 transition hover:text-brass"
            >
              {t("portfolio_empty_filter_action")}
            </button>
            <Link
              href="/book"
              className="text-sm font-medium text-ink/60 underline-offset-4 transition hover:text-brass-deep hover:underline"
            >
              {t("book_now")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenIndex(idx)}
              className="group relative block cursor-pointer overflow-hidden rounded-2xl border border-ink/10 bg-white/70 text-left shadow-sm focus-visible:outline-offset-4"
              aria-label={portfolioTitle(item, locale)}
            >
              <span className="relative block aspect-[3/2] overflow-hidden">
                <Image
                  src={item.coverUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  quality={80}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="absolute inset-x-0 bottom-0 block bg-gradient-to-t from-ink/85 via-ink/45 to-transparent p-4 pt-16">
                {/* Category as brass-tinted uppercase kicker above the title */}
                <span className="mb-1 block translate-y-1 text-[11px] font-semibold uppercase tracking-wider text-brass transition-transform delay-75 duration-300 group-hover:translate-y-0">
                  {item.category}
                </span>
                <span className="block font-serif text-base font-semibold leading-snug text-cream">
                  {portfolioTitle(item, locale)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mount-only: the Lightbox locks body scroll in a mount effect, so it
          must only exist while open — an always-mounted instance would lock
          scrolling for the whole page on load. */}
      {openIndex !== null && (
        <Lightbox items={visible} index={openIndex} onClose={closeLightbox} onNavigate={navigateLightbox} />
      )}
    </div>
  );
}
