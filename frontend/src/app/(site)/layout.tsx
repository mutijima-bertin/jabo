import { SiteChrome } from "@/components/site/SiteChrome";

/**
 * Chrome for the BARE routes — `/login`, `/account`, `/track`, `/track/<token>`.
 * No locale prop: those URLs carry no locale segment (see lib/locale.ts), so
 * the language follows the persisted `css_locale` preference instead, which is
 * what a client following an emailed magic link expects.
 *
 * The localized marketing routes live in the sibling `(public)/[locale]` group
 * and render the identical chrome through the same `SiteChrome` component.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
