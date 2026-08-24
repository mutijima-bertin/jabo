import type { Metadata } from "next";
import { fetchServices } from "@/lib/content";
import { BookingForm } from "@/components/BookingForm";

export const metadata: Metadata = {
  title: "Book a Production — Creative Sound Studio",
  description: "Book photography, videography or livestreaming in Kigali in minutes. Receive a confirmation and a personal tracking link by email and WhatsApp.",
};

export default async function BookPage() {
  const services = await fetchServices();
  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <h1 className="font-serif text-3xl font-semibold leading-tight md:text-5xl">Book a production</h1>
      <p className="mt-4 text-ink/60">
        Fill in the form and you&apos;ll receive a confirmation plus a personal tracking link by email and WhatsApp — no calls
        needed. We&apos;ll reply with a price confirmation shortly after.
      </p>
      <div className="mt-12 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-10">
        <BookingForm services={services} />
      </div>
    </div>
  );
}
