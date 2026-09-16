"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { serviceIcon } from "@/components/shared/service-icons";
import type { Service } from "@/lib/api";

/**
 * Itara-style numbered service catalog (01., 02., …) for /services — cream
 * cards with brass Fraunces numerals, the rendered price line (blueprint
 * finding #2: prices exist in the DB), and a small thumbnail per block as
 * images arrive. Purely API-driven: services come from the backend.
 */
export function ServiceBlocks({ services }: { services: Service[] }) {
  const { locale, t } = useI18n();

  return (
    <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
      {services.map((svc, i) => {
        const Icon = serviceIcon(svc.icon);
        const name = locale === "rw" ? svc.nameRw : svc.nameEn;
        const desc = locale === "rw" ? svc.descriptionRw : svc.descriptionEn;
        const price = locale === "rw" ? svc.priceRw : svc.priceEn;
        const num = String(i + 1).padStart(2, "0");

        return (
          <li key={svc.id}>
            {/* Card surface = cardSurface (lib/ui.ts). */}
            <Link
              href="/book"
              className="group relative block h-full rounded-2xl border border-ink/10 bg-white/70 shadow-sm transition hover:-translate-y-0.5 hover:border-brass/50 hover:bg-white hover:shadow-md"
            >
              {/* Banner — picture when the service has one, otherwise the branded
                  icon-tile placeholder (mirrors ServiceBento) so row heights
                  stay consistent via the shared aspect-[16/6]. */}
              {svc.imageUrl ? (
                <div className="relative aspect-[16/6] overflow-hidden rounded-t-2xl">
                  <Image
                    src={svc.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    quality={80}
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
              ) : (
                <div className="relative flex aspect-[16/6] items-center justify-center overflow-hidden rounded-t-2xl bg-[radial-gradient(70%_60%_at_30%_20%,rgba(176,141,87,0.22),transparent_70%)]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brass/30 bg-white/70 text-brass shadow-sm transition group-hover:border-brass/60 group-hover:bg-brass/15">
                    <Icon className="h-7 w-7" />
                  </span>
                </div>
              )}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-4 font-serif text-5xl font-semibold leading-none text-ink/10 transition group-hover:text-brass/25"
              >
                {num}
              </span>
              <div className="relative p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/15 text-brass transition group-hover:bg-brass group-hover:text-cream">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold leading-snug">{name}</h3>
                {desc && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/60">{desc}</p>}
                <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  {price && (
                    <p className="text-sm font-semibold text-brass-deep">{price}</p>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold text-brass-deep ${price ? "" : "ml-auto"}`}>
                    {t("book_now")} →
                  </span>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
