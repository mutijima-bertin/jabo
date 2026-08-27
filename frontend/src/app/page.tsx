import Link from "next/link";
import { fetchSettings, fetchServices, fetchPortfolio, fetchTestimonials, fetchLogos, s } from "@/lib/content";
import { ServiceBento } from "@/components/ServiceBento";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { HeroSection } from "@/components/HeroSection";
import { SectionTitle } from "@/components/SectionTitle";
import { TrustBand } from "@/components/TrustBand";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ClientsWall } from "@/components/ClientsWall";
import { AboutSection } from "@/components/AboutSection";

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
      <HeroSection settings={settings} portfolio={portfolio} />

      {/* PORTFOLIO — the work leads the page */}
      <section id="portfolio" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <SectionTitle k="portfolio_title" />
            <SectionTitle k="portfolio_sub" />
          </div>
          <PortfolioGrid items={portfolio} />
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
        <div className="mx-auto max-w-6xl px-4">
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
      <section className="bg-green">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h2 className="font-serif text-3xl font-semibold text-cream md:text-4xl">
            Ready to capture your story?
          </h2>
          <p className="mt-4 text-cream/70">
            Book in minutes. You&apos;ll receive a confirmation and a personal tracking link — no calls needed.
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-brass-deep px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            Book a production
          </Link>
        </div>
      </section>
    </>
  );
}