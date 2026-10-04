"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale } from "@/lib/locale";

/**
 * Keeps `<html lang>` truthful after client-side navigation.
 *
 * SSR already gets this right: the root layout reads the `x-css-locale` header
 * that `src/proxy.ts` sets and renders the correct `lang`. But `router.push`
 * fetches no new document, so soft-navigating `/en/x` → `/rw/x` swaps the whole
 * subtree to Kinyarwanda while `lang="en"` survives from the original document.
 * Crawlers always get a fresh document so this is never an indexing problem —
 * it is an accessibility one (screen readers choose pronunciation rules from
 * this attribute) and a browser-translation-prompt one.
 *
 * This deliberately derives the language from the PATHNAME rather than from
 * `useI18n()`. There are two `I18nProvider` instances in the tree — a prop-less
 * one in the root layout and a `locale`-propped one under `(public)/[locale]` —
 * and an effect in the provider wrote `lang` from both, which raced: React
 * flushes child effects first, so the root instance (resolving to DEFAULT_LOCALE
 * on empty storage) overwrote the correct value on every `/rw/*` page. The
 * pathname has no such ambiguity — it yields one answer, so this mounts once in
 * the root layout and cannot disagree with itself.
 *
 * Not an SEO concern, so deliberately NOT a forced full-page reload in the
 * locale toggle: navigating instantly matters more than re-running a document
 * request that already produced the right value.
 */
export function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const segment = pathname.split("/")[1] ?? "";

    if (isLocale(segment)) {
      document.documentElement.lang = segment;
      return;
    }

    // Bare route (/admin, /login, /account, /track): no locale segment, so the
    // persisted preference decides — same rule I18nProvider's prop-less mode
    // uses to pick its dictionary, which keeps `lang` and the visible copy in
    // agreement. Storage can throw in hardened/privacy modes, hence the guard.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    document.documentElement.lang = stored !== null && isLocale(stored) ? stored : DEFAULT_LOCALE;
  }, [pathname]);

  return null;
}