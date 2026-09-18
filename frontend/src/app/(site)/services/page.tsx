import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd, servicesItemListJsonLd } from "@/lib/jsonld";
import { fetchServices } from "@/lib/content";
import { ServiceBlocks } from "@/components/site/ServiceBlocks";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Wedding & event photography, corporate and documentary videography, livestreaming, drone coverage and more in Kigali, Rwanda.",
  alternates: { canonical: absoluteUrl("/services") },
  openGraph: {
    title: `Services — ${BRAND}`,
    description:
      "Wedding & event photography, corporate and documentary videography, livestreaming, drone coverage and more in Kigali, Rwanda.",
    url: absoluteUrl("/services"),
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default async function ServicesPage() {
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      {/* SEO phase 5 — ItemList of real Service rows (names, descriptions,
          categories, prices straight from /public/services). */}
      <JsonLd data={servicesItemListJsonLd(services)} />
      <div className="max-w-2xl">
        <PageHeading title="page_services_title" sub="page_services_sub" />
      </div>
      <ServiceBlocks services={services} />
    </div>
  );
}