import type { Metadata } from "next";
import { fetchServices } from "@/lib/content";
import { BookPageShell } from "@/components/site/BookPageShell";
import { PageHeading } from "@/components/shared/PageHeading";
import { isLocale } from "@/lib/locale";
import { localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Per-locale metadata + self-canonical + hreflang — see `localeMetadata`.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return localeMetadata(locale, "/book", "book");
}

export default async function BookPage({ searchParams }: Props) {
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
