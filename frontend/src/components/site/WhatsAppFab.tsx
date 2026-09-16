"use client";

import { useI18n } from "@/lib/i18n";
import { CONTACT } from "@/lib/site";
import { WhatsAppIcon } from "@/components/shared/social-icons";

/**
 * Floating WhatsApp button — fixed bottom-right, visible on every screen
 * size, mounted once in the root layout.
 */
export function WhatsAppFab() {
  const { t } = useI18n();

  return (
    <a
      href={CONTACT.whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp_aria")}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green text-cream shadow-lg shadow-ink/25 transition hover:scale-105 hover:bg-green-deep"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}