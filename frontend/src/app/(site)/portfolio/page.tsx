import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl, OG_IMAGE } from "@/lib/seo";
import { JsonLd, portfolioItemListJsonLd } from "@/lib/jsonld";
import { fetchPortfolio } from "@/lib/content";
import { PortfolioGrid } from "@/components/site/PortfolioGrid";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Recent photography, videography and livestreaming productions for media houses, institutions, and events across Rwanda.",
  alternates: { canonical: absoluteUrl("/portfolio") },
  openGraph: {
    title: `Portfolio — ${BRAND}`,
    description: "Recent photography, videography and livestreaming productions for media houses, institutions, and events across Rwanda.",
    url: absoluteUrl("/portfolio"),
    images: [OG_IMAGE],
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio();
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      {/* SEO phase 5 — ItemList of CreativeWork entries from real portfolio rows. */}
      <JsonLd data={portfolioItemListJsonLd(portfolio)} />
      <PageHeading title="page_portfolio_title" sub="page_portfolio_sub" subCls="mt-4 max-w-2xl text-ink/60" />
      <div className="mt-12">
        <PortfolioGrid items={portfolio} />
      </div>
    </div>
  );
}