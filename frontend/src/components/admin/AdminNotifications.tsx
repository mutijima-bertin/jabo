"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Bell, CalendarPlus, CheckCheck, Loader2, Mail, RefreshCw, Star } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { AdminNotifItem, AdminNotifResponse } from "@/lib/api";
import { statusKey, useI18n, type DictKey } from "@/lib/i18n";
import {
  bellBadgeCount,
  bellBadgeDot,
  btnGhost,
  cardFooter,
  cardHeader,
  cardHeaderTitle,
  countBadgeMuted,
  cx,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  iconBtnGhost,
  loadingStateCompact,
  notifIcon,
  notifIconWrap,
  notifItem,
  notifItemTitle,
  notifItemTitleUnread,
  notifItemUnread,
  notifPanel,
  notifUnreadDot,
  skeletonRows,
  timelineMeta,
  topbarIcon,
  tbody,
} from "@/lib/ui";
import { formatDate } from "@/lib/format";

/** Background re-poll interval for the bell badge (paused while the dropdown is open). */
const POLL_MS = 30_000;

/** Per-type Lucide icon for the dropdown rows. */
const NOTIF_ICONS: Record<string, typeof Bell> = {
  NEW_BOOKING: CalendarPlus,
  STATUS_CHANGED: RefreshCw,
  NEW_CONTACT_MESSAGE: Mail,
  TESTIMONIAL_SUBMITTED: Star,
  SEND_FAILED: AlertTriangle,
};

/** One-line row title: `type` + `payload` interpolation (`.replace("{key}", …)`). */
function notifTitle(item: AdminNotifItem, t: (k: DictKey) => string): string {
  const p = item.payload ?? {};
  switch (item.type) {
    case "NEW_BOOKING":
      return t("notif_new_booking").replace("{reference}", p.reference ?? "—");
    case "STATUS_CHANGED":
      return t("notif_status_changed")
        .replace("{reference}", p.reference ?? "—")
        .replace("{to}", p.to ? t(statusKey(p.to)) : "—");
    case "NEW_CONTACT_MESSAGE":
      return t("notif_new_contact").replace("{name}", p.name ?? "—");
    case "TESTIMONIAL_SUBMITTED":
      return p.author ? t("notif_testimonial").replace("{author}", p.author) : t("notif_testimonial_generic");
    case "SEND_FAILED":
      return t("notif_send_failed").replace("{recipient}", p.recipient ?? "—");
    default:
      return t("notif_panel_title");
  }
}

/**
 * Topbar notification bell — Tier-1 admin notifications.
 *
 * Data: `useAdminFetch("/admin/notifications?limit=30")` re-polled every 30s
 * (interval cleared on unmount, paused while the dropdown is open), and
 * `reload()` after every mark-read so the badge stays honest.
 *
 * A11y: a simple popover, not a dialog — no focus trap, but focus DOES move
 * into the panel on open, ESC closes and restores focus to the trigger,
 * outside click closes, rows are real <button>s (spec §10.1/§10.5 spirit of §6.3).
 */
export function AdminNotifications({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const guard = useSessionGuard();
  const { data, error, reload } = useAdminFetch<AdminNotifResponse>(
    "/admin/notifications?limit=30",
    token,
  );

  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Re-poll every 30s — paused while the dropdown is open (the list is already
  // on screen then, and a background re-render mid-interaction would be jarring).
  // Cleared on unmount via effect cleanup.
  useEffect(() => {
    if (open) return;
    const id = setInterval(() => {
      void reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [open, reload]);

  // Outside click closes; ESC closes and restores focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [open]);

  // Move focus into the panel on open (simple popover — no trap needed).
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Newest first (ISO strings compare lexicographically).
  const items = useMemo(
    () => (data ? [...data.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []),
    [data],
  );
  const unreadCount = data?.unreadCount ?? 0;

  /** POST /admin/notifications/read { ids } → reload the bell payload. */
  const markRead = useCallback(
    async (ids: string[]) => {
      try {
        await adminApi.post<{ ok: boolean }>("/admin/notifications/read", token, { ids });
        await reload();
      } catch (e) {
        if ((e as Error).message === "NOT_AUTHENTICATED") guard();
        // Other failures are best-effort — the panel keeps its current state.
      }
    },
    [token, reload, guard],
  );

  /** Footer: mark ALL read → POST {} then reload (contract: empty body = all). */
  const markAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await adminApi.post<{ ok: boolean }>("/admin/notifications/read", token, {});
      await reload();
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") guard();
    } finally {
      setMarkingAll(false);
    }
  }, [token, reload, guard]);

  /** Row click → mark that row read, then follow linkHref (null = just mark read). */
  async function openItem(item: AdminNotifItem) {
    if (!item.readAt) await markRead([item.id]);
    setOpen(false);
    if (item.linkHref) router.replace(pathname + item.linkHref);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        ref={triggerRef}
        className={cx(iconBtnGhost, "relative")}
        aria-label={t("notif_bell_aria").replace("{n}", String(unreadCount))}
        aria-expanded={open}
        aria-controls="admin-notif-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className={topbarIcon} />
        {unreadCount > 0 &&
          (unreadCount <= 9 ? (
            <span className={bellBadgeDot} aria-hidden="true" />
          ) : (
            <span className={bellBadgeCount} aria-hidden="true">
              {unreadCount <= 99 ? unreadCount : "99+"}
            </span>
          ))}
      </button>

      {open && (
        <div
          id="admin-notif-panel"
          ref={panelRef}
          tabIndex={-1}
          role="region"
          aria-label={t("notif_panel_title")}
          className={notifPanel}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <header className={cardHeader}>
            <h2 className={cardHeaderTitle}>{t("notif_panel_title")}</h2>
            {unreadCount > 0 && <span className={countBadgeMuted}>{unreadCount}</span>}
          </header>

          {error ? (
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <p className={cx(notifItemTitle, "min-w-0 flex-1")}>{t("admin_error_load")}</p>
              <button type="button" className={btnGhost} onClick={() => void reload()}>
                {t("admin_retry")}
              </button>
            </div>
          ) : !data ? (
            <div className={cx(loadingStateCompact, "min-h-24")}>
              {skeletonRows(3).map((cls, i) => (
                <div key={i} className={cls} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={emptyState}>
              <div className={emptyStateIconWrap}>
                <CheckCheck className={emptyStateIcon} />
              </div>
              <p className={emptyStateTitle}>{t("notif_empty")}</p>
            </div>
          ) : (
            <ul className={cx(tbody, "max-h-96 overflow-y-auto")}>
              {items.map((item) => {
                const unread = !item.readAt;
                const Icon = NOTIF_ICONS[item.type] ?? Bell;
                const title = notifTitle(item, t);
                const date = formatDate(item.createdAt, locale) || "—";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={unread ? notifItemUnread : notifItem}
                      onClick={() => void openItem(item)}
                      aria-label={unread ? `${t("notif_unread")}: ${title}, ${date}` : `${title}, ${date}`}
                    >
                      <span className={notifIconWrap} aria-hidden="true">
                        <Icon className={notifIcon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={unread ? notifItemTitleUnread : notifItemTitle}>{title}</span>
                        <span className={timelineMeta}>{date}</span>
                      </span>
                      {unread && <span className={notifUnreadDot} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className={cardFooter}>
            <button
              type="button"
              className={btnGhost}
              disabled={markingAll || unreadCount === 0}
              onClick={() => void markAllRead()}
            >
              {markingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("notif_mark_all")}
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
