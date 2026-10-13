import {fetchSettings,fetchRequiredServices as fetchServices,fetchRequiredPortfolio as fetchPortfolio,s} from "@/lib/content";
import {Home} from "@/components/signal/Home";
import { JsonLd, localBusinessJsonLd } from "@/lib/jsonld";
import type { Metadata } from "next";
import { isLocale } from "@/lib/locale";
import { PAGE_META, localeMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

// Money page — explicit > inherited default. `localeMetadata` supplies the
// localized title/description, a SELF-canonical (`/en` never points at `/rw`),
// hreflang for both locales + x-default, and the per-route og:locale.
//
// BOTH locales use `title.absolute`, not the root's `%s — <brand>` template.
// The homepage is the one page that already carries the brand inside its own
// title (that is what makes it the keyword-rich money page), so running it
// through the template produced the doubled
// "Creative Sound Studio — … — Creative Sound Studio" — see the EN assertion in
// e2e/seo.spec.ts, which pins "the brand appears exactly once".
//
// generateMetadata rather than a static `metadata` export because the copy now
// depends on the `[locale]` segment.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return { ...localeMetadata(locale, "/", "home"), title: { absolute: PAGE_META.home[locale].title } };
}

export default async function HomePage({ params }: Props) {
 const {locale:raw}=await params;const locale=isLocale(raw)?raw:"en";
 const [settings,services,portfolio]=await Promise.all([fetchSettings(),fetchServices(),fetchPortfolio()]);
 return <><JsonLd data={localBusinessJsonLd(services,locale)}/><Home services={services} projects={portfolio} founder={s(settings,"about_founder_image",locale)||"/studio/founder-1440.webp"} story={s(settings,"about_story",locale)}/></>;
}
