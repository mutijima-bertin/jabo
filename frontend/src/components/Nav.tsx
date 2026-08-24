"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

export function Nav() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("nav_home") },
    { href: "/#services", label: t("nav_services") },
    { href: "/#portfolio", label: t("nav_portfolio") },
    { href: "/blog", label: t("nav_blog") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" aria-label="Creative Sound Studio — home" className="shrink-0">
          <Logo className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-brass">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/book"
            className="rounded-full bg-brass px-4 py-2 text-sm font-semibold text-cream transition hover:bg-brass-dark"
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
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-ink/10 bg-cream md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
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
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink/55 transition hover:bg-cream-alt hover:text-brass"
            >
              {t("client_login_title")}
            </Link>
            <Link
              href="/book"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brass px-4 py-2.5 text-center text-sm font-semibold text-cream transition hover:bg-brass-dark"
            >
              {t("nav_book")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}