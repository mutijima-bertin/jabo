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
import { BRAND } from "@/lib/constants";
import { absoluteUrl, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo";
import { JsonLd, localBusinessJsonLd } from "@/lib/jsonld";
import type { Metadata } from "next";

// Money page — explicit > inherited default. `absolute` pins the exact
// keyword-rich title (the root template would otherwise re-append the brand).
// The openGraph block mirrors the rendered title/description and pins the
// canonical-home og:url (no og:image yet — later phase).
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default async function HomePage() {
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
      <JsonLd data={localBusinessJsonLd(services)} />
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