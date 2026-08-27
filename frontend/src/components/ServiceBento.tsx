"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { serviceIcon } from "@/components/service-icons";
import type { Service } from "@/lib/api";

/**
 * Picture-first services bento for the homepage (blueprint §4.6, owner
 * request): full-bleed image per service with a tasteful brass/cream icon
 * placeholder while images are missing, one-line description, price line
 * rendered from the existing priceEn/priceRw fields, and a "Book now" chip
 * that inverts to solid brass on hover. Card body links to the linked blog
 * deep-dive when set, otherwise to booking. The first two services render
 * larger when they carry an image (blueprint featured layout).
 *
 * Two coherent card skins: photo cards wear the ink caption scrim (cream
 * text); placeholder cards stay light and set their caption in ink — no
 * foggy scrim over flat cream.
 */
export function ServiceBento({ services }: { services: Service[] }) {
  const { locale, t } = useI18n();

  return (
    <ol className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:grid-flow-row-dense">
      {services.map((svc, i) => {
        const Icon = serviceIcon(svc.icon);
        const name = locale === "rw" ? svc.nameRw : svc.nameEn;
        const desc = locale === "rw" ? svc.descriptionRw : svc.descriptionEn;
        const price = locale === "rw" ? svc.priceRw : svc.priceEn;
        // Featured layout: the first two services go span-3 (half width) when they have an image.
        const large = i < 2 && Boolean(svc.imageUrl);
        const onPhoto = Boolean(svc.imageUrl);
        const href = svc.linkedPostSlug ? `/blog/${svc.linkedPostSlug}` : "/book";
        const num = String(i + 1).padStart(2, "0");

        return (
          <li key={svc.id} className={large ? "sm:col-span-2 lg:col-span-3" : "lg:col-span-2"}>
            <div
              className={`group relative flex overflow-hidden rounded-2xl border shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                onPhoto
                  ? "border-ink/10 bg-white/70 hover:border-brass/60"
                  : "border-brass/25 bg-gradient-to-br from-sand via-cream-alt to-brass/25 hover:border-brass/60"
              } ${large ? "min-h-[380px] sm:min-h-[440px]" : "min-h-[300px]"}`}
            >
              {/* Media — picture or branded placeholder composition */}
              {onPhoto ? (
                <Image
                  src={svc.imageUrl!}
                  alt=""
                  fill
                  sizes={large ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                  quality={80}
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              ) : (
                <div aria-hidden="true" className="absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_20%,rgba(176,141,87,0.22),transparent_70%)]" />
                  {/* Icon badge floats in the clear upper zone */}
                  <div className="absolute inset-x-0 top-[16%] flex justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brass/30 bg-white/70 text-brass shadow-sm transition group-hover:border-brass/60 group-hover:bg-brass/15">
                      <Icon className="h-8 w-8" />
                    </span>
                  </div>
                </div>
              )}

              {/* Photo cards only: bottom scrim for caption legibility */}
              {onPhoto && (
                <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />
              )}

              {/* Catalog numeral */}
              <span
                aria-hidden="true"
                className={`absolute right-5 top-4 font-serif text-4xl font-semibold leading-none ${
                  onPhoto ? "text-cream/30" : "text-ink/10"
                }`}
              >
                {num}
              </span>

              {/* Caption — anchored bottom-left; the link stretches across the
                  card via ::after so the visible title IS the link name (no
                  duplicated sr-only text) */}
              <div className={`relative z-10 mt-auto w-full p-5 ${onPhoto ? "pt-14" : "pt-16"}`}>
                <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
                  <p className={`text-[11px] font-semibold uppercase tracking-wider ${onPhoto ? "text-brass" : "text-brass-dark"}`}>
                    {svc.category}
                  </p>
                  <h3 className={`mt-1 font-serif text-xl font-semibold leading-snug ${onPhoto ? "text-cream" : "text-ink"}`}>
                    {name}
                  </h3>
                </Link>
                {desc && (
                  <p
                    className={`mt-1.5 text-sm leading-relaxed ${onPhoto ? "text-cream/75" : "text-ink/60"} ${
                      large ? "line-clamp-2" : "line-clamp-1"
                    }`}
                  >
                    {desc}
                  </p>
                )}
                {price && <p className={`mt-2 text-sm font-semibold ${onPhoto ? "text-brass" : "text-brass-deep"}`}>{price}</p>}
              </div>

              {/* Book chip — sibling link above the body link; inverts on card hover */}
              <Link
                href="/book"
                className={`absolute bottom-4 right-4 z-20 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                  onPhoto
                    ? "border border-cream/60 bg-ink/40 text-cream backdrop-blur-sm"
                    : "border border-ink/20 bg-white/60 text-ink/70"
                } hover:border-brass-deep hover:bg-brass-deep group-hover:border-brass-deep group-hover:bg-brass-deep group-hover:text-cream`}
              >
                {t("book_now")}
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
