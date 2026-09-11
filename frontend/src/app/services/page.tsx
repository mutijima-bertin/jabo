import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { fetchServices } from "@/lib/content";
import { ServiceBlocks } from "@/components/site/ServiceBlocks";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: `Services — ${BRAND}`,
  description:
    "Wedding & event photography, corporate and documentary videography, livestreaming, drone coverage and more in Kigali, Rwanda.",
};

export default async function ServicesPage() {
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <PageHeading title="page_services_title" sub="page_services_sub" />
      </div>
      <ServiceBlocks services={services} />
    </div>
  );
}