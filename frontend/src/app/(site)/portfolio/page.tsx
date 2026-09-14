import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { fetchPortfolio } from "@/lib/content";
import { PortfolioGrid } from "@/components/site/PortfolioGrid";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: `Portfolio — ${BRAND}`,
  description: "Recent photography, videography and livestreaming productions for media houses, institutions, and events across Rwanda.",
};

export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio();
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <PageHeading title="page_portfolio_title" sub="page_portfolio_sub" subCls="mt-4 max-w-2xl text-ink/60" />
      <div className="mt-12">
        <PortfolioGrid items={portfolio} />
      </div>
    </div>
  );
}