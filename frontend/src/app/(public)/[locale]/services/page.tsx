import type { Metadata } from "next";
import { JsonLd, servicesItemListJsonLd } from "@/lib/jsonld";
import { fetchServices } from "@/lib/content";
import { ServiceBlocks } from "@/components/site/ServiceBlocks";
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
  return localeMetadata(locale, "/services", "services");
}

export default async function ServicesPage({ params }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-7xl px-4 py-20">
      {/* SEO phase 5 — ItemList of real Service rows (names, descriptions,
          categories, prices straight from /public/services). */}
      <JsonLd data={servicesItemListJsonLd(services, locale)} />
      <div className="max-w-2xl">
        <PageHeading title="page_services_title" sub="page_services_sub" />
      </div>
      <ServiceBlocks services={services} />
    </div>
  );
}
