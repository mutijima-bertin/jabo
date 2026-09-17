import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl } from "@/lib/seo";
import { fetchSettings } from "@/lib/content";
import { AboutPageContent } from "@/components/site/AboutPageContent";

// ≤160 chars (SEO phase 3 tightened the previous 161-char line).
const ABOUT_DESCRIPTION = `${BRAND} is a Kigali-based media production company by video journalist Nkurunziza Jabo — trusted by FAO, The New Times, Kigali Today and Radio 10.`;

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESCRIPTION,
  openGraph: {
    title: `About — ${BRAND}`,
    description: ABOUT_DESCRIPTION,
    url: absoluteUrl("/about"),
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default async function AboutPage() {
  const settings = await fetchSettings();
  return <AboutPageContent settings={settings} />;
}