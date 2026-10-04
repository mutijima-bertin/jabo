"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  Images,
  LayoutDashboard,
  Loader2,
  LogOut,
  Newspaper,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { BRAND } from "@/lib/constants";
import { clearToken, useAdminAuth } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { useI18n, type DictKey } from "@/lib/i18n";
import { localizedPath } from "@/lib/locale";
import { ToastProvider } from "@/lib/toast";
import {
  accountChip,
  btnLg,
  btnPrimary,
  cx,
  filterChipActive,
  filterChipInactive,
  mobileNav,
  shellMain,
  sidebar,
  sidebarBrand,
  sideLinkActive,
  sideLinkDanger,
  sideLinkIcon,
  sideLinkInactive,
  topbar,
  topbarActions,
  topbarBrandLabel,
  topbarBreadcrumb,
  topbarDate,
  topbarIcon,
  topbarInner,
  topbarKbd,
  topbarSearchTrigger,
  topbarSeparator,
  topbarTabLabel,
} from "@/lib/ui";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminBookings } from "@/components/admin/AdminBookings";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminSearchPalette, SEARCH_PANEL_ID } from "@/components/admin/AdminSearchPalette";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminPortfolio } from "@/components/admin/AdminPortfolio";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { AdminClients } from "@/components/admin/AdminClients";
import { AdminSettings } from "@/components/admin/AdminSettings";

type Tab = "dashboard" | "bookings" | "services" | "portfolio" | "blog" | "clients" | "settings";

const VALID_TABS: readonly Tab[] = [
  "dashboard",
  "bookings",
  "services",
  "portfolio",
  "blog",
  "clients",
  "settings",
];

const tabs: Array<{ id: Tab; label: DictKey; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "admin_dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "admin_bookings", icon: CalendarCheck },
  { id: "services", label: "admin_services", icon: ChevronRight },
  { id: "portfolio", label: "admin_portfolio", icon: Images },
  { id: "blog", label: "admin_blog", icon: Newspaper },
  { id: "clients", label: "admin_clients_title", icon: Users },
  { id: "settings", label: "admin_settings", icon: Settings },
];

function isTab(value: string | null): value is Tab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

/**
 * `g` then a key jumps between tabs (Linear/GitHub-style chord, same targets
 * as the sidebar). One flat letter per tab — the first letters are unique, so
 * the chord can never be ambiguous.
 */
const TAB_CHORDS: Record<string, Tab> = {
  d: "dashboard",
  b: "bookings",
  s: "services",
  p: "portfolio",
  l: "blog",
  c: "clients",
  t: "settings",
};

/** How long a lone `g` stays armed before it disarms itself. */
const CHORD_TIMEOUT_MS = 1000;

/**
 * Typing protection: a chord must never eat a keystroke aimed at a field. For
 * `keydown` the target IS the focused element, so one check covers every
 * field on the page — including the ones inside an open dialog.
 */
function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || typeof node.tagName !== "string") return false;
  return (
    node.tagName === "INPUT" ||
    node.tagName === "TEXTAREA" ||
    node.tagName === "SELECT" ||
    node.isContentEditable
  );
}

/** Prerender-safe shell fallback — useSearchParams suspends on the server. */
function ShellFallback() {
  return (
    <div className="admin-shell">
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="admin-shell">
      <Suspense fallback={<ShellFallback />}>
        <AdminShellInner />
      </Suspense>
    </div>
  );
}

function AdminShellInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, ready } = useAdminAuth();
  // ⌘K palette visibility — the trigger button and the palette's own global
  // ⌘K/Ctrl+K listener both flip this.
  const [searchOpen, setSearchOpen] = useState(false);

  // Tab lives in the URL (?tab=) — back/forward & shared links work (spec §4.2).
  // Invalid values fall back to the dashboard so a hand-typed ?tab= never 404s.
  const rawTab = searchParams.get("tab");
  const tab: Tab = isTab(rawTab) ? rawTab : "dashboard";

  // Topbar breadcrumb label for the active tab (spec §4.1 topbar deviation).
  const activeTab = tabs.find((tb) => tb.id === tab) ?? tabs[0];
  // Locale-aware date for the topbar ("Today, 24 Sep 2026") — Intl via lib/format.ts.
  const todayLabel = formatDate(new Date().toISOString(), locale);

  // Tab switch = router.replace, preserving other params (?status=/?q= on bookings).
  // Both booking filters are dropped when leaving bookings so dead filters never survive.
  const navigateTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next !== "bookings") {
        params.delete("status");
        params.delete("q");
        params.delete("open");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Logout is cheap and reversible — no confirm (spec §4.2).
  // The bare "/" is a 308 to /en now (src/proxy.ts), which would cost a
  // redirect hop and show EN even to a Kinyarwanda-preferring admin — so send
  // them straight to the localized home in their own language.
  const logout = useCallback(() => {
    clearToken();
    router.replace(localizedPath(locale, "/"));
  }, [locale, router]);

  // `g` + key → tab jump. Registered at the shell level (like the palette's own
  // ⌘K listener) so the chord works from every admin tab, and it reuses
  // `navigateTab` — same URL contract as the sidebar buttons.
  // Guarded: no modifier chords (⌘R, ⌘P, …), no shortcuts while the ⌘K palette
  // or any aria-modal dialog owns the keyboard, and no shortcuts while typing
  // in a field. The armed-`g` state lives in a ref (no re-render) and self-
  // clears after a second, so a stray `g` can never hijack a later keystroke.
  const chordArmedRef = useRef(false);
  const chordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;

    const disarm = () => {
      chordArmedRef.current = false;
      if (chordTimerRef.current !== null) {
        window.clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      // The palette and any AdminDialog are modal — they own the keyboard.
      if (searchOpen) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      if (key === "g") {
        disarm();
        chordArmedRef.current = true;
        chordTimerRef.current = window.setTimeout(disarm, CHORD_TIMEOUT_MS);
        return;
      }
      if (!chordArmedRef.current) return;
      const next = TAB_CHORDS[key];
      disarm();
      if (!next || next === tab) return;
      e.preventDefault();
      navigateTab(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (chordTimerRef.current !== null) window.clearTimeout(chordTimerRef.current);
    };
  }, [navigateTab, searchOpen, tab, token]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-40 text-center">
        <h1 className="font-serif text-2xl font-semibold text-admin-text">{t("admin_area")}</h1>
        <p className="mt-3 text-sm text-admin-muted">{t("admin_area_sub")}</p>
        <button
          onClick={() => router.push("/admin/login")}
          className={cx(btnPrimary, btnLg)}
        >
          {t("admin_login")}
        </button>
      </div>
    );
  }

  return (
    <div className={shellMain}>
      <div className="flex flex-col gap-8 md:flex-row md:gap-8">
        {/* Desktop sidebar — hidden below md (spec §4.1) */}
        <aside className={sidebar} aria-label={t("admin_nav_aria")}>
          <p className={sidebarBrand}>{BRAND}</p>
          <nav className="flex flex-col gap-0.5">
            {tabs.map((tb) => {
              const Icon = tb.icon;
              const active = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => navigateTab(tb.id)}
                  className={active ? sideLinkActive : sideLinkInactive}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={sideLinkIcon} />
                  {t(tb.label)}
                </button>
              );
            })}
          </nav>
          <button onClick={logout} className={cx(sideLinkDanger, "mt-auto")}>
            <LogOut className={sideLinkIcon} />
            {t("admin_logout")}
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Sticky topbar — starts the main column, above the mobile pill nav
              and tab content. Search opens the ⌘K palette, the bell is the live
              AdminNotifications dropdown; the account chip is still static. */}
          <header className={topbar}>
            <div className={topbarInner}>
              <p className={topbarBreadcrumb}>
                <span className={topbarBrandLabel}>{BRAND}</span>
                <ChevronRight className={topbarSeparator} aria-hidden="true" />
                <span className={topbarTabLabel}>{t(activeTab.label)}</span>
                <span className={topbarDate}>
                  {t("admin_topbar_date").replace("{date}", todayLabel)}
                </span>
              </p>

              <div className={topbarActions}>
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={cx(topbarSearchTrigger, "min-w-0 flex-1 sm:w-52 sm:flex-none")}
                  aria-label={t("admin_search_aria")}
                  aria-expanded={searchOpen}
                  aria-controls={SEARCH_PANEL_ID}
                  aria-haspopup="dialog"
                >
                  <Search className={topbarIcon} />
                  <span className="hidden truncate sm:inline">{t("admin_search_placeholder")}</span>
                  <kbd className={topbarKbd}>⌘K</kbd>
                </button>
                <AdminNotifications token={token} />
                <span role="img" aria-label={t("admin_account_chip_aria")} className={accountChip}>
                  A
                </span>
              </div>
            </div>
          </header>

          {/* ⌘K palette — mounted once for the whole shell; it owns its global
              ⌘K/Ctrl+K listener and renders nothing while closed. */}
          <AdminSearchPalette token={token} open={searchOpen} onOpenChange={setSearchOpen} />

          {/* Mobile nav — snap-scrolling pill row, never wraps (spec §4.3) */}
          <nav className={mobileNav} aria-label={t("admin_nav_aria")}>
            {tabs.map((tb) => {
              const Icon = tb.icon;
              const active = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => navigateTab(tb.id)}
                  className={cx(active ? filterChipActive : filterChipInactive, "shrink-0")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(tb.label)}
                </button>
              );
            })}
            <span className="mx-1 h-5 w-px shrink-0 bg-admin-line" aria-hidden="true" />
            <button
              onClick={logout}
              className={cx(filterChipInactive, "shrink-0 hover:text-admin-danger")}
              aria-label={t("admin_logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </nav>

          {/* Toast host: mounted once for the whole shell, wrapping the tab
              content so any tab can announce an outcome with `useToast()`.
              Its host is `fixed` at z-[60] — ABOVE dialogs (z-50), so a toast
              raised from inside an open dialog stays visible. */}
          <ToastProvider>
            <div className="mt-6 md:mt-0">
              {tab === "dashboard" && <AdminDashboard token={token} onOpenBookings={() => navigateTab("bookings")} />}
              {tab === "bookings" && <AdminBookings token={token} />}
              {tab === "services" && <AdminServices token={token} />}
              {tab === "portfolio" && <AdminPortfolio token={token} />}
              {tab === "blog" && <AdminBlog token={token} />}
              {tab === "clients" && <AdminClients token={token} />}
              {tab === "settings" && <AdminSettings token={token} />}
            </div>
          </ToastProvider>
        </div>
      </div>
    </div>
  );
}

