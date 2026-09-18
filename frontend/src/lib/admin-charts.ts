/**
 * Shared admin-dashboard chart formatters.
 *
 * PURE module — no JSX, no React, no "use client". Importable from both the
 * lazy chart chunk (frontend/src/components/admin/DashboardCharts.tsx) and the
 * Playwright specs (frontend/e2e/**) so tests assert the EXACT rendered tick
 * labels instead of the untruncated API strings.
 */

/** Keep long service names from pushing the horizontal bar axis off-card. */
export const truncateServiceName = (name: string): string =>
  name.length > 22 ? `${name.slice(0, 22)}…` : name;