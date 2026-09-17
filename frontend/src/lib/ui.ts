/**
 * Shared UI class strings — ONE source of truth for the whole kit.
 *
 * Before this file existed, every form hand-typed its own Tailwind recipe:
 * three different input heights, mismatched button scales, no focus-visible
 * trust, low-contrast labels. This module fixes that at the contract level.
 *
 * Two themes, both brand-faithful (see docs/design/admin-interface-spec.md §2):
 *  - `inputCls` / `labelCls`  → cream PUBLIC theme (booking form, client login)
 *  - everything else         → dark ADMIN theme (zinc-950-class surfaces
 *    extended with warm `admin-*` tokens from globals.css, brass accent)
 *
 * Conventions:
 *  - Every constant is composable — join via `cx()`; overrides LAST win
 *    (Tailwind class order does NOT resolve conflicts, but `cx()` keeps the
 *    caller's extension visible and deterministic for the utility scanner).
 *  - Duration is 100–150ms everywhere (`transition duration-150`), never
 *    bouncy. Bulk animation lives in globals.css (`admin-fade/pop/shimmer`).
 *  - Focus rings are GLOBAL (`:focus-visible` in globals.css) — the ring
 *    color switches automatically under `.admin-shell`. Do NOT add per-element
 *    outline-* hacks; use `focusRing` only where a native element needs an
 *    explicit reminder (checkboxes, selects via wrapper).
 *  - Interactive controls use `min-h-10` (40px) MINIMUM touch target
 *    (WCAG 2.2 AAA-friendly; matches the `h-10` input height). `btn`,
 *    `iconBtn*`, `rowAction`, `filterChip`, `pillBase`, `badge`,
 *    `sideLink` all floor at 40px so composed variants can never silently
 *    shrink a tap target.
 *
 * The class list is the SPEC. The JSX structure + states for each admin tab
 * live in docs/design/admin-interface-spec.md §4–§9.
 */

// ---------------------------------------------------------------------------
// Composition helper — deterministic, zero deps
// ---------------------------------------------------------------------------
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Public (cream) theme — booking form, client magic-link login
// ---------------------------------------------------------------------------
export const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-brass";

/**
 * Error variant of `inputCls` — red border ring for invalid fields on the
 * cream theme (booking form, phone input). Written out in full (not composed
 * on top of `inputCls`) because Tailwind class order does NOT resolve border
 * color conflicts — the error state must always win over `border-ink/15`.
 */
export const inputErrorCls =
  "w-full rounded-xl border border-red-400 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-red-500";

/** Inline field error under an input — small red text (cream theme). */
export const fieldErrorText = "mt-1.5 block text-xs text-red-600";

export const textareaCls = cx(inputCls, "min-h-[7rem] leading-relaxed");

export const labelCls = "mb-2 block text-sm font-medium text-ink/70";

// ---------------------------------------------------------------------------
// Public (cream) theme — shared site-card surface & section rhythm
// ---------------------------------------------------------------------------
/**
 * ONE card surface for the public site (portfolio, services, testimonials,
 * blog, contact rows). New cream-theme cards should import this instead of
 * hand-typing rounded/border/bg so surfaces stop drifting.
 */
export const cardSurface = "rounded-2xl border border-ink/10 bg-white/70";

// Standard section rhythm for homepage sections — one spacing, deliberate
// exceptions only (TrustBand/ClientsWall/HomeCta keep their own contrast bands):
//   section spacing    = `py-20 md:py-24`
//   header→content gap = `mb-12` (48px)

// ---------------------------------------------------------------------------
// Admin theme — buttons
// ---------------------------------------------------------------------------
export const btn =
  "inline-flex min-h-10 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50";

export const btnSm = cx(btn, "gap-1.5 px-3 text-xs");
export const btnMd = cx(btn, "h-10 px-4 text-sm");
export const btnLg = cx(btn, "h-11 px-6 text-sm");

/** Filled brass — ONE per viewport. Ink text rides 5.4:1 on brass. */
export const btnPrimary = cx(btnMd, "bg-accent text-ink hover:bg-brass-light");

/** Quiet outline — secondary actions, cancel buttons. */
export const btnSecondary = cx(
  btnMd,
  "border border-admin-line-strong bg-admin-panel text-admin-text hover:border-admin-muted hover:bg-admin-raised",
);

/** Solid destructive — only for confirmed, high-stakes actions. */
export const btnDanger = cx(btnMd, "bg-admin-danger text-ink hover:brightness-95");

/** Borderless destructive text — row-level "Delete" affordances. */
export const btnDangerGhost = cx(btnSm, "text-admin-danger hover:bg-admin-danger/10");

/** Quiet tertiary — "View all", dismiss, utility taps. */
export const btnGhost = cx(btnSm, "text-admin-muted hover:bg-admin-raised hover:text-admin-text");

/** Touch-safe per-row action pill (Edit / Delete / Open): always visible, ≥40px. */
export const rowAction =
  "inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition duration-150 disabled:pointer-events-none disabled:opacity-50";

export const rowActionDefault = cx(rowAction, "border-admin-line-strong text-admin-muted hover:border-admin-muted hover:text-admin-text");
export const rowActionBrass = cx(rowAction, "border-accent/40 text-brass-light hover:border-accent hover:bg-accent/10");
export const rowActionDanger = cx(rowAction, "border-admin-danger/30 text-admin-danger hover:bg-admin-danger/10");

/** Square icon buttons (dialog close, table header filters …) — ≥40px targets. */
export const iconBtn =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg transition duration-150 disabled:pointer-events-none disabled:opacity-50";
export const iconBtnSm = iconBtn;
export const iconBtnMd = iconBtn;
export const iconBtnGhost = cx(iconBtnMd, "text-admin-muted hover:bg-admin-raised hover:text-admin-text");
export const iconBtnSecondary = cx(iconBtnMd, "border border-admin-line-strong bg-admin-panel text-admin-muted hover:text-admin-text");
export const iconBtnDanger = cx(iconBtnMd, "text-admin-danger hover:bg-admin-danger/10");

/** Row-scale ghost icon button — reorder arrows in collection action rows. */
export const iconBtnGhostSm = cx(iconBtnSm, "text-admin-muted hover:bg-admin-raised hover:text-admin-text");

/** Explicit focus-ring reinforcement (native elements that ignore global rings). */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

// ---------------------------------------------------------------------------
// Admin theme — form fields (ONE height everywhere: h-10)
// ---------------------------------------------------------------------------
export const adminFieldLabel = "mb-1.5 block text-xs font-medium text-admin-muted";
export const adminFieldHint = "mt-1.5 block text-xs text-admin-faint";
export const adminFieldError = "mt-1.5 block text-xs text-admin-danger";

export const adminInputCls =
  "h-10 w-full rounded-lg border border-admin-line-strong bg-admin-panel px-3 text-sm text-admin-text transition placeholder:text-admin-faint hover:border-admin-muted focus:border-accent";

export const adminTextareaCls = cx(
  adminInputCls,
  "h-auto min-h-[7rem] py-2.5 leading-relaxed",
);

/** Select adds a chevron wrapper in JSX — see `selectWrap` / `selectChevron`. */
export const adminSelectCls = cx(adminInputCls, "appearance-none pr-9");
export const selectWrap = "relative";
export const selectChevron =
  "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-faint";

/** Native checkbox/toggle — accessible by default (Space toggles). */
export const checkboxCls = "h-4 w-4 shrink-0 rounded accent-accent focus-visible:outline-2 focus-visible:outline-offset-2";

// ---------------------------------------------------------------------------
// Admin theme — cards & page headers
// ---------------------------------------------------------------------------
export const cardCls = "rounded-2xl border border-admin-border bg-admin-panel";
export const cardHover = cx(cardCls, "hover:border-admin-muted/50");
export const cardHeader = "flex flex-wrap items-center justify-between gap-3 border-b border-admin-line px-5 py-4";
export const cardHeaderTitle = "font-serif text-lg text-admin-text";
export const cardBody = "p-5";
export const cardFooter = "flex flex-wrap items-center justify-end gap-2 border-t border-admin-line px-5 py-4";

export const pageHeader = "flex flex-wrap items-end justify-between gap-4";
export const pageTitle = "font-serif text-2xl font-semibold tracking-tight text-admin-text";
export const pageSub = "mt-1 max-w-2xl text-sm text-admin-muted";
export const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-faint";

export const statCard = cx(cardCls, "p-5");
/** Stat card that deep-links (dashboard → bookings/clients tabs). */
export const statCardClickable = cx(statCard, "cursor-pointer transition duration-150 hover:border-accent/50");
export const statValue = "font-serif text-3xl font-semibold text-brass-light";
export const statLabel = "mt-1 text-xs font-medium text-admin-muted";

/** Inline text link (Fraunces-free; body stays sans per brand discipline). */
export const linkCls = "text-sm font-semibold text-brass-light transition-colors hover:text-brass";

/** Portfolio/service card thumbnails. */
export const thumbCls = "aspect-[4/3] w-full object-cover";
export const thumbWide = "aspect-[16/9] w-full object-cover";

// ---------------------------------------------------------------------------
// Admin theme — tables
// ---------------------------------------------------------------------------
export const tableWrap = "overflow-hidden rounded-2xl border border-admin-border bg-admin-base";
export const tableScrollWrap = "overflow-x-auto rounded-2xl border border-admin-border bg-admin-base";
export const table = "w-full text-left text-sm";
export const theadRow = "bg-admin-raised";
export const thCls = "whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-admin-muted";
export const thClsRight = cx(thCls, "text-right");
export const tdCls = "px-4 py-3 align-middle text-admin-text";
export const tdClsRight = cx(tdCls, "text-right");
export const tdMuted = "text-admin-muted";
export const tbody = "divide-y divide-admin-line";
export const tbodyRow = "transition-colors duration-100 hover:bg-admin-raised/60";
export const tableActions = "flex items-center justify-end gap-2";

// ---------------------------------------------------------------------------
// Admin theme — pills & badges
// ---------------------------------------------------------------------------
export const pillBase =
  "inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-medium";

/** The 6 booking statuses → brand-honest hues. Color is never the ONLY signal:
 *  every pill also carries an i18n label. */
export const BOOKING_STATUS_PILLS: Record<string, string> = {
  PENDING: "border-admin-warning/30 bg-admin-warning/10 text-admin-warning",
  CONFIRMED: "border-accent/30 bg-accent/10 text-brass-light",
  IN_PRODUCTION: "border-accent/50 bg-accent/15 text-brass-light",
  DELIVERED: "border-admin-success/30 bg-admin-success/10 text-admin-success",
  COMPLETED: "border-admin-success/50 bg-admin-success/15 text-admin-success",
  CANCELLED: "border-admin-danger/30 bg-admin-danger/10 text-admin-danger",
};

export const STATUS_DOTS: Record<string, string> = {
  PENDING: "bg-admin-warning",
  CONFIRMED: "bg-brass",
  IN_PRODUCTION: "bg-brass-light",
  DELIVERED: "bg-admin-success",
  COMPLETED: "bg-admin-success",
  CANCELLED: "bg-admin-danger",
};

export function statusPill(status: string): string {
  return cx(pillBase, BOOKING_STATUS_PILLS[status] ?? "border-admin-line-strong bg-admin-raised text-admin-muted");
}

export function statusDot(status: string): string {
  return cx("h-2 w-2 shrink-0 rounded-full", STATUS_DOTS[status] ?? "bg-admin-faint");
}

/** Content lifecycle pill — published vs draft (blog, services, portfolio, testimonials). */
export function pubPill(published: boolean): string {
  return published
    ? cx(pillBase, "border-admin-success/30 bg-admin-success/10 text-admin-success")
    : cx(pillBase, "border-admin-line-strong bg-admin-raised text-admin-muted");
}

/** Draft flag that the founder cannot miss (warning brass-adjacent amber). */
export const draftBadge = cx(pillBase, "border-admin-warning/30 bg-admin-warning/10 text-admin-warning");

export const badge =
  "inline-flex min-h-10 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium";
export const badgeBrass = cx(badge, "border border-accent/30 bg-accent/15 text-brass-light");
export const badgeSuccess = cx(badge, "border border-admin-success/30 bg-admin-success/10 text-admin-success");
export const badgeWarning = cx(badge, "border border-admin-warning/30 bg-admin-warning/10 text-admin-warning");
export const badgeDanger = cx(badge, "border border-admin-danger/30 bg-admin-danger/10 text-admin-danger");
export const badgeMuted = cx(badge, "border border-admin-line-strong bg-admin-raised text-admin-muted");

// ---------------------------------------------------------------------------
// Admin theme — feedback banners & inline errors
// ---------------------------------------------------------------------------
/** Render with role="alert" (aria-live=assertive). See spec §4.3 states. */
export const errorBanner =
  "flex items-start gap-3 rounded-xl border border-admin-danger/30 bg-admin-danger/10 px-4 py-3 text-sm text-admin-danger";
export const inlineError = "mt-1.5 block text-xs text-admin-danger";
export const successBanner =
  "flex items-start gap-3 rounded-xl border border-admin-success/30 bg-admin-success/10 px-4 py-3 text-sm text-admin-success";
export const infoBanner =
  "flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-brass-light";

// ---------------------------------------------------------------------------
// Admin theme — empty states & loading skeletons
// ---------------------------------------------------------------------------
export const emptyState = "flex flex-col items-center justify-center gap-2 px-6 py-16 text-center";
export const emptyStateIconWrap = "flex h-12 w-12 items-center justify-center rounded-full bg-admin-raised";
export const emptyStateIcon = "h-6 w-6 text-admin-faint";
export const emptyStateTitle = "font-serif text-lg text-admin-text";
export const emptyStateBody = "max-w-sm text-sm text-admin-muted";

/** Static skeleton block (pulse) — brand-safe under reduced motion. */
export const skeleton = "animate-pulse rounded-md bg-admin-raised";
export const skeletonRow = cx(skeleton, "h-12");
export const skeletonCard = cx(skeleton, "h-40 rounded-2xl");
export const skeletonText = cx(skeleton, "h-3.5");
/** Sweeping shimmer (globals.css `skeleton-shimmer`) — prefer for tables/cards. */
export const shimmer = "skeleton-shimmer rounded-md";
export const shimmerRow = cx(shimmer, "h-12");
export const shimmerText = cx(shimmer, "h-3.5");

/** Convenience: N skeleton table rows for collection screens. */
export function skeletonRows(count = 5): string[] {
  return Array.from({ length: count }, () => shimmerRow);
}

export const loadingState = "flex flex-col gap-3 px-6 py-14";

// ---------------------------------------------------------------------------
// Admin theme — dropzone (drag-and-drop upload)
// ---------------------------------------------------------------------------
export const dropzoneCls =
  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-admin-line-strong bg-admin-panel px-6 py-10 text-center transition duration-150 hover:border-accent/50 hover:bg-admin-raised";
export const dropzoneActive = "border-accent bg-accent/10";
export const dropzoneIcon = "h-8 w-8 text-admin-faint";
export const dropzoneTitle = "text-sm font-medium text-admin-text";
export const dropzoneHint = "text-xs text-admin-faint";

// ---------------------------------------------------------------------------
// Admin theme — filter chips (bookings status, portfolio category)
// ---------------------------------------------------------------------------
export const filterChip =
  "inline-flex min-h-10 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition duration-150";
export const filterChipActive = cx(filterChip, "border-accent bg-accent text-ink hover:bg-brass-light");
export const filterChipInactive = cx(
  filterChip,
  "border-admin-line-strong bg-admin-panel text-admin-muted hover:border-admin-muted hover:text-admin-text",
);
/** Scrollable, snap-scrolling chip row — fixes overflow/clipping on mobile. */
export const filterRow = "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5 snap-x";

// ---------------------------------------------------------------------------
// Admin theme — shell navigation (desktop sidebar + mobile pill row)
// ---------------------------------------------------------------------------
export const sidebar = "hidden w-60 shrink-0 flex-col gap-0.5 md:flex";
export const sidebarBrand = "mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-admin-faint";
export const sideLink =
  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150";
export const sideLinkIcon = "h-4 w-4 shrink-0";
export const sideLinkActive = cx(sideLink, "bg-accent/15 text-brass-light");
export const sideLinkInactive = cx(sideLink, "text-admin-muted hover:bg-admin-raised hover:text-admin-text");
export const sideLinkDanger = cx(sideLink, "text-admin-faint hover:bg-admin-raised hover:text-admin-danger");

/** Mobile nav = the same chip language as filters; snap-scroll, never wraps. */
export const mobileNav = cx(filterRow, "md:hidden");
export const mobilePill = filterChip;

export const shellMain = "mx-auto w-full max-w-7xl px-4 py-8 md:px-8";
export const topbarInset = "mb-6 space-y-4";

// ---------------------------------------------------------------------------
// Admin theme — dialogs (see spec §5.3 for the full a11y contract)
// ---------------------------------------------------------------------------
export const dialogBackdrop =
  "animate-admin-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-admin-scrim/70 p-4 pt-10 sm:items-center sm:pt-4";
export const dialogPanel =
  "animate-admin-pop relative w-full rounded-2xl border border-admin-border bg-admin-base shadow-2xl shadow-black/40 sm:max-w-2xl";
export const dialogPanelSm = "sm:max-w-md";
export const dialogPanelLg = "sm:max-w-4xl";
export const dialogHeader = "flex items-start justify-between gap-4 border-b border-admin-line px-6 py-5";
export const dialogTitle = "font-serif text-xl text-admin-text";
export const dialogBody = "p-6";
export const dialogFooter = "flex flex-wrap items-center justify-end gap-2 border-t border-admin-line px-6 py-4";

/** Inline destructive-confirm step (deletes, revoke). */
export const confirmBox = "rounded-xl border border-admin-danger/30 bg-admin-danger/10 p-4";
export const confirmTitle = "text-sm font-semibold text-admin-text";
export const confirmBody = "mt-1 text-sm text-admin-muted";

// ---------------------------------------------------------------------------
// Admin theme — booking timeline
// ---------------------------------------------------------------------------
export const timeline = "mt-4 space-y-4 border-l border-admin-line pl-5";
export const timelineItem = "relative text-sm";
export const timelineDot = "absolute -left-[1.4rem] top-0.5 h-2 w-2 rounded-full bg-accent";
export const timelineTitle = "font-semibold text-admin-text";
export const timelineMeta = "text-xs text-admin-faint";
export const timelineNote = "mt-0.5 rounded-lg bg-admin-raised px-2.5 py-1.5 text-xs text-admin-muted";
