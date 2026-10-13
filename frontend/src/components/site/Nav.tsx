"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { localizedPath, swapLocaleInPath } from "@/lib/locale";
import { Logo } from "@/components/shared/Logo";
export function Nav() {
  const { locale, t, setLocale } = useI18n(); const [open, setOpen] = useState(false); const menu = useRef<HTMLButtonElement>(null); const pathname = usePathname(); const router = useRouter();
  const links = [['/portfolio', t('nav_portfolio')], ['/services', t('nav_services')], ['/about', t('nav_about')]];
  const changeLanguage = () => { const next = locale === 'en' ? 'rw' : 'en'; setLocale(next); router.push(swapLocaleInPath(pathname + window.location.search + window.location.hash, next)); setOpen(false); };
  return <>
    <header className="header">
      <Link className="brand" href={localizedPath(locale, '/')} aria-label="Creative Sound Studio — home">
        <Logo />
      </Link>
      <nav aria-label={t('nav_main_aria')}>{links.map(([href, label]) =>
        <Link key={href} href={localizedPath(locale, href)} aria-current={pathname === localizedPath(locale, href) ? 'page' : undefined}>{label}</Link>)}</nav>
      <div className="nav-actions">
        <button className="language-switch" onClick={changeLanguage} aria-label={t('footer_switch_language_aria')}>{locale === 'en' ? 'RW' : 'EN'}</button>
        <Link className="header-cta" href={localizedPath(locale, '/book')}>{locale === 'en' ? 'Start a conversation' : 'Tuganire'} ↗</Link>
        <button ref={menu} className="menu" aria-controls="mobile-menu" aria-expanded={open} aria-label={open ? t('nav_menu_close') : t('nav_menu_open')} onClick={() => setOpen(!open)}>{open ? (locale === 'en' ? 'Close' : 'Funga') : 'Menu'}</button>
      </div>
    </header>
    <nav id="mobile-menu" hidden={!open} aria-label={t('nav_mobile_aria')} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); menu.current?.focus(); } }}>{[...links, ['/blog', t('nav_blog')], ['/contact', t('nav_contact')], ['/book', t('nav_book')]].map(([href, label]) =>
      <Link key={href} href={localizedPath(locale, href)} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/login" onClick={() => setOpen(false)}>{t('client_login_title')}</Link>
    </nav>
  </>;
}
