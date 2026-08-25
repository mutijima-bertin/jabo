import Link from "next/link";
import { fetchSettings, fetchServices, fetchPortfolio, fetchTestimonials, s } from "@/lib/content";
import { ServiceCard } from "@/components/ServiceCard";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { HeroSection } from "@/components/HeroSection";
import { SectionTitle } from "@/components/SectionTitle";
import { TrustBand } from "@/components/TrustBand";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { ClientsWall } from "@/components/ClientsWall";

export default async function HomePage() {
  const [settings, services, portfolio, testimonials] = await Promise.all([
    fetchSettings(),
    fetchServices(),
    fetchPortfolio(),
    fetchTestimonials(),
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

      {/* CLIENTS */}
      <ClientsWall />

      {/* SERVICES */}
      <section id="services" className="scroll-mt-20 border-y border-ink/10 bg-cream-alt py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <SectionTitle k="services_title" />
            <SectionTitle k="services_sub" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <ServiceCard key={svc.id} service={svc} />
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-brass/15 blur-2xl" />
            <div className="flex aspect-[4/5] items-center justify-center rounded-3xl border border-ink/10 bg-gradient-to-br from-cream-alt to-sand font-serif text-7xl font-semibold text-brass">
              J
            </div>
          </div>
          <div>
            <SectionTitle k="about_title" />
            <p className="mt-6 leading-relaxed text-ink/65">{s(settings, "about_story", "en")}</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["FAO", "The New Times", "Kigali Today", "Radio 10"].map((c) => (
                <span key={c} className="rounded-full border border-ink/15 px-4 py-1.5 text-sm text-ink/60">
                  {c}
                </span>
              ))}
            </div>
            <Link href="/about" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brass hover:underline">
              Read the full story →
            </Link>
          </div>
        </div>
      </section>

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
            className="mt-8 inline-block rounded-full bg-brass px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            Book a production
          </Link>
        </div>
      </section>
    </>
  );
}