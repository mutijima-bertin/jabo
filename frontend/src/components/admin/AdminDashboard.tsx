"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Inbox, Loader2, RefreshCw } from "lucide-react";
import { useAdminFetch } from "@/lib/admin";
import type { DashboardStats } from "@/lib/api";
import { STATUS_ORDER, statusKey, useI18n } from "@/lib/i18n";
import {
  badgeMuted,
  btnGhost,
  btnSecondary,
  cardCls,
  cardFooter,
  cardHeader,
  cardHeaderTitle,
  cx,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  iconBtnSecondary,
  linkCls,
  loadingState,
  pageHeader,
  pageSub,
  pageTitle,
  skeletonCard,
  skeletonRows,
  statCardClickable,
  statLabel,
  statValue,
  statusPill,
  table,
  tableScrollWrap,
  tbody,
  tbodyRow,
  tdCls,
  thCls,
  theadRow,
} from "@/lib/ui";
import { formatDate } from "@/lib/format";

// Backend stats keys ↔ booking statuses (labels via statusKey/STATUS_ORDER).
const STATUS_STAT_KEY: Record<string, keyof DashboardStats["stats"]> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PRODUCTION: "inProduction",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export function AdminDashboard({ token, onOpenBookings }: { token: string; onOpenBookings: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { data, error, reload } = useAdminFetch<DashboardStats>("/admin/dashboard", token);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState(false);

  const navigate = (query: string) => router.replace(`${pathname}?${query}`);

  const handleRefresh = async () => {
    // Only announce "Updated just now" when the payload actually reloaded —
    // on error the banner speaks for itself. No timers (QA #9).
    setRefreshing(true);
    setUpdated(false);
    try {
      const ok = await reload();
      if (ok) setUpdated(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>{t("admin_dashboard")}</h1>
          <p className={pageSub}>{t("admin_dash_sub")}</p>
        </div>
        <button
          className={iconBtnSecondary}
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={t("admin_dash_refresh")}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
        <span className="sr-only" aria-live="polite">
          {updated ? t("admin_dash_updated") : ""}
        </span>
      </div>

      {error ? (
        <div className="mt-6">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
            <button className={btnSecondary} onClick={reload}>
              {t("admin_retry")}
            </button>
          </div>
        </div>
      ) : !data ? (
        <div className={loadingState}>
          {skeletonRows(6).map((cls, i) => (
            <div key={i} className={cls} />
          ))}
          <div className={skeletonCard} />
        </div>
      ) : data.stats.total === 0 && data.recent.length === 0 ? (
        <div className={emptyState}>
          <div className={emptyStateIconWrap}>
            <Inbox className={emptyStateIcon} />
          </div>
          <p className={emptyStateTitle}>{t("admin_dash_empty")}</p>
        </div>
      ) : (
        <>
          {/* Stat cards — each is a real button deep-linking to the matching tab (spec §5.2) */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <button
              type="button"
              className={statCardClickable}
              onClick={() => navigate("tab=bookings")}
              aria-label={`${t("admin_dash_stat_total")}: ${data.stats.total}`}
            >
              <p className={statValue}>{data.stats.total}</p>
              <p className={statLabel}>{t("admin_dash_stat_total")}</p>
            </button>
            <button
              type="button"
              className={statCardClickable}
              onClick={() => navigate("tab=clients")}
              aria-label={`${t("admin_dash_stat_clients")}: ${data.stats.clients}`}
            >
              <p className={statValue}>{data.stats.clients}</p>
              <p className={statLabel}>{t("admin_dash_stat_clients")}</p>
            </button>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                className={statCardClickable}
                onClick={() => navigate(`tab=bookings&status=${status}`)}
                aria-label={`${t(statusKey(status))}: ${data.stats[STATUS_STAT_KEY[status]]}`}
              >
                <p className={statValue}>{data.stats[STATUS_STAT_KEY[status]]}</p>
                <p className={statLabel}>{t(statusKey(status))}</p>
              </button>
            ))}
          </div>

          {/* Recent bookings (spec §5.3) */}
          <div className={cx(cardCls, "mt-8")}>
            <div className={cardHeader}>
              <h2 className={cardHeaderTitle}>{t("admin_dash_recent")}</h2>
              <span className={badgeMuted}>{data.recent.length}</span>
            </div>
            <div className={tableScrollWrap}>
              <table className={table}>
                <thead className={theadRow}>
                  <tr>
                    <th scope="col" className={thCls}>
                      {t("admin_bookings_col_ref")}
                    </th>
                    <th scope="col" className={thCls}>
                      {t("admin_bookings_col_service")}
                    </th>
                    <th scope="col" className={thCls}>
                      {t("admin_bookings_col_status")}
                    </th>
                    <th scope="col" className={thCls}>
                      {t("admin_bookings_col_created")}
                    </th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {data.recent.map((b) => (
                    <tr key={b.id} onClick={onOpenBookings} className={cx(tbodyRow, "cursor-pointer")}>
                      <td className={tdCls}>
                        <button
                          type="button"
                          className={linkCls}
                          onClick={onOpenBookings}
                          aria-label={`${t("admin_bookings_open")} ${b.reference}`}
                        >
                          {b.reference}
                        </button>
                      </td>
                      <td className={tdCls}>{b.service?.nameEn ?? "—"}</td>
                      <td className={tdCls}>
                        <span className={statusPill(b.status)}>{t(statusKey(b.status))}</span>
                      </td>
                      <td className={tdCls}>{formatDate(b.createdAt, locale) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={cardFooter}>
              <button className={btnGhost} onClick={onOpenBookings}>
                {t("admin_dash_view_all")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
