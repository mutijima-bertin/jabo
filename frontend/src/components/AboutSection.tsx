"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { SectionTitle } from "@/components/SectionTitle";

/**
 * Homepage About section (blueprint §4.9): compact brass-framed identity
 * card instead of the oversized empty monogram box — renders the founder
 * photo when `about_founder_image` exists in SiteSettings, otherwise an
 * intentional designed placeholder with a name plate. Credit pills were
 * removed (they duplicate the logos wall).
 */
export function AboutSection({
  storyEn,
  storyRw,
  founderImage,
}: {
  storyEn: string;
  storyRw: string;
  founderImage: string | null;
}) {
  const { locale, t } = useI18n();
  const story = locale === "rw" && storyRw ? storyRw : storyEn;

  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
      <div className="grid items-center gap-12 md:grid-cols-2">
        {/* Identity card */}
        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-3xl bg-brass/15 blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-brass/40 bg-gradient-to-br from-cream-alt to-sand shadow-[0_0_0_6px_rgb(176_141_87/0.08)]">
            <div className="relative aspect-[4/3]">
              {founderImage ? (
                <Image
                  src={founderImage}
                  alt={t("about_founder_name")}
                  fill
                  sizes="(min-width: 768px) 50vw, (min-width: 420px) 90vw, 100vw"
                  quality={80}
                  className="object-cover"
                />
              ) : (
                <>
                  <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(60%_55%_at_35%_30%,rgba(176,141,87,0.22),transparent_70%)]" />
                  <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                    <span className="font-serif text-5xl font-semibold text-brass md:text-6xl">J</span>
                  </div>
                </>
              )}
              {/* Name plate — reads as a designed identity card, not a failed image */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent p-5 pt-12 text-center">
                <p className="font-serif text-lg font-semibold text-cream">{t("about_founder_name")}</p>
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brass">{t("about_founder_role")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Story */}
        <div>
          <SectionTitle k="about_title" />
          <p className="mt-6 leading-relaxed text-ink/65">{story}</p>
          <Link
            href="/about"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brass-deep underline-offset-4 transition hover:text-brass hover:underline"
          >
            {t("about_read_story")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
