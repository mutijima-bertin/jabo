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
export const thCls = "whitespace-nowrap px-5 py-3 text-xs font-medium uppercase tracking-wider text-admin-muted";
export const thClsRight = cx(thCls, "text-right");
export const tdCls = "px-5 py-3 align-middle text-admin-text";
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
/**
 * `loadingState` for PANEL-WIDTH surfaces (notification dropdown, ⌘K palette)
 * — `py-14` is full-page rhythm and reads as a huge void inside a popover.
 * Written out in full rather than composed on `loadingState`, because Tailwind
 * class order does not resolve the `py-*` conflict (the taller `py-14` would
 * keep winning). Pair with `min-h-24` when the panel needs a height floor.
 */
export const loadingStateCompact = "flex flex-col gap-3 px-6 py-6";

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

/**
 * Fluid admin canvas (spec §3.3 deviation): full-width with a 1600px cap on
 * very wide monitors, so tables stop feeling minimized inside the old
 * max-w-7xl. `py-6` (not py-8) compensates for the new sticky topbar taking
 * the top boundary's place.
 */
export const shellMain = "w-full px-4 md:px-6 lg:px-8 py-6 mx-auto max-w-[1600px]";

/** Content spacing directly under the topbar region (kit coherence — the
 *  /admin shell currently spaces its own tab content row). */
export const topbarInset = "mb-6 space-y-4";

// ---------------------------------------------------------------------------
// Admin theme — sticky topbar (spec §4.1 deviation: fluid 1600px shell +
// topbar). The topbar starts the admin main column; its inner row shares
// shellMain's max-w-[1600px] canvas so breadcrumb/search/bell align with the
// tab content below it. z-30 keeps it BELOW dialogs (z-50) and toasts.
// ---------------------------------------------------------------------------
/**
 * Sticky full-width band. Translucent admin-base + backdrop-blur keeps tab
 * content legible while it scrolls underneath; the hairline border-b is the
 * only separation it needs (the topbar replaces the old mt-6 top gap's role).
 */
export const topbar =
  "sticky top-0 z-30 w-full border-b border-admin-line bg-admin-base/85 backdrop-blur-sm";

/** Inner row — h-14 (56px) fits the 40px control row with breathing room. */
export const topbarInner =
  "mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4";

/** Left cluster — compact muted breadcrumb (BRAND / current tab), truncates. */
export const topbarBreadcrumb = "flex min-w-0 items-center gap-1.5 text-sm text-admin-muted";
export const topbarBrandLabel = "hidden min-w-0 truncate sm:inline";
export const topbarTabLabel = "min-w-0 truncate font-medium text-admin-text";
export const topbarSeparator = "h-3.5 w-3.5 shrink-0 text-admin-faint";
export const topbarIcon = "h-4 w-4 shrink-0";
export const topbarActions = "flex shrink-0 items-center gap-2";

/** Date meta beside the breadcrumb on wide screens (e.g. "Today, 24 Sep"). */
export const topbarDate = "hidden shrink-0 whitespace-nowrap text-admin-faint lg:inline";

/**
 * Search affordance styled like an input — inert button that opens the ⌘K
 * palette in a later ticket. Carries a real input's visual weight.
 */
export const topbarSearchTrigger =
  "inline-flex h-10 min-w-10 items-center gap-2 rounded-lg border border-admin-line-strong bg-admin-panel px-3 text-sm text-admin-muted transition duration-150 hover:border-admin-muted hover:text-admin-text";

/** ⌘K keycap inside the search trigger (md+ only — palette ships later). */
export const topbarKbd =
  "hidden items-center gap-0.5 rounded border border-admin-line-strong bg-admin-raised px-1.5 py-0.5 font-sans text-[10px] tracking-wide text-admin-faint md:inline-flex";

/** Account chip — initials avatar; static ("A") until profile data exists. */
export const accountChip =
  "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-admin-line-strong bg-admin-raised text-sm font-semibold text-admin-text";

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
// Admin theme — free-text search (bookings tab field + ⌘K command palette)
// ---------------------------------------------------------------------------
/** Icon-anchored search field wrapper — the <Search> icon + clear button are
 *  absolutely positioned inside it (see `fieldSearchIcon` / `fieldSearchClear`). */
export const fieldSearchWrap = "relative";
export const fieldSearchIcon = "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-faint";
/** The field itself — reserves room for both the leading icon and the clear button.
 *  The WebKit native cancel button is suppressed (we ship our own, ≥40px). */
export const fieldSearchInput = cx(
  adminInputCls,
  "pl-9 pr-11 [&::-webkit-search-cancel-button]:hidden",
);
/** Clear button inside a search field — ≥40px like every other control; sized
 *  to the h-10 field it sits in. */
export const fieldSearchClear = cx(iconBtnGhostSm, "absolute right-0 top-1/2 -translate-y-1/2");
/** Glyph inside a clear button (palette + field). */
export const clearIcon = "h-4 w-4";

/** ⌘K overlay — the dialogBackdrop scrim, reused verbatim for the palette.
 *  An ALIAS, not a copy: the two recipes are byte-identical, and a duplicated
 *  literal is one more thing to drift. The alias name survives so the palette
 *  call site still reads as "this is the search overlay", not "a dialog". */
export const searchOverlay = dialogBackdrop;
/** Palette panel — a dialog surface narrowed to a search box (max-w-xl). */
export const searchPanel =
  "animate-admin-pop relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-admin-border bg-admin-base shadow-2xl shadow-black/40";
/** Query row — a borderless h-14 field (the panel header owns the separation). */
export const searchInputWrap = "relative flex items-center border-b border-admin-line";
export const searchInputIcon =
  "pointer-events-none absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-admin-faint";
/** Written out in full (never composed on `adminInputCls`): the palette field is
 *  deliberately borderless/borderless-background inside its own row. */
export const searchInput =
  "h-14 w-full rounded-none border-0 bg-transparent py-0 pl-11 pr-12 text-base text-admin-text outline-none transition placeholder:text-admin-faint";
export const searchInputClear = cx(iconBtnGhostSm, "absolute right-1 top-1/2 -translate-y-1/2");

/** Results viewport — capped so the panel never outgrows the viewport. */
export const searchResults = "max-h-[60vh] overflow-y-auto overscroll-contain p-2";
/** Group header ("Bookings", "Clients"…) inside the results list. */
export const searchGroupLabel = cx(sectionLabel, "px-3 pb-1 pt-3");
/** One result row — a real <button> so it is focusable and touch-safe. */
export const searchOption =
  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 hover:bg-admin-raised";
/** Keyboard-active row — raised brass surface; never colour-only, the active
 *  row is also the one Enter opens and `aria-selected` names it. */
export const searchOptionActive = cx(searchOption, "bg-accent/15");
export const searchOptionIconWrap = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-raised";
export const searchOptionIcon = "h-4 w-4 text-admin-muted";
export const searchOptionTitle = "block truncate text-sm text-admin-text";
export const searchOptionTitleActive = "block truncate text-sm font-semibold text-brass-light";
export const searchOptionMeta = "block truncate text-xs text-admin-muted";

/** Centered state line (idle hint / loading / empty / error) in the panel. */
export const searchState = "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center";
/** Keyboard legend footer under the results. */
export const searchFooter =
  "flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-admin-line px-4 py-2.5 text-xs text-admin-faint";
export const searchFooterKbd =
  "rounded border border-admin-line-strong bg-admin-raised px-1.5 py-0.5 font-sans text-[10px] text-admin-muted";

// ---------------------------------------------------------------------------
// Admin theme — booking timeline
// ---------------------------------------------------------------------------
export const timeline = "mt-4 space-y-4 border-l border-admin-line pl-5";
export const timelineItem = "relative text-sm";
export const timelineDot = "absolute -left-[1.4rem] top-0.5 h-2 w-2 rounded-full bg-accent";
export const timelineTitle = "font-semibold text-admin-text";
export const timelineMeta = "text-xs text-admin-faint";
export const timelineNote = "mt-0.5 rounded-lg bg-admin-raised px-2.5 py-1.5 text-xs text-admin-muted";

// ---------------------------------------------------------------------------
// Admin theme — notification bell, dropdown & dashboard attention queue
// (topbar §4.1 extension — spec has no dedicated §; follows the kit rules)
// ---------------------------------------------------------------------------
/**
 * Unread badge base on the topbar bell. Decorative placement (absolute on the
 * icon button) — the count itself lives in the trigger's aria-label, so the
 * badge is always `aria-hidden` at the call site.
 */
export const bellBadge =
  "pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full border border-admin-base px-1 text-[10px] font-semibold leading-4";
/** Brass count pill for 10–99 unread (ink rides 5.4:1 on brass, proven by btnPrimary). */
export const bellBadgeCount = cx(bellBadge, "bg-brass-light text-ink");
/** Small red "needs attention" dot for unread ≤ 9 — the count is in the aria-label. */
export const bellBadgeDot =
  "pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-admin-base bg-admin-danger";

/** Notification dropdown — pop-over card aligned under the bell (card-like surface). */
export const notifPanel =
  "animate-admin-pop absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-admin-border bg-admin-base shadow-2xl shadow-black/40 sm:w-96";
/** One notification row — a real <button> so it is focusable/touch-safe (min-h-10). */
export const notifItem =
  "flex min-h-10 w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-admin-raised";
/** Unread row — slightly raised surface + bold title (color is never the only signal). */
export const notifItemUnread = cx(notifItem, "bg-admin-panel");
export const notifIconWrap = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-admin-raised";
export const notifIcon = "h-4 w-4 text-admin-muted";
export const notifItemTitle = "block text-sm text-admin-muted";
export const notifItemTitleUnread = "block text-sm font-semibold text-admin-text";
/** Unread marker dot on a notification row — decorative (the aria-label carries it). */
export const notifUnreadDot = "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass-light";

/** Compact count badge for dashboard attention rows (h-6 — stays inside its row). */
export const countBadge =
  "inline-flex h-6 min-w-6 items-center justify-center gap-1 whitespace-nowrap rounded-full px-1.5 text-xs font-semibold";
export const countBadgeBrass = cx(countBadge, "border border-accent/30 bg-accent/15 text-brass-light");
export const countBadgeWarning = cx(countBadge, "border border-admin-warning/30 bg-admin-warning/10 text-admin-warning");
export const countBadgeSuccess = cx(countBadge, "border border-admin-success/30 bg-admin-success/10 text-admin-success");
export const countBadgeDanger = cx(countBadge, "border border-admin-danger/30 bg-admin-danger/10 text-admin-danger");
export const countBadgeMuted = cx(countBadge, "border border-admin-line-strong bg-admin-raised text-admin-muted");

/**
 * "Needs your attention" panel — brass-edged variant of cardCls written out in
 * full (like `inputErrorCls`) so the accent border deterministically outranks
 * regular cards: it is the first block above the stat cards.
 */
export const attentionPanel = "rounded-2xl border border-accent/40 bg-admin-panel";
/** Attention summary row — the WHOLE row is the click target (button or div). */
export const attentionRow =
  "flex min-h-10 w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-admin-line px-3 py-2.5 text-sm transition duration-150 hover:border-accent/50 hover:bg-admin-raised";

// ---------------------------------------------------------------------------
// Admin theme — "Upcoming productions" card (dashboard) + chart range chips
// ---------------------------------------------------------------------------
/** One upcoming-production row — wraps on narrow screens, truncates the label. */
export const upcomingRow = "flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3";
/** Event-date column — fixed width so the rows align down the card. */
export const upcomingRowDate = "w-28 shrink-0 text-sm text-admin-muted";
export const upcomingRowService = "min-w-0 flex-1 truncate text-sm text-admin-text";
export const upcomingRowContact = "truncate text-sm text-admin-muted";
/** Trailing "+N more" line under a capped list (8 visible rows by default). */
export const upcomingMore = "px-5 pb-4 text-xs text-admin-faint";
/** Range chip row wrapper — the chips themselves reuse `filterChipActive` /
 *  `filterChipInactive`; this is the label + right-aligned group above the charts. */
export const rangeRow =
  "mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-admin-line pb-3";

/** Notification-type accent dots (bell rows + attention summaries) — statusDot-style. */
export const NOTIF_DOTS: Record<string, string> = {
  NEW_BOOKING: "bg-brass-light",
  STATUS_CHANGED: "bg-admin-faint",
  NEW_CONTACT_MESSAGE: "bg-admin-warning",
  TESTIMONIAL_SUBMITTED: "bg-admin-success",
  SEND_FAILED: "bg-admin-danger",
};
export function notifDot(type: string): string {
  return cx("h-2 w-2 shrink-0 rounded-full", NOTIF_DOTS[type] ?? "bg-admin-faint");
}

// ---------------------------------------------------------------------------
// Admin theme — toasts (lib/toast.tsx)
// ---------------------------------------------------------------------------
// `pointer-events-none` on the host + `pointer-events-auto` on each card keeps
// the whole strip click-through; z-[60] floats ABOVE dialogs (z-50) so a toast
// pushed from inside an open dialog is never hidden by its backdrop. The entry
// animation reuses `animate-admin-pop`, which globals.css already disables
// under prefers-reduced-motion.

/** Fixed bottom-right stack (bottom-center on narrow screens). */
export const toastHost =
  "pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6";

/** One toast card — pointer-events-auto, max-w-sm, admin-base surface. */
export const toast =
  "animate-admin-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-admin-base px-4 py-3 shadow-2xl shadow-black/40";

/** Kind variants — the border + the icon carry the hue; text stays neutral. */
export const toastSuccess = "border-admin-success/40";
export const toastWarning = "border-admin-warning/40";
export const toastDanger = "border-admin-danger/40";

/** Kind icon (never colour-only: a glyph + a border ride every toast). */
export const toastIcon = "mt-0.5 h-4 w-4 shrink-0";
export const toastIconSuccess = "text-admin-success";
export const toastIconWarning = "text-admin-warning";
export const toastIconDanger = "text-admin-danger";

/** Message body — shrinks before the action button, wraps long strings. */
export const toastMessage = "min-w-0 flex-1 text-sm text-admin-text";

/** Trailing action (e.g. "Undo") — ghost, so it never outshouts the card. */
export const toastAction =
  "inline-flex min-h-10 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-brass-light transition duration-150 hover:bg-accent/15";

// ---------------------------------------------------------------------------
// Admin theme — dashboard system-health strip
// ---------------------------------------------------------------------------
/** Slim one-line status band. The danger variant is written out in full — like
 *  `errorBanner` / `attentionPanel` — so its border + surface deterministically
 *  outrank the neutral one: pick with a ternary, never compose the two with
 *  `cx()` (Tailwind class order does not resolve same-slot color conflicts). */
export const healthStrip =
  "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-admin-line bg-admin-panel px-4 py-2.5 text-sm";
export const healthStripDanger =
  "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-admin-danger/40 bg-admin-danger/10 px-4 py-2.5 text-sm text-admin-danger";

/** Leading status dot — the strip's single at-a-glance signal. The danger
 *  variant is written out in FULL (same rule as `healthStripDanger`): both
 *  recipes carry their own `bg-*`, and `bg-admin-success` happens to be
 *  emitted after `bg-admin-danger` in the compiled stylesheet, so composing
 *  them with `cx()` would silently keep the GREEN dot. Pick with a ternary. */
export const healthDot = "h-2 w-2 shrink-0 rounded-full bg-admin-success";
export const healthDotDanger = "h-2 w-2 shrink-0 rounded-full bg-admin-danger";

/** Lead label ("System healthy") — the only semibold text in the strip. */
export const healthLead = "font-semibold text-admin-text";
/** Lead label in the danger state (inherits `healthStripDanger`'s hue). */
export const healthLeadDanger = "font-medium";
/** Metric ("DB ok", "0 failed sends (24h)", "up 23h"). */
export const healthMetric = "text-admin-muted";
/** Metric that crossed a threshold (non-zero failed sends) — warning hue. */
export const healthMetricAlert = "font-medium text-admin-warning";
/** "·" separator between metrics — decorative (aria-hidden at the call site). */
export const healthSep = "text-admin-faint";
