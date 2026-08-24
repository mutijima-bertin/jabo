"use client";

import Link from "next/link";
import { Languages, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { WhatsAppIcon, InstagramIcon, YoutubeIcon } from "@/components/social-icons";

const WHATSAPP_URL = "https://wa.me/250783269951";

export function Footer() {
  const { t, locale, setLocale } = useI18n();
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: "/", label: t("nav_home") },
    { href: "/#services", label: t("nav_services") },
    { href: "/#portfolio", label: t("nav_portfolio") },
    { href: "/#about", label: t("nav_about") },
    { href: "/blog", label: t("nav_blog") },
    { href: "/book", label: t("nav_book") },
  ];

  const socials = [
    { href: WHATSAPP_URL, label: t("social_whatsapp"), Icon: WhatsAppIcon },
    { href: "https://www.instagram.com/creativesoundstudiorw/", label: t("social_instagram_studio"), Icon: InstagramIcon },
    { href: "https://www.instagram.com/jabo_nkurunziza/", label: t("social_instagram_jabo"), Icon: InstagramIcon },
    { href: "https://www.youtube.com/@nkurunzizajabo7867", label: t("social_youtube"), Icon: YoutubeIcon },
  ];

  return (
    <footer className="border-t border-ink/10 bg-cream-alt">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <Link href="/" aria-label="Creative Sound Studio — home">
              <Logo className="h-12 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink/60">
              {locale === "rw"
                ? "Amafoto · Amashusho · Kwerekana ibirori mu mubare mubanza — Kigali, u Rwanda"
                : "Photography · Videography · Livestreaming — Kigali, Rwanda. We tell your story with professional craft and on-time delivery."}
            </p>

            {/* Social icons */}
            <ul className="mt-6 flex items-center gap-3">
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

            <div className="mt-5 flex flex-col gap-2 text-xs font-medium text-ink/50">
              <Link href="/login" className="w-fit underline-offset-2 transition hover:text-brass hover:underline">
                {t("client_login_title")}
              </Link>
              <Link href="/track" className="w-fit underline-offset-2 transition hover:text-brass hover:underline">
                {locale === "rw" ? "Gukurikirana umurimo" : "Track a production"}
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer" className="text-sm">
            <h2 className="font-serif text-xs font-semibold uppercase tracking-[0.22em] text-brass">
              {locale === "rw" ? "Ihuza" : "Links"}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink/65 transition hover:text-brass">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact + language */}
          <div className="text-sm">
            <h2 className="font-serif text-xs font-semibold uppercase tracking-[0.22em] text-brass">
              {locale === "rw" ? "Aho duherereye" : "Contact"}
            </h2>
            <ul className="mt-4 space-y-2.5 text-ink/65">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-brass" />
                Kigali, Rwanda
              </li>
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 transition hover:text-brass"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0 text-brass" />
                  +250 783 269 951
                </a>
              </li>
            </ul>
            <button
              onClick={() => setLocale(locale === "en" ? "rw" : "en")}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream px-3.5 py-2 text-xs font-medium text-ink/70 transition hover:border-brass hover:text-brass"
              aria-label="Switch language"
            >
              <Languages className="h-3.5 w-3.5" />
              {locale === "en" ? "Kinyarwanda" : "English"}
            </button>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-6 text-xs text-ink/50 sm:flex-row">
          <p>
            © {year} Creative Sound Studio. {t("footer_rights")}
          </p>
          <p className="font-serif text-xs italic tracking-wide text-ink/45">
            Captured in Kigali, told in every language.
          </p>
        </div>
      </div>
    </footer>
  );
}