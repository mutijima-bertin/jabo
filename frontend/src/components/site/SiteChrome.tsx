import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

/**
 * The public site chrome: Nav + <main> + Footer + WhatsApp FAB (spec: cream
 * theme; QA #2 — the admin panel renders without any of it).
 *
 * Extracted so the two layouts that need identical chrome stay in lockstep:
 *
 *  - `(site)/layout.tsx`      → the BARE routes (/login, /account, /track),
 *                               locale coming from localStorage.
 *  - `(public)/[locale]/layout.tsx` → the 8 localized marketing routes,
 *                               locale coming from the URL.
 *
 * Keeping one component is the whole point: the previous markup lived in
 * `(site)/layout.tsx` alone, so duplicating it for the `[locale]` group would
 * have let the two copies drift (the WhatsApp FAB or the <main> wrapper is
 * exactly the kind of thing that silently disappears from one route family).
 *
 * Deliberately takes no locale prop — Nav/Footer/FAB are client components that
 * read `useI18n()` themselves, so the locale reaches them through the provider
 * that wraps them, not through props. The child layout wraps this in
 * `<I18nProvider locale={…}>`, which is what puts the right dictionary in that
 * context.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
