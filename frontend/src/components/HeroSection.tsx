"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { s, type SettingsMap } from "@/lib/content";
import type { PortfolioItem } from "@/lib/api";

const SLIDE_MS = 6000;
const MAX_SLIDES = 5;

interface Slide {
  id: string;
  image: string | null;
  kicker: string;
  title: string;
  subtitle: string | null;
  showCta: boolean;
}

export function HeroSection({
  settings,
  portfolio,
}: {
  settings: SettingsMap;
  portfolio: PortfolioItem[];
}) {
  const { locale } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const badge =
    s(settings, "hero_badge", locale) ||
    (locale === "rw"
      ? "Amafoto · Amashusho · Kwerekana mu mubare mubanza — Kigali, u Rwanda"
      : "Photography · Videography · Livestreaming — Kigali, Rwanda");

  const heroTitle =
    s(settings, "hero_title", locale) || (locale === "rw" ? "Amateka y'u Rwanda" : "Capturing Rwanda's stories through photography & film");

  const heroSubtitle =
    s(settings, "hero_subtitle", locale) ||
    (locale === "rw"
      ? "Kuva mu bukwe kugeza ku nyandiko, ibirori biriho kugeza ku mashusho y'igisore — twandika inkuru yawe n'ubwiza bw'umwuga kandi twitanga ku gihe."
      : "From weddings to documentaries, live events to drone coverage — we tell your story with professional craft and on-time delivery.");

  const slides: Slide[] = useMemo(() => {
    const withImage = portfolio.filter((p) => p.coverUrl).slice(0, MAX_SLIDES - 1);
    const result: Slide[] = [
      {
        id: "intro",
        image: withImage[0]?.coverUrl ?? null,
        kicker: badge,
        title: heroTitle,
        subtitle: heroSubtitle,
        showCta: true,
      },
      ...withImage.slice(1).map((p) => ({
        id: p.id,
        image: p.coverUrl,
        kicker: p.category || "Portfolio",
        title: locale === "rw" ? p.titleRw ?? p.titleEn : p.titleEn,
        subtitle: null,
        showCta: false,
      })),
    ];
    return result.slice(0, MAX_SLIDES);
  }, [portfolio, locale, badge, heroTitle, heroSubtitle]);

  const count = slides.length;
  const safeIndex = Math.min(index, count - 1);

  useEffect(() => {
    if (paused || count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, count]);

  const go = (i: number) => setIndex((i + count) % count);

  return (
    <section
      className="grain relative overflow-hidden bg-green-deep"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[72vh] min-h-[540px] max-h-[780px]">
        {slides.map((slide, i) => {
          const active = i === safeIndex;
          return (
            <div
              key={slide.id}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
                active ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
            >
              {slide.image ? (
                <>
                  {/* Photo slide */}
                  <img
                    src={slide.image}
                    alt=""
                    className={`h-full w-full object-cover ${active ? "kenburns" : ""}`}
                  />
                  {/* Dark overlay for photo legibility (kept dark on purpose) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/40" />
                </>
              ) : (
                // Elegant deep-green placeholder when no imagery exists
                <div className="h-full w-full bg-gradient-to-br from-green via-green-deep to-ink/90" />
              )}

              {/* Caption overlay */}
              <div className="absolute inset-0 flex items-end">
                <div className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6">
                  <div
                    key={`${locale}-${slide.id}`}
                    className="fade-up max-w-2xl"
                    style={{ animationDelay: "0.1s" }}
                  >
                    <span className="mb-5 inline-block rounded-full border border-cream/35 bg-ink/25 px-4 py-1.5 text-xs font-medium tracking-wide text-cream backdrop-blur-sm">
                      {slide.kicker}
                    </span>
                    {slide.showCta ? (
                      <h1 className="font-serif text-4xl font-semibold leading-[1.08] text-cream md:text-6xl">
                        {slide.title}
                      </h1>
                    ) : (
                      <h2 className="font-serif text-3xl font-semibold leading-[1.1] text-cream md:text-5xl">
                        {slide.title}
                      </h2>
                    )}
                    {slide.subtitle && (
                      <p className="mt-5 max-w-xl text-base leading-relaxed text-cream/80 md:text-lg">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.showCta && (
                      <div className="mt-8 flex flex-wrap items-center gap-4">
                        <Link
                          href="/book"
                          className="group inline-flex items-center gap-2 rounded-full bg-brass px-7 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
                        >
                          {locale === "rw" ? "Andikisha umurimo" : "Book a production"}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                        <Link
                          href="#portfolio"
                          className="group inline-flex items-center gap-2 rounded-full border border-cream/50 px-7 py-3.5 text-sm font-semibold text-cream transition hover:border-cream hover:bg-cream/10"
                        >
                          <Play className="h-4 w-4" />
                          {locale === "rw" ? "Reba imirimo yacu" : "View our work"}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          {/* Arrows */}
          <button
            aria-label="Previous slide"
            onClick={() => go(safeIndex - 1)}
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cream/30 bg-ink/30 p-2.5 text-cream backdrop-blur-sm transition hover:border-brass hover:bg-brass md:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            aria-label="Next slide"
            onClick={() => go(safeIndex + 1)}
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-cream/30 bg-ink/30 p-2.5 text-cream backdrop-blur-sm transition hover:border-brass hover:bg-brass md:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                aria-label={`Slide ${i + 1} of ${count}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === safeIndex ? "w-7 bg-brass" : "w-2 bg-cream/60 hover:bg-cream"
                }`}
              />
            ))}
          </div>

          {/* Counter */}
          <p className="absolute bottom-6 right-6 z-20 hidden font-serif text-sm italic tracking-[0.2em] text-cream/70 md:block">
            {String(safeIndex + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </p>
        </>
      )}
    </section>
  );
}