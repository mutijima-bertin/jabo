import type { Metadata } from "next";
import { fetchPortfolio } from "@/lib/content";
import { PortfolioGrid } from "@/components/PortfolioGrid";

export const metadata: Metadata = {
  title: "Portfolio — Creative Sound Studio",
  description: "Recent photography, videography and livestreaming productions for media houses, institutions, and events across Rwanda.",
};

export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio();
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <h1 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">Portfolio</h1>
      <p className="mt-4 max-w-2xl text-ink/60">
        A selection of recent work — weddings, corporate documentaries, live events, and institutional coverage.
      </p>
      <div className="mt-12">
        <PortfolioGrid items={portfolio} />
      </div>
    </div>
  );
}
