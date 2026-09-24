"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { CONTACT } from "@/lib/site";
import { cardSurface, cx } from "@/lib/ui";
import { PageHeading } from "@/components/shared/PageHeading";
import { ContactForm } from "@/components/site/ContactForm";
import { WhatsAppIcon, InstagramIcon, YoutubeIcon } from "@/components/shared/social-icons";

/**
 * /contact page body. Client component so the heading, notes and labels
 * follow the active locale. Two columns: the three contact rows + socials
 * (mirroring the Footer's contact column) on the left, and the contact
 * form on the right — the CTA strip spans full width underneath.
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
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl items-start gap-6 lg:grid-cols-2">
        {/* Direct channels — three big contact rows, each one a working touchpoint. */}
        <section className={cx(cardSurface, "p-6 shadow-sm md:p-8")}>
          <h2 className="font-serif text-xl font-semibold">{t("contact_info_title")}</h2>
          <div className="mt-5 space-y-4">
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
        </section>

        {/* Contact form — bilingual, mirrors the booking form patterns. */}
        <section className={cx(cardSurface, "p-6 shadow-sm md:p-8")}>
          <h2 className="font-serif text-xl font-semibold">{t("contact_form_title")}</h2>
          <p className="mt-1.5 text-sm text-ink/55">{t("contact_form_sub")}</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>
      </div>

      {/* Compact CTA strip — the natural next action after contact. */}
      <div className="mx-auto mt-6 max-w-5xl">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-green px-6 py-8 text-center sm:flex-row sm:px-8 sm:text-left">
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
  );
}