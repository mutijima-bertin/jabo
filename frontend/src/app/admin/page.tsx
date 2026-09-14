"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  Images,
  LayoutDashboard,
  Loader2,
  LogOut,
  Newspaper,
  Settings,
  Users,
} from "lucide-react";
import { BRAND } from "@/lib/constants";
import { clearToken, useAdminAuth } from "@/lib/admin";
import { useI18n, type DictKey } from "@/lib/i18n";
import {
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
} from "@/lib/ui";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminBookings } from "@/components/admin/AdminBookings";
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
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token, ready } = useAdminAuth();

  // Tab lives in the URL (?tab=) — back/forward & shared links work (spec §4.2).
  // Invalid values fall back to the dashboard so a hand-typed ?tab= never 404s.
  const rawTab = searchParams.get("tab");
  const tab: Tab = isTab(rawTab) ? rawTab : "dashboard";

  // Tab switch = router.replace, preserving other params (?status= on bookings).
  // `status` is dropped when leaving bookings so dead filters never survive.
  const navigateTab = useCallback(
    (next: Tab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      if (next !== "bookings") params.delete("status");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Logout is cheap and reversible — no confirm (spec §4.2).
  const logout = useCallback(() => {
    clearToken();
    router.replace("/");
  }, [router]);

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

          <div className="mt-6 md:mt-0">
            {tab === "dashboard" && <AdminDashboard token={token} onOpenBookings={() => navigateTab("bookings")} />}
            {tab === "bookings" && <AdminBookings token={token} />}
            {tab === "services" && <AdminServices token={token} />}
            {tab === "portfolio" && <AdminPortfolio token={token} />}
            {tab === "blog" && <AdminBlog token={token} />}
            {tab === "clients" && <AdminClients token={token} />}
            {tab === "settings" && <AdminSettings token={token} />}
          </div>
        </div>
      </div>
    </div>
  );
}

