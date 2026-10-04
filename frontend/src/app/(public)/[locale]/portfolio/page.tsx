import type { Metadata } from "next";
import { JsonLd, portfolioItemListJsonLd } from "@/lib/jsonld";
import { fetchPortfolio } from "@/lib/content";
import { PortfolioGrid } from "@/components/site/PortfolioGrid";
import { PageHeading } from "@/components/shared/PageHeading";
import { isLocale } from "@/lib/locale";
import { localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

// Per-locale metadata + self-canonical + hreflang — see `localeMetadata`.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return localeMetadata(locale, "/portfolio", "portfolio");
}

export default async function PortfolioPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const portfolio = await fetchPortfolio();
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      {/* SEO phase 5 — ItemList of CreativeWork entries from real portfolio rows. */}
      <JsonLd data={portfolioItemListJsonLd(portfolio, locale)} />
      <PageHeading title="page_portfolio_title" sub="page_portfolio_sub" subCls="mt-4 max-w-2xl text-ink/60" />
      <div className="mt-12">
        <PortfolioGrid items={portfolio} />
      </div>
    </div>
  );
}
