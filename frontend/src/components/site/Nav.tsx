"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { localizedPath } from "@/lib/locale";
import { Logo } from "@/components/shared/Logo";

export function Nav() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);

  // `localizedPath` (not `/${locale}…`) so every entry below is a BARE route
  // constant that stays in lockstep with PUBLIC_PATHS in lib/locale.ts — the
  // locale segment is applied in exactly one place. Before the `[locale]`
  // refactor these were bare literals and /about was a 404.
  const links = [
    { href: localizedPath(locale, "/"), label: t("nav_home") },
    { href: localizedPath(locale, "/services"), label: t("nav_services") },
    { href: localizedPath(locale, "/portfolio"), label: t("nav_portfolio") },
    { href: localizedPath(locale, "/blog"), label: t("nav_blog") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href={localizedPath(locale, "/")} aria-label={`${BRAND} — home`} className="shrink-0">
          <Logo className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label={t("nav_main_aria")} className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-brass">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href={localizedPath(locale, "/book")}
            className="rounded-full bg-brass-deep px-4 py-2 text-sm font-semibold text-cream transition hover:bg-brass-dark"
          >
            {t("nav_book")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("nav_menu_close") : t("nav_menu_open")}
            className="rounded-full border border-ink/15 p-2 text-ink/70 transition hover:border-brass hover:text-brass"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav id="mobile-menu" aria-label={t("nav_mobile_aria")} className="border-t border-ink/10 bg-cream md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:bg-cream-alt hover:text-brass"
              >
                {l.label}
              </Link>
            ))}
            <Link
              // /login is in the deliberately BARE set (lib/locale.ts): no
              // locale segment, no localizedPath() — the page follows the
              // persisted `css_locale` preference instead.
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/55 transition hover:bg-cream-alt hover:text-brass"
            >
              {t("client_login_title")}
            </Link>
            <Link
              href={localizedPath(locale, "/book")}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brass-deep px-4 py-2.5 text-center text-sm font-semibold text-cream transition hover:bg-brass-dark"
            >
              {t("nav_book")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}