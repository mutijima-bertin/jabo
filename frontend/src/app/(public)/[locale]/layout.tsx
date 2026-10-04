import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/site/SiteChrome";
import { I18nProvider } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";

/**
 * Layout for the localized public site: `/en`, `/rw` and their children.
 *
 * Two jobs beyond rendering chrome:
 *
 *  1. VALIDATE the segment. `[locale]` matches ANY single path segment, so
 *     `/services` (bare), `/uploads`, and `/fr` all arrive here as a locale.
 *     The `notFound()` below turns that into a real 404 instead of rendering a
 *     page in an undefined language. Static siblings (`/track`, `/login`,
 *     `/account`, `/admin`) win the match before this layout is ever reached, so
 *     validating here cannot shadow them.
 *
 *  2. FEED THE PROVIDER. `locale` is passed to `I18nProvider` so the URL — not
 *     localStorage — decides the language, which is what makes `/rw/*` render
 *     Kinyarwanda server-side for a crawler. The nested provider shadows the
 *     root layout's prop-less one for this subtree only; the bare routes keep
 *     using the root provider's localStorage behaviour.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Explicit is better than inferred: an unknown segment is a 404, not a
  // silent fall back to English. `isLocale` is the one definition of the
  // allowed values, shared with the `[locale]` typing and the proxy.
  if (!isLocale(locale)) notFound();

  return (
    <I18nProvider locale={locale}>
      <SiteChrome>{children}</SiteChrome>
    </I18nProvider>
  );
}
