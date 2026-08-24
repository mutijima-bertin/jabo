import type { Metadata } from "next";
import { fetchServices } from "@/lib/content";
import { ServiceBlocks } from "@/components/ServiceBlocks";

export const metadata: Metadata = {
  title: "Services — Creative Sound Studio",
  description:
    "Wedding & event photography, corporate and documentary videography, livestreaming, drone coverage and more in Kigali, Rwanda.",
};

export default async function ServicesPage() {
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">Services</h1>
        <p className="mt-4 text-ink/60">
          Every production includes professional editing, online delivery, and a personal tracking link from booking to final delivery.
        </p>
      </div>
      <ServiceBlocks services={services} />
    </div>
  );
}