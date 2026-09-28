"use client";

import { RefreshCw } from "lucide-react";
import { useAdminFetch } from "@/lib/admin";
import type { AdminHealth } from "@/lib/api";
import { formatUptime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  cx,
  healthDot,
  healthDotDanger,
  healthLead,
  healthLeadDanger,
  healthMetric,
  healthMetricAlert,
  healthSep,
  healthStrip,
  healthStripDanger,
  iconBtnGhost,
} from "@/lib/ui";

/**
 * Dashboard system-health strip (Tier-1) — a slim band between the attention
 * panel and the stat grid.
 *
 * Owns its OWN `useAdminFetch("/admin/health")` (a second, independent request
 * — exactly like `AdminAttention` does for notifications) so the dashboard
 * payload contract stays untouched: uptime and the 24h notification-failure
 * count are never folded into `DashboardStats`.
 *
 * Rendering rules:
 *  - nothing while the probe is in flight (no skeleton, no layout jump on the
 *    happy path) — it appears the moment it has something honest to say;
 *  - `GET /admin/health` answers 503 `{ error: "DB_DOWN" }` when Postgres is
 *    unreachable, and a 200 can still carry a non-"ok" `db`/`status`: both land
 *    in the same danger state, WITH a retry affordance (a 40px icon button, so
 *    the strip never grows an undersized tap target);
 *  - a non-zero `failedSends24h` keeps the healthy tone but escalates that one
 *    metric to the warning hue — the strip never shouts when nothing is wrong.
 */
export function AdminHealthStrip({ token }: { token: string }) {
  const { t } = useI18n();
  const { data, error, reload } = useAdminFetch<AdminHealth>("/admin/health", token);

  // Silent while loading; the danger state below still speaks for itself when
  // the whole dashboard payload failed.
  if (!data && !error) return null;

  const dbDown = Boolean(error) || data?.db !== "ok" || data?.status !== "ok";
  const failed = data?.failedSends24h ?? 0;

  return (
    <section
      aria-label={t("admin_health_aria")}
      className={cx(dbDown ? healthStripDanger : healthStrip, "mt-6")}
    >
      <span className={dbDown ? healthDotDanger : healthDot} aria-hidden="true" />
      {dbDown ? (
        <p className={healthLeadDanger}>{t("admin_health_db_down")}</p>
      ) : (
        <>
          <p className={healthLead}>{t("admin_health_ok")}</p>
          <span className={healthSep} aria-hidden="true">
            ·
          </span>
          <p className={healthMetric}>{t("admin_health_db_ok")}</p>
          <span className={healthSep} aria-hidden="true">
            ·
          </span>
          <p className={cx(healthMetric, failed > 0 && healthMetricAlert)}>
            {t("admin_health_failed_sends").replace("{n}", String(failed))}
          </p>
          <span className={healthSep} aria-hidden="true">
            ·
          </span>
          <p className={healthMetric}>
            {t("admin_health_uptime").replace("{n}", formatUptime(data?.uptimeSeconds ?? 0))}
          </p>
        </>
      )}
      {dbDown && (
        <button
          type="button"
          className={cx(iconBtnGhost, "-mr-1.5 ml-auto")}
          onClick={reload}
          aria-label={t("admin_retry")}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
