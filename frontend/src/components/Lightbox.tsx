"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n";
import type { PortfolioItem } from "@/lib/api";

/** Localized display title for a portfolio item (RW falls back to EN). */
export function portfolioTitle(item: PortfolioItem, locale: Locale): string {
  return locale === "rw" ? item.titleRw ?? item.titleEn : item.titleEn;
}

/**
 * One slide's media (cover + any extra mediaUrls) with dot navigation.
 * Keyed by item id from the parent so switching works remounts this and
 * resets the media index without effects.
 */
function LightboxSlide({ item }: { item: PortfolioItem }) {
  const { locale } = useI18n();
  const [mediaIdx, setMediaIdx] = useState(0);
  const sources = [item.coverUrl, ...(item.mediaUrls ?? [])].filter(Boolean);

  return (
    <>
      <Image
        key={sources[mediaIdx]}
        src={sources[mediaIdx]}
        alt={portfolioTitle(item, locale)}
        fill
        sizes="(min-width: 1024px) 80vw, 100vw"
        quality={80}
        className="object-contain"
      />
      {sources.length > 1 && (
        <div className="absolute inset-x-0 -bottom-10 flex justify-center gap-1.5">
          {sources.map((src, i) => (
            <button
              // coverUrl can repeat inside mediaUrls — key by position too
              key={`${i}-${src}`}
              type="button"
              aria-label={`${i + 1} / ${sources.length}`}
              aria-current={i === mediaIdx}
              onClick={() => setMediaIdx(i)}
              className={
                i === mediaIdx
                  ? "h-1.5 w-6 rounded-full bg-brass"
                  : "h-1.5 w-3 rounded-full bg-cream/40 transition hover:bg-cream/70"
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

interface LightboxProps {
  /** Visible (filtered) items — prev/next navigates this list. */
  items: PortfolioItem[];
  /** Open item index; null closes the lightbox. */
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const controlBtn =
  "rounded-full border border-cream/40 bg-ink/40 p-3 text-cream backdrop-blur-sm transition hover:border-brass hover:text-brass";

/**
 * Minimal accessible portfolio lightbox (blueprint §4.3): ink overlay, large
 * image, title/client/category metadata, wrapped prev/next, Escape/backdrop
 * close, focus trap, body scroll lock. Pure client state — no new deps,
 * renders nothing until opened so SSR stays clean.
 */
export function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const { locale, t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const item = index !== null ? items[index] : undefined;

  // Mount-only setup: remember focus, move focus in, lock body scroll.
  // Cleanup restores both — no setState here (lint-safe).
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    // Narrow once so the key handler can use a plain number.
    if (index === null) return;
    const idx = index;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        onNavigate(idx - 1);
      } else if (e.key === "ArrowRight") {
        onNavigate(idx + 1);
      } else if (e.key === "Tab" && panelRef.current) {
        // Focus trap: cycle Tab within the dialog.
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, onClose, onNavigate]);

  if (!item || index === null) return null;

  const title = portfolioTitle(item, locale);
  const count = items.length;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop — click to close */}
      <div className="absolute inset-0 bg-ink/95" onClick={onClose} aria-hidden="true" />

      <div ref={panelRef} tabIndex={-1} className="relative flex h-full flex-col px-4 pb-8 pt-16 outline-none md:px-8">
        {/* Close */}
        <button type="button" aria-label={t("lightbox_close")} onClick={onClose} className={`absolute right-4 top-4 z-10 md:right-8 ${controlBtn}`}>
          <X className="h-5 w-5" />
        </button>

        {/* Image stage */}
        <div className="relative mx-auto w-full max-w-5xl flex-1">
          <div className="relative h-full max-h-[62vh] min-h-[280px] w-full md:max-h-[68vh]">
            <LightboxSlide key={item.id} item={item} />
          </div>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label={t("lightbox_prev")}
                onClick={() => onNavigate(index - 1)}
                className={`absolute left-2 top-1/2 z-10 -translate-y-1/2 md:-left-14 ${controlBtn}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={t("lightbox_next")}
                onClick={() => onNavigate(index + 1)}
                className={`absolute right-2 top-1/2 z-10 -translate-y-1/2 md:-right-14 ${controlBtn}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        <div className="mx-auto mt-12 w-full max-w-5xl text-center">
          <span className="inline-block rounded-full border border-brass/50 bg-brass/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cream">
            {item.category}
          </span>
          <h2 className="mt-3 font-serif text-xl font-semibold leading-snug text-cream md:text-2xl">{title}</h2>
          {item.clientName && (
            <p className="mt-1 text-sm text-cream/70">
              <span className="text-cream/50">{t("portfolio_client")}: </span>
              {item.clientName}
            </p>
          )}
          <p className="mt-3 font-serif text-xs italic tracking-[0.2em] text-cream/85 tabular-nums">{counter}</p>
        </div>

        {/* Polite announcement of position */}
        <p aria-live="polite" className="sr-only">
          {counter}
        </p>
      </div>
    </div>
  );
}
