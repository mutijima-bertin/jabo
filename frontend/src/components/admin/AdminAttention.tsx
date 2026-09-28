"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAdminFetch } from "@/lib/admin";
import type { AdminNotifItem, AdminNotifResponse } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import {
  attentionPanel,
  attentionRow,
  cardHeaderTitle,
  countBadgeBrass,
  countBadgeDanger,
  countBadgeMuted,
  countBadgeSuccess,
  countBadgeWarning,
  cx,
  notifDot,
} from "@/lib/ui";
import { formatDate } from "@/lib/format";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Four high-priority unread types; STATUS_CHANGED only surfaces when alone. */
const PRIORITY_TYPES: readonly AdminNotifItem["type"][] = [
  "NEW_BOOKING",
  "NEW_CONTACT_MESSAGE",
  "SEND_FAILED",
  "TESTIMONIAL_SUBMITTED",
];

const LABELS: Record<AdminNotifItem["type"], DictKey> = {
  NEW_BOOKING: "attention_new_bookings",
  NEW_CONTACT_MESSAGE: "attention_contact_messages",
  SEND_FAILED: "attention_failed_sends",
  TESTIMONIAL_SUBMITTED: "attention_testimonials",
  STATUS_CHANGED: "attention_status_changes",
};

/** Count-badge style per category (failed sends → warning, new bookings → brass …). */
const COUNT_BADGES: Record<AdminNotifItem["type"], string> = {
  NEW_BOOKING: countBadgeBrass,
  NEW_CONTACT_MESSAGE: countBadgeWarning,
  SEND_FAILED: countBadgeDanger,
  TESTIMONIAL_SUBMITTED: countBadgeSuccess,
  STATUS_CHANGED: countBadgeMuted,
};

function oldestUnread(items: AdminNotifItem[]): AdminNotifItem {
  return items.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
}

/**
 * Dashboard attention queue — Tier-1 "Needs your attention" block.
 *
 * Consumes the SAME notifications endpoint as the bell (a second independent
 * `useAdminFetch` is intentional — the dashboard payload contract stays
 * untouched). Renders NOTHING when there is nothing unread, so an empty
 * dashboard never shouts. Grouped summary rows drive deep-links into the
 * matching admin tab via each group's first `linkHref`.
 */
export function AdminAttention({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useAdminFetch<AdminNotifResponse>("/admin/notifications?limit=30", token);

  // Group unread items into summary rows — CONTACT_MESSAGES is 24h-scoped;
  // STATUS_CHANGED collapses to a single row ONLY when nothing else is unread.
  const rows = useMemo(() => {
    if (!data) return [];
    const unread = data.items.filter((i) => !i.readAt);
    const byType = (type: AdminNotifItem["type"]) => unread.filter((i) => i.type === type);
    const contacts24h = byType("NEW_CONTACT_MESSAGE").filter(
      (i) => new Date().getTime() - new Date(i.createdAt).getTime() <= TWENTY_FOUR_HOURS_MS,
    );
    const priority = PRIORITY_TYPES.filter((type) => {
      const items = type === "NEW_CONTACT_MESSAGE" ? contacts24h : byType(type);
      return items.length > 0;
    });
    const types: readonly AdminNotifItem["type"][] =
      priority.length > 0 ? priority : byType("STATUS_CHANGED").length > 0 ? ["STATUS_CHANGED"] : [];
    return types.map((type) => ({
      type,
      items: type === "NEW_CONTACT_MESSAGE" ? contacts24h : byType(type),
    }));
  }, [data]);

  if (!data || data.unreadCount === 0 || rows.length === 0) return null;

  return (
    <section aria-labelledby="admin-attention-title" className={cx(attentionPanel, "mt-6 p-5")}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="admin-attention-title" className={cardHeaderTitle}>
          {t("attention_title")}
        </h2>
        <span className={countBadgeBrass} aria-label={`${t("attention_title")}: ${data.unreadCount}`}>
          {data.unreadCount}
        </span>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {rows.map(({ type, items }) => {
          const href = items.find((i) => i.linkHref)?.linkHref ?? null;
          // Shared count + label. The "Open →" CTA is deliberately NOT part of
          // this fragment: it is rendered only inside the `href` branch below,
          // because a row without a target degrades to a static <div> and must
          // never advertise a destination it cannot take you to.
          const content = (
            <>
              <span className={COUNT_BADGES[type]}>{items.length}</span>
              <span className="flex items-center gap-2 text-sm font-medium text-admin-text">
                <span className={notifDot(type)} aria-hidden="true" />
                {t(LABELS[type])}
              </span>
              {type === "NEW_BOOKING" && (
                <span className="text-xs text-admin-faint">
                  {t("attention_oldest").replace("{date}", formatDate(oldestUnread(items).createdAt, locale) || "—")}
                </span>
              )}
            </>
          );
          const cta = (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brass-light">
              {t("attention_open")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          );
          // With a target the WHOLE row is the trigger (touch + keyboard safe);
          // without one it degrades to an honest static summary of the count.
          return href ? (
            <button key={type} type="button" className={attentionRow} onClick={() => router.replace(pathname + href)}>
              {content}
              {cta}
            </button>
          ) : (
            <div key={type} className={attentionRow}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}