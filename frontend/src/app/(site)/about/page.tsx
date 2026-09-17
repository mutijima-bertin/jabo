import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { fetchSettings } from "@/lib/content";
import { AboutPageContent } from "@/components/site/AboutPageContent";

export const metadata: Metadata = {
  title: "About",
  description: `${BRAND} is a Kigali-based media production company by video journalist Nkurunziza Jabo, working with FAO, The New Times, Kigali Today and Radio 10.`,
};

export default async function AboutPage() {
  const settings = await fetchSettings();
  return <AboutPageContent settings={settings} />;
}