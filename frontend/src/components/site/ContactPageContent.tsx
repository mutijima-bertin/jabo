"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { CONTACT } from "@/lib/site";
import { PageHeading } from "@/components/shared/PageHeading";
import { WhatsAppIcon, InstagramIcon, YoutubeIcon } from "@/components/shared/social-icons";

/**
 * /contact page body. Client component so the heading, notes and labels
 * follow the active locale. The three contact rows + socials mirror the
 * Footer's contact column so every touchpoint behaves identically.
 */
export function ContactPageContent() {
  const { t } = useI18n();

  // Same 4 links/icons as the Footer social cluster.
  const socials = [
    { href: CONTACT.whatsappUrl, label: t("social_whatsapp"), Icon: WhatsAppIcon },
    { href: "https://www.instagram.com/creativesoundstudiorw/", label: t("social_instagram_studio"), Icon: InstagramIcon },
    { href: "https://www.instagram.com/jabo_nkurunziza/", label: t("social_instagram_jabo"), Icon: InstagramIcon },
    { href: "https://www.youtube.com/@nkurunzizajabo7867", label: t("social_youtube"), Icon: YoutubeIcon },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <PageHeading title="contact_title" sub="contact_sub" />

        <div className="mt-10 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-10">
          {/* Three big contact rows — each one is a working touchpoint. */}
          <div className="space-y-4">
            {/* WhatsApp */}
            <a
              href={CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-2xl border border-ink/10 p-4 transition hover:border-brass/40 hover:bg-brass/5 sm:items-center"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass">
                <WhatsAppIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">{CONTACT.phoneDisplay}</p>
                <p className="mt-0.5 text-sm text-ink/55">{t("contact_whatsapp_note")}</p>
              </div>
            </a>

            {/* Email */}
            <a
              href={CONTACT.emailHref}
              className="flex items-start gap-4 rounded-2xl border border-ink/10 p-4 transition hover:border-brass/40 hover:bg-brass/5 sm:items-center"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">{CONTACT.email}</p>
                <p className="mt-0.5 text-sm text-ink/55">{t("contact_email_note")}</p>
              </div>
            </a>

            {/* Studio — location matches the footer; phone is a tel: link. */}
            <div className="flex items-start gap-4 rounded-2xl border border-ink/10 p-4 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brass/15 text-brass">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-ink">Kigali, Rwanda</p>
                <p className="mt-0.5 text-sm text-ink/55">{t("contact_phone_note")}</p>
                <a
                  href={CONTACT.phoneHref}
                  className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-brass-deep hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {CONTACT.phoneDisplay}
                </a>
              </div>
            </div>
          </div>

          {/* Social cluster — same 4 links as the footer */}
          <ul className="mt-8 flex items-center justify-center gap-3 border-t border-ink/10 pt-8">
            {socials.map(({ href, label, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 text-ink/60 transition hover:border-brass hover:bg-brass hover:text-cream"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>

          {/* Compact CTA strip — the natural next action after contact. */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl bg-green px-6 py-8 text-center sm:flex-row sm:px-8 sm:text-left">
            <p className="font-serif text-xl font-semibold text-cream">{t("blog_cta_title")}</p>
            <Link
              href="/book"
              className="shrink-0 rounded-full bg-brass-deep px-7 py-3 text-sm font-bold text-cream transition hover:bg-brass-dark"
            >
              {t("hero_cta_book")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}