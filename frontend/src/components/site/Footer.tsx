"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { localizedPath, swapLocaleInPath } from "@/lib/locale";
import { CONTACT } from "@/lib/site";
import { Logo } from "@/components/shared/Logo";
export function Footer() {  
const { locale, t, setLocale } = useI18n(); const pathname = usePathname(); const router = useRouter(); return <footer className="wrap site-footer">
    <div className="footer-top">
      <div>
        <Link href={localizedPath(locale, '/')} aria-label="Creative Sound Studio — home">
          <Logo className="footer-logo" />
        </Link>
        <p>{locale === 'en' ? 'Photography. Film. Live production.' : 'Amafoto. Filime. Ibikorwa bya live.'}<br />Kigali, Rwanda.</p>
      </div>
      <nav aria-label="Footer">{[['/portfolio', t('nav_portfolio')], ['/services', t('nav_services')], ['/about', t('nav_about')], ['/blog', t('nav_blog')], ['/contact', t('nav_contact')]].map(([href, label]) =>
        <Link key={href} href={localizedPath(locale, href)}>{label}</Link>)}<Link href="/login">{t('client_login_title')}</Link>
        <Link href="/track">{t('footer_track')}</Link>
      </nav>
      <div className="footer-contact">
        <a href={CONTACT.emailHref}>{CONTACT.email}</a>
        <a href={CONTACT.phoneHref}>{CONTACT.phoneDisplay}</a>
        <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
        <a href="https://www.instagram.com/creativesoundstudiorw/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <a href="https://www.youtube.com/@nkurunzizajabo7867" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Creative Sound Studio. {t('footer_rights')}</span>
      <button aria-label={t('footer_switch_language_aria')} onClick={() => { const next = locale === 'en' ? 'rw' : 'en'; router.push(swapLocaleInPath(pathname + window.location.search + window.location.hash, next)); setLocale(next); }}>{locale === 'en' ? 'Kinyarwanda' : 'English'} ↗</button>
      <a href="#site-main">{locale === 'en' ? 'Back to the start' : 'Subira hejuru'} ↑</a>
    </div>
  </footer>
}
