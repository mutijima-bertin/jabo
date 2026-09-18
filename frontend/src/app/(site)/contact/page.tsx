import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl, OG_IMAGE } from "@/lib/seo";
import { ContactPageContent } from "@/components/site/ContactPageContent";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach Creative Sound Studio in Kigali — WhatsApp, email or phone. We reply within 24 hours.",
  alternates: { canonical: absoluteUrl("/contact") },
  openGraph: {
    title: `Contact — ${BRAND}`,
    description: "Reach Creative Sound Studio in Kigali — WhatsApp, email or phone. We reply within 24 hours.",
    url: absoluteUrl("/contact"),
    images: [OG_IMAGE],
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}