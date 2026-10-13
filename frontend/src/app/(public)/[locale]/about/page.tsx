import type { Metadata } from "next";
import { fetchSettings, s } from "@/lib/content";
import { Studio } from "@/components/signal/Home";
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

export default async function AboutPage({params}:Props) {
 const {locale:raw}=await params;const locale=isLocale(raw)?raw:"en";const settings=await fetchSettings();
 return <><div className="wrap signal-page-heading"><p className="eyebrow">KIGALI / CREATIVE SOUND STUDIO</p><h1>{locale==="en"?"A personal point of view.":"Uburyo bwihariye bwo kubona inkuru."}</h1></div><Studio founder={s(settings,"about_founder_image",locale)||"/studio/founder-1440.webp"} story={s(settings,"about_story",locale)}/></>;
}
