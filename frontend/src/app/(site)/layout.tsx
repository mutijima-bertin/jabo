import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";

/**
 * Public site chrome (spec: cream theme, Nav + Footer + WhatsApp FAB).
 * All marketing/brochure pages live in the `(site)` route group so the admin
 * routes (`/admin`, `/admin/login`) render WITHOUT this chrome (QA #2).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
