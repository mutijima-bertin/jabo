"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type SVGProps } from "react";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { s, type SettingsMap } from "@/lib/content";
import type { PortfolioItem } from "@/lib/api";

const SLIDE_MS = 6000;
const MAX_SLIDES = 5;
const SWIPE_THRESHOLD = 40;

/** DB category (canonical, backend-validated) → i18n filter key for localized kickers. */
const CATEGORY_KEY = {
  weddings: "portfolio_filter_weddings",
  events: "portfolio_filter_events",
  corporate: "portfolio_filter_corporate",
  concert: "portfolio_filter_concerts",
  concerts: "portfolio_filter_concerts",
  documentary: "portfolio_filter_documentaries",
  documentaries: "portfolio_filter_documentaries",
  portrait: "portfolio_filter_portraits",
  portraits: "portfolio_filter_portraits",
} as const;

interface Slide {
  id: string;
  image: string | null;
  kicker: string;
  title: string;
  subtitle: string | null;
  showCta: boolean;
}

/** Decaying soundwave mark — brands the zero-photos fallback slide (blueprint §4.2). */
function SoundwaveMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 48" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="0" y="19" width="5" height="10" rx="2.5" />
      <rect x="11" y="14" width="5" height="20" rx="2.5" />
      <rect x="22" y="8" width="5" height="32" rx="2.5" />
      <rect x="33" y="2" width="5" height="44" rx="2.5" />
      <rect x="44" y="10" width="5" height="28" rx="2.5" />
      <rect x="55" y="5" width="5" height="38" rx="2.5" opacity="0.8" />
      <rect x="66" y="14" width="5" height="20" rx="2.5" opacity="0.65" />
      <rect x="77" y="19" width="5" height="10" rx="2.5" opacity="0.5" />
      <rect x="88" y="15" width="5" height="18" rx="2.5" opacity="0.4" />
      <rect x="99" y="21" width="5" height="6" rx="2.5" opacity="0.3" />
      <rect x="110" y="23" width="5" height="2.5" rx="1.25" opacity="0.2" />
    </svg>
  );
}

export function HeroSection({
  settings,
  portfolio,
}: {
  settings: SettingsMap;
  portfolio: PortfolioItem[];
}) {
  const { locale, t } = useI18n();
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const badge = s(settings, "hero_badge", locale) || t("hero_badge");
  const heroTitle = s(settings, "hero_title", locale) || t("hero_title");
  const heroSubtitle = s(settings, "hero_subtitle", locale) || t("hero_subtitle");

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
      ...withImage.slice(1).map((p) => {
        // Object.hasOwn guard: bare index lookups resolve prototype keys like
        // "constructor"/"valueOf" to truthy garbage for odd category strings.
        const k = p.category?.trim().toLowerCase();
        const categoryKey = k && Object.hasOwn(CATEGORY_KEY, k) ? CATEGORY_KEY[k as keyof typeof CATEGORY_KEY] : undefined;
        return {
          id: p.id,
          image: p.coverUrl,
          kicker: (categoryKey ? t(categoryKey) : p.category) || t("nav_portfolio"),
          title: locale === "rw" ? p.titleRw ?? p.titleEn : p.titleEn,
          subtitle: null,
          showCta: false,
        };
      }),
    ];
    return result.slice(0, MAX_SLIDES);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() is locale-derived; locale is the true dependency
  }, [portfolio, locale, badge, heroTitle, heroSubtitle]);

  const count = slides.length;
  const safeIndex = Math.min(index, count - 1);
  const activeSlide = slides[safeIndex];
  const activeOnFallback = activeSlide ? !activeSlide.image : false;

  useEffect(() => {
    if (hoverPaused || userPaused || count <= 1) return;
    // Respect prefers-reduced-motion: no autoplay (controls still work).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), SLIDE_MS);
    return () => clearInterval(timer);
  }, [hoverPaused, userPaused, count]);

  const go = (i: number) => setIndex((i + count) % count);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(safeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(safeIndex + 1);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      go(safeIndex + (dx < 0 ? 1 : -1));
    }
  };

  const counter = `${String(safeIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  const controlBtn = activeOnFallback
    ? "border-ink/20 bg-cream/70 text-ink hover:border-brass-deep hover:text-brass-deep"
    : "border-cream/40 bg-ink/40 text-cream hover:border-brass hover:text-brass";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("hero_carousel_label")}
      className="grain relative overflow-hidden bg-cream"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onKeyDown={onKeyDown}
    >
      {/* Full first screen of imagery below the h-16 sticky nav — the hero
          bottom lands exactly on the viewport bottom so the redesigned
          controls are visible on first paint (blueprint §4.2, adjusted for
          the in-flow sticky header). */}
      <div
        className="relative h-[calc(100svh-4rem)] min-h-[560px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {slides.map((slide, i) => {
          const active = i === safeIndex;
          const onFallback = !slide.image;
          return (
            <div
              key={slide.id}
              aria-hidden={!active}
              // `inert` + `invisible` keep aria-hidden slides out of the tab
              // order (focus-trap fix); visibility transitions discretely so
              // the crossfade still fades out before hiding.
              inert={!active}
              className={`absolute inset-0 transition-[opacity,visibility] duration-1000 ease-out ${
                active ? "visible z-10 opacity-100" : "invisible z-0 opacity-0"
              }`}
            >
              {slide.image ? (
                <>
                  {/* Photo slide — next/image, preloaded + priority semantics on slide 1 only */}
                  <Image
                    src={slide.image}
                    alt=""
                    fill
                    preload={i === 0}
                    sizes="100vw"
                    quality={80}
                    className={`object-cover ${active ? "kenburns" : ""}`}
                  />
                  {/* Legibility scrims (blueprint §4.2): bottom-up band on the
                      lower 45% only, plus a desktop left-edge column behind the
                      caption — the top two thirds of every photo stays untouched. */}
                  <div aria-hidden className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                  <div aria-hidden className="absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-ink/55 via-ink/20 to-transparent md:block" />
                </>
              ) : (
                // Branded cream/brass fallback for the zero-photos state
                <div aria-hidden className="absolute inset-0 overflow-hidden bg-cream">
                  <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_25%_35%,rgba(176,141,87,0.22),transparent_70%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_80%_80%,rgba(143,111,62,0.14),transparent_70%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <SoundwaveMark className="h-28 w-auto text-brass/25 md:h-40" />
                  </div>
                </div>
              )}

              {/* Caption block — anchored bottom-left */}
              <div className="absolute inset-0 flex items-end">
                <div className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6 md:pb-20">
                  <div
                    key={`${locale}-${slide.id}`}
                    className="fade-up max-w-2xl"
                    style={{ animationDelay: "0.1s" }}
                  >
                    <span
                      className={`mb-5 inline-block rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur-sm ${
                        onFallback ? "border-ink/15 bg-brass/10 text-ink/80" : "border-cream/35 bg-ink/45 text-cream"
                      }`}
                    >
                      {slide.kicker}
                    </span>
                    {slide.showCta ? (
                      <h1
                        className={`hero-title-shadow font-serif text-4xl font-semibold leading-[1.08] md:text-6xl ${
                          onFallback ? "text-ink" : "text-cream"
                        }`}
                      >
                        {slide.title}
                      </h1>
                    ) : (
                      <h2
                        className={`hero-title-shadow font-serif text-3xl font-semibold leading-[1.1] md:text-5xl ${
                          onFallback ? "text-ink" : "text-cream"
                        }`}
                      >
                        {slide.title}
                      </h2>
                    )}
                    {slide.showCta && (
                      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                        <Link
                          href="/book"
                          tabIndex={active ? undefined : -1}
                          className="group inline-flex items-center gap-2 rounded-full bg-brass-deep px-7 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
                        >
                          {t("hero_cta_book")}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </Link>
                        <Link
                          href="#portfolio"
                          tabIndex={active ? undefined : -1}
                          className={`group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-2 underline-offset-8 transition ${
                            onFallback
                              ? "text-ink decoration-ink/30 hover:text-brass-deep hover:decoration-brass-deep"
                              : "text-cream decoration-cream/40 hover:decoration-brass"
                          }`}
                        >
                          {t("hero_cta_portfolio")}
                          <ArrowDown className="h-4 w-4 transition group-hover:translate-y-0.5" />
                        </Link>
                      </div>
                    )}
                    {slide.showCta && slide.subtitle && (
                      <p
                        className={`mt-5 max-w-xl text-sm leading-relaxed line-clamp-2 md:text-base ${
                          onFallback ? "text-ink/70" : "text-cream/75"
                        }`}
                      >
                        {slide.subtitle}
                      </p>
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
          {/* Progress bars — bottom-left (active = brass, wider) */}
          <div className="absolute bottom-6 left-4 z-20 flex items-center gap-1.5 md:left-6">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`${t("hero_slide_label")} ${i + 1} / ${count}`}
                aria-current={i === safeIndex}
                onClick={() => go(i)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === safeIndex
                    ? "w-8 bg-brass"
                    : `w-3 ${activeOnFallback ? "bg-ink/20 hover:bg-ink/40" : "bg-cream/50 hover:bg-cream"}`
                }`}
              />
            ))}
          </div>

          {/* Controls — bottom-right cluster, clear of the caption on mobile
              and shifted left of the floating WhatsApp button's corner */}
          <div className="absolute bottom-7 right-24 z-20 flex items-center gap-2">
            <button
              type="button"
              aria-label={userPaused ? t("hero_play") : t("hero_pause")}
              onClick={() => setUserPaused((p) => !p)}
              className={`rounded-full border p-3 backdrop-blur-sm transition ${controlBtn}`}
            >
              {userPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label={t("hero_prev_slide")}
              onClick={() => go(safeIndex - 1)}
              className={`rounded-full border p-3 backdrop-blur-sm transition ${controlBtn}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t("hero_next_slide")}
              onClick={() => go(safeIndex + 1)}
              className={`rounded-full border p-3 backdrop-blur-sm transition ${controlBtn}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span
              className={`ml-1 select-none font-serif text-xs italic tracking-[0.2em] tabular-nums ${
                activeOnFallback ? "text-ink/70" : "text-cream/85"
              }`}
            >
              {counter}
            </span>
          </div>

          {/* Polite live region announcing slide changes */}
          <p aria-live="polite" className="sr-only">
            {`${t("hero_slide_label")} ${safeIndex + 1} / ${count}`}
          </p>
        </>
      )}
    </section>
  );
}
