import type { Metadata } from "next";

export const metadata: Metadata = {
  // Bare keyword only — the root layout's title.template appends the brand.
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Standalone admin shell (spec §4.1, QA #2): renders ONLY {children} so the
 * public Nav + Footer + WhatsApp FAB never appear on /admin or /admin/login.
 * The pages themselves apply `.admin-shell` (dark canvas, brass focus ring).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
