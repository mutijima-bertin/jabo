import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { fetchServices } from "@/lib/content";
import { BookingForm } from "@/components/site/BookingForm";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: `Book a Production — ${BRAND}`,
  description: "Book photography, videography or livestreaming in Kigali in minutes. Receive a confirmation and a personal tracking link by email and WhatsApp.",
};

export default async function BookPage() {
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <PageHeading title="book_title" sub="page_book_sub" />
      <div className="mt-12 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-10">
        <BookingForm services={services} />
      </div>
    </div>
  );
}