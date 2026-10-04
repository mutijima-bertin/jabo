import { fetchSettings, fetchServices, fetchPortfolio, fetchTestimonials, fetchLogos, s } from "@/lib/content";
import { ServiceBento } from "@/components/site/ServiceBento";
import { PortfolioGrid } from "@/components/site/PortfolioGrid";
import { HeroSection } from "@/components/site/HeroSection";
import { HomeCta } from "@/components/site/HomeCta";
import { SectionTitle } from "@/components/shared/SectionTitle";
import { TrustBand } from "@/components/site/TrustBand";
import { TestimonialsSection } from "@/components/site/TestimonialsSection";
import { ClientsWall } from "@/components/site/ClientsWall";
import { AboutSection } from "@/components/site/AboutSection";
import { JsonLd, localBusinessJsonLd } from "@/lib/jsonld";
import type { Metadata } from "next";
import { isLocale } from "@/lib/locale";
import { PAGE_META, localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

// Money page — explicit > inherited default. `localeMetadata` supplies the
// localized title/description, a SELF-canonical (`/en` never points at `/rw`),
// hreflang for both locales + x-default, and the per-route og:locale.
//
// BOTH locales use `title.absolute`, not the root's `%s — <brand>` template.
// The homepage is the one page that already carries the brand inside its own
// title (that is what makes it the keyword-rich money page), so running it
// through the template produced the doubled
// "Creative Sound Studio — … — Creative Sound Studio" — see the EN assertion in
// e2e/seo.spec.ts, which pins "the brand appears exactly once".
//
// generateMetadata rather than a static `metadata` export because the copy now
// depends on the `[locale]` segment.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { ...localeMetadata(locale, "/", "home"), title: { absolute: PAGE_META.home[locale].title } };
}

export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";

  const [settings, services, portfolio, testimonials, logos] = await Promise.all([
    fetchSettings(),
    fetchServices(),
    fetchPortfolio(),
    fetchTestimonials(),
    fetchLogos(),
  ]);

  return (
    <>
      {/* SEO phase 5 — real LocalBusiness identity (contacts from lib/site.ts,
          socials from the footer, price range derived from live service rows). */}
      <JsonLd data={localBusinessJsonLd(services, locale)} />
      <HeroSection settings={settings} portfolio={portfolio} />

      {/* PORTFOLIO — the work leads the page */}
      <section id="portfolio" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <SectionTitle k="portfolio_title" />
            <SectionTitle k="portfolio_sub" />
          </div>
          <PortfolioGrid items={portfolio} maxItems={6} />
        </div>
      </section>

      {/* TRUST */}
      <TrustBand />

      {/* TESTIMONIALS — hides itself when there are no published quotes */}
      <TestimonialsSection items={testimonials} />

      {/* CLIENTS — real logo wall fed from GET /public/logos */}
      <ClientsWall logos={logos} />

      {/* SERVICES — picture-first bento (blueprint §4.6) */}
      <section id="services" className="scroll-mt-20 border-y border-ink/10 bg-cream-alt py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <SectionTitle k="services_title" />
            <SectionTitle k="services_sub" />
          </div>
          <ServiceBento services={services} />
        </div>
      </section>

      {/* ABOUT — compact founder identity card (blueprint §4.9) */}
      <AboutSection
        storyEn={s(settings, "about_story", "en")}
        storyRw={s(settings, "about_story", "rw")}
        founderImage={s(settings, "about_founder_image", "en") || null}
      />

      {/* CTA */}
      <HomeCta />
    </>
  );
}