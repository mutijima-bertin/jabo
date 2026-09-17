import type { Metadata } from "next";
import { ContactPageContent } from "@/components/site/ContactPageContent";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach Creative Sound Studio in Kigali — WhatsApp, email or phone. We reply within 24 hours.",
};

export default function ContactPage() {
  return <ContactPageContent />;
}