import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";
import { fetchServices } from "@/lib/content";
import { BookPageShell } from "@/components/site/BookPageShell";
import { PageHeading } from "@/components/shared/PageHeading";

export const metadata: Metadata = {
  title: "Book a Production",
  description: "Book photography, videography or livestreaming in Kigali in minutes. Receive a confirmation and a personal tracking link by email and WhatsApp.",
  alternates: { canonical: absoluteUrl("/book") },
  openGraph: {
    title: `Book a Production — ${BRAND}`,
    description: "Book photography, videography or livestreaming in Kigali in minutes. Receive a confirmation and a personal tracking link by email and WhatsApp.",
    url: absoluteUrl("/book"),
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const services = await fetchServices();
  const raw = typeof sp.service === "string" ? sp.service : undefined;
  const initialServiceId = raw && services.some((s) => s.id === raw) ? raw : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <PageHeading title="book_title" sub="page_book_sub" />
      <BookPageShell services={services} initialServiceId={initialServiceId} />
    </div>
  );
}
