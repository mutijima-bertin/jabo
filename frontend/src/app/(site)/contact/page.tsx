import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { ContactPageContent } from "@/components/site/ContactPageContent";

export const metadata: Metadata = {
  title: `Contact — ${BRAND}`,
  description: "Reach Creative Sound Studio in Kigali — WhatsApp, email or phone. We reply within 24 hours.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}