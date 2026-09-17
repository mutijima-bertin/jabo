"use client";

/**
 * Lazy-loaded chart region for the admin dashboard (phase 7B).
 *
 * DELIBERATELY the ONLY module in the app that imports recharts: it is mounted
 * from AdminDashboard via next/dynamic({ ssr: false }) so the ~400KB chart
 * bundle never ships to the public site or admin login. Everything the charts
 * need arrives via props ({stats, bookingsByDay, topServices}) — no fetching
 * here, never re-renders on refresh independently.
 *
 * Design language mirrors `cardCls` cards (admin dark theme). All colors are
 * the design tokens' hex values (globals.css): brass #b08d57 / brass-light
 * #c9a86f / admin-muted #a49a8d / admin-border #26211b / …  — hardcoded here
 * because recharts SVG fills take raw colors, not Tailwind classes.
 *
 * Empty-data contract: a flat chart is NEVER drawn over zero/NaN series.
 *   - bookingsByDay all-zero (or non-finite)  → "No bookings yet" empty state
 *   - status donut all-zero / no statuses     → "No bookings yet" empty state
 *   - topServices empty                       → small muted "No bookings yet"
 */

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Inbox } from "lucide-react";
import { STATUS_ORDER, statusKey, useI18n } from "@/lib/i18n";
import type { DashboardStats } from "@/lib/api";
import { cardCls, cardHeaderTitle, cx, emptyStateIcon, emptyStateIconWrap, emptyStateTitle } from "@/lib/ui";

// ---------------------------------------------------------------------------
// Brand tokens (globals.css) as raw hex for SVG fills/strokes
// ---------------------------------------------------------------------------
const BRASS = "#b08d57"; // --brass / --accent
const BRASS_LIGHT = "#c9a86f"; // --brass-light
const ADMIN_PANEL = "#161310"; // --admin-panel (donut stroke, card bg)
const ADMIN_TEXT = "#f2ede3"; // --admin-text (tooltip text)
const ADMIN_MUTED = "#a49a8d"; // --admin-muted (axis ticks, subtext)
const ADMIN_BORDER = "#26211b"; // --admin-border (grid lines)
const SUCCESS = "#34d399"; // --admin-success
const WARNING = "#fbbf24"; // --admin-warning
const DANGER = "#f87171"; // --admin-danger
const GREEN = "#3f5a46"; // --green (brand deep green)

/** Six distinct on-brand hues, ordered by STATUS_ORDER (donut slices). */
const STATUS_CHART_COLORS: Record<string, string> = {
  PENDING: WARNING,
  CONFIRMED: BRASS_LIGHT,
  IN_PRODUCTION: BRASS,
  DELIVERED: SUCCESS,
  COMPLETED: GREEN,
  CANCELLED: DANGER,
};

// Backend stats keys ↔ booking statuses (mirrors AdminDashboard's mapping;
// duplicated here so the lazy chunk never imports the parent module).
const STATUS_STAT_KEY: Record<string, keyof DashboardStats["stats"]> = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PRODUCTION: "inProduction",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// ---------------------------------------------------------------------------
// Chart styling helpers
// ---------------------------------------------------------------------------
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: `1px solid ${ADMIN_BORDER}`,
  background: ADMIN_PANEL,
  color: ADMIN_TEXT,
  fontSize: 12,
} as const;

/** "2026-09-17" → "Sep 17" (local time, avoids UTC off-by-one). */
const monthDay = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Keep long service names from pushing the horizontal bar axis off-card. */
const truncateServiceName = (name: string): string => (name.length > 22 ? `${name.slice(0, 22)}…` : name);

/** Guard: an array of {count} rows with every value finite (never chart NaN). */
const allFinite = (rows: Array<{ count: number }>): boolean =>
  Array.isArray(rows) && rows.length > 0 && rows.every((r) => Number.isFinite(r.count));

interface DashboardChartsProps {
  stats: DashboardStats["stats"];
  bookingsByDay: DashboardStats["bookingsByDay"];
  topServices: DashboardStats["topServices"];
}

export default function DashboardCharts({ stats, bookingsByDay, topServices }: DashboardChartsProps) {
  const { t } = useI18n();

  // -------------------------------------------------------------------------
  // Derived, sanitized series (empty states replace flat charts — see header)
  // -------------------------------------------------------------------------
  const hasDayData = allFinite(bookingsByDay) && bookingsByDay.some((d) => d.count > 0);

  const donutData = STATUS_ORDER.map((status) => ({
    status,
    label: t(statusKey(status)),
    value: stats[STATUS_STAT_KEY[status]],
    fill: STATUS_CHART_COLORS[status],
  })).filter((d) => Number.isFinite(d.value));
  const donutHasData = donutData.length > 0 && donutData.some((d) => d.value > 0);

  const barData = Array.isArray(topServices)
    ? topServices.filter((s) => s && typeof s.nameEn === "string" && Number.isFinite(s.count))
    : [];
  const barHasData = barData.length > 0;

  const emptyBlock = (hint: string) => (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
      <div className={emptyStateIconWrap}>
        <Inbox className={emptyStateIcon} />
      </div>
      <p className={emptyStateTitle}>No bookings yet</p>
      <p className="max-w-sm text-sm text-admin-muted">{hint}</p>
    </div>
  );

  return (
    <>
      {/* ---- Bookings — last 14 days (area) ---- */}
      <section className={cx(cardCls, "p-5")} aria-labelledby="dash-chart-area-title">
        <h2 id="dash-chart-area-title" className={cardHeaderTitle}>
          Bookings — last 14 days
        </h2>
        <p className="mt-1 text-xs text-admin-muted">New bookings per day, oldest to newest.</p>
        {hasDayData ? (
          <div className="mt-4" role="img" aria-label="Area chart, new bookings per day over the last 14 days">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={bookingsByDay}
                title="Area chart: bookings per day over the last 14 days"
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dash-area-brass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRASS} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={BRASS} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={ADMIN_BORDER} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={monthDay}
                  tick={{ fill: ADMIN_MUTED, fontSize: 11 }}
                  stroke={ADMIN_BORDER}
                  tickLine={false}
                  axisLine={{ stroke: ADMIN_BORDER }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  width={36}
                  tick={{ fill: ADMIN_MUTED, fontSize: 11 }}
                  stroke={ADMIN_BORDER}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: ADMIN_TEXT }}
                  formatter={(value) => [String(value), "Bookings"]}
                  labelFormatter={(label) => monthDay(String(label))}
                  cursor={{ stroke: BRASS, strokeDasharray: "4 4" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={BRASS_LIGHT}
                  strokeWidth={2}
                  fill="url(#dash-area-brass)"
                  name="Bookings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          emptyBlock("New bookings in the last 14 days will appear here.")
        )}
      </section>

      {/* ---- Bookings by status (donut) ---- */}
      <section className={cx(cardCls, "p-5")} aria-labelledby="dash-chart-donut-title">
        <h2 id="dash-chart-donut-title" className={cardHeaderTitle}>
          Bookings by status
        </h2>
        <p className="mt-1 text-xs text-admin-muted">Current bookings across all statuses.</p>
        {donutHasData ? (
          <>
            <div className="mt-4" role="img" aria-label="Donut chart, bookings by status">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart title="Donut chart: bookings by status">
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={66}
                    outerRadius={100}
                    paddingAngle={2}
                    cornerRadius={3}
                    stroke={ADMIN_PANEL}
                    strokeWidth={2}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.status} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: ADMIN_TEXT }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-admin-muted" aria-label="Legend: bookings by status">
              {donutData.map((d) => (
                <li key={d.status} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.fill }} aria-hidden="true" />
                  <span className="font-semibold text-admin-text">{d.value}</span>
                  <span>{d.label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          emptyBlock("Bookings will be broken down by status here.")
        )}
      </section>

      {/* ---- Top services (horizontal bars) ---- */}
      <section className={cx(cardCls, "p-5")} aria-labelledby="dash-chart-bars-title">
        <h2 id="dash-chart-bars-title" className={cardHeaderTitle}>
          Top services
        </h2>
        <p className="mt-1 text-xs text-admin-muted">Most-booked services, all time.</p>
        {barHasData ? (
          <div className="mt-4" role="img" aria-label="Horizontal bar chart, top services by bookings">
            <ResponsiveContainer width="100%" height={Math.min(40 * barData.length, 260)}>
              <BarChart
                data={barData}
                layout="vertical"
                title="Bar chart: top services by bookings"
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid stroke={ADMIN_BORDER} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: ADMIN_MUTED, fontSize: 11 }}
                  stroke={ADMIN_BORDER}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nameEn"
                  width={180}
                  tickFormatter={truncateServiceName}
                  tick={{ fill: ADMIN_MUTED, fontSize: 11 }}
                  stroke={ADMIN_BORDER}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: ADMIN_TEXT }}
                  formatter={(value) => [String(value), "Bookings"]}
                  cursor={{ fill: BRASS, fillOpacity: 0.08 }}
                />
                <Bar dataKey="count" fill={BRASS} radius={[4, 4, 0, 0]} barSize={14} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-6 text-sm text-admin-muted">No bookings yet</p>
        )}
      </section>
    </>
  );
}