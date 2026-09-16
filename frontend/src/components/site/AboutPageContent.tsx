"use client";

import { MapPin, Mail, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { s, type SettingsMap } from "@/lib/content";
import { PageHeading } from "@/components/shared/PageHeading";

/**
 * /about page body. Client component so the headings and labels follow the
 * active locale; the founder story and contact details come from SiteSettings
 * (same Map-prop pattern as the hero) with the locale-aware s() fallback.
 */
export function AboutPageContent({ settings }: { settings: SettingsMap }) {
  const { locale, t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-20">
      <PageHeading title="about_title" />
      <p className="mt-8 leading-relaxed text-ink/70">{s(settings, "about_story", locale)}</p>
      <p className="mt-6 leading-relaxed text-ink/60">{t("about_page_story")}</p>

      <h2 className="mt-16 font-serif text-2xl font-semibold">{t("about_contact")}</h2>
      {/* Contact cards share the site cardSurface (lib/ui.ts). */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">{t("about_location")}</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_location", locale)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">{t("about_email")}</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_email", locale)}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-5 shadow-sm">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-semibold">{t("about_phone")}</p>
            <p className="mt-1 text-sm text-ink/60">{s(settings, "contact_phone", locale)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}