import type { Metadata } from "next";
import { fetchSettings } from "@/lib/content";
import { AboutPageContent } from "@/components/site/AboutPageContent";
import { isLocale } from "@/lib/locale";
import { localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

// Per-locale title + description, self-canonical and hreflang both ways —
// see `localeMetadata` in lib/seo.ts. Descriptions live in PAGE_META (not in
// the 505-key UI dictionaries) because they are written for a SERP; each stays
// inside the 50–165 character envelope the e2e SEO contract enforces.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return localeMetadata(locale, "/about", "about");
}

export default async function AboutPage() {
  const settings = await fetchSettings();
  return <AboutPageContent settings={settings} />;
}
