import type { Metadata } from "next";
import { ContactPageContent } from "@/components/site/ContactPageContent";
import { isLocale } from "@/lib/locale";
import { localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

// Per-locale metadata + self-canonical + hreflang — see `localeMetadata`.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return localeMetadata(locale, "/contact", "contact");
}

export default function ContactPage() {
  return <ContactPageContent />;
}
