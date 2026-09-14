# Creative Sound Studio — Admin Interface Design Spec (Phase A)

> Status: **DESIGN LOCKED** · Phase A deliverable · Date: 2026-09-11
> Engineered for: the founder, Daily user. One coherent, brand-true interface language.
> Design owner: ui-ux-designer. Implemented by: frontend-engineer (tab components) + nextjs-engineer (shell/URL/foundation), **Phase B onward**.
> Supersedes the informal dark styling in `admin/*` (which is utilitarian zinc-on-zinc with 17 `alert()`/`confirm()` sites, three input heights, no focus treatment).
> Pairs with `frontend/PLAN.md` phase status: this document is the visual contract the "ruthless admin-canvas overhaul" builds on.

---

## 1. Scope & implementable surface

This spec sits on top of two *already committed* code artifacts from Phase A:

| Artifact | File | What it is |
|---|---|---|
| Design tokens | `frontend/src/app/globals.css` | `:root` variables + `@theme inline` entries (`admin-*`, `brass-light`, `--focus-ring`), `.admin-shell` context root, admin keyframes, reduced-motion extension |
| Shared UI primitives | `frontend/src/lib/ui.ts` | the entire class-string kit — buttons, fields, cards, tables, pills, banners, skeletons, dialogs |

The frontend-engineer **must not re-derive** classes from scratch; every admin component imports the kit. Everything a component needs (color, spacing, focus, motion) is already expressed as a class constant; the engineer writes JSX + `cx()` composition + i18n, **zero styling invention**.

Out of scope for Phase A (designed here, built later): the 7 tab components, the admin shell (page.tsx wrapper), the login page internals, `i18n.tsx` dictionary (keys are spec'd in §11 only).

---

## 2. Design language — 10 bullets (the "why" of every class)

1. **Warm dark, not zinc dark.** The panel is a *dark extension of the brand's ink/brass/cream triad*, not a generic zinc skin. Surfaces are warm near-blacks (`#0e0c0a` base, `#161310` panel, `#1e1a15` raised) derived from ink `#1f1d1a`; cream survives as `#f2ede3` text; brass is the single accent hue.
2. **Brass does the talking.** Filled primary buttons, the active nav state, stat numerals, focus rings and link hovers are brass. Depth is *layered warmth + hairline borders* (`#26211b`), not shadows — photography-house discipline.
3. **Fraunces for heads only.** Page titles, card headers, dialog titles, stat values, empty-state titles. Body, tables, labels, buttons: Geist sans. No serif in table cells or form labels (brand rule from the redesign blueprint §2).
4. **One height everywhere.** Inputs/selects/textareas `h-10`; buttons `h-8/10/11`; table rows `py-3`; per-row actions `h-8`. The "three input heights" defect is structurally impossible under this kit.
5. **Every state exists.** Default · hover · focus-visible (global brass ring) · disabled · busy (inline spinner) · error (`role="alert"` banner, red-400/10) · loading (shimmer skeleton) · empty (Fraunces title + quiet body + an action). No component may ship a state without its styled counterpart.
6. **Motion is 100–150ms, subtle, never bouncy.** Backdrop fade `120ms`, dialog pop `140ms ease-out`, row hover `100ms`, buttons `150ms`. Shimmer sweeps at `1.4s`. `prefers-reduced-motion` kills all of it (already in globals.css).
7. **Actions are always visible and touch-safe.** No hover-only overlays. Portfolio cards carry a persistent bottom bar; tables have real per-row buttons; the minimum interactive height anywhere is `h-8` (32 px).
8. **Text hierarchy with enforced contrast.** Primary `#f2ede3` (~15:1), secondary `#a49a8d` (7.3:1), tertiary `#8a7f72` (4.7:1) — all AA on the darkest panels. Semantic accents: success `#34d399` (9.6:1), warning `#fbbf24` (10.6:1), danger `#f87171` (6.7:1). The old `zinc-500 text on zinc-950` (≈2.5:1) is banned.
9. **Color is never the only signal.** Status pills always include an i18n label; dots carry `aria-label`s; live regions announce async updates.
10. **i18n is the only copy source.** Every visible string — labels, placeholders, banners, empty states, aria-labels — goes through `t(DictKey)`. Keys for the whole panel are inventoried in §11.

---

## 3. Token contract (where design lives and how to extend it)

### 3.1 Color tokens (globals.css `:root` + `@theme inline`)

| Token utility | Value | Usage | Contrast on darkest surface |
|---|---|---|---|
| `bg-admin-base` | `#0e0c0a` | page canvas, dialog panels, table frame | — |
| `bg-admin-panel` | `#161310` | cards, inputs, dropzones | — |
| `bg-admin-raised` | `#1e1a15` | table headers, dropdowns, hover fills, skeleton | — |
| `bg-admin-scrim/70` | `#0e0c0a / 70` | modal backdrops | — |
| `border-admin-border` | `#26211b` | card edges, table frames (subtle, premium) | — |
| `border-admin-line` | `rgb(245 242 236 / .10)` | row dividers, card header rules | non-text — no requirement |
| `border-admin-line-strong` | `rgb(245 242 236 / .16)` | inputs, buttons outline, empty-pill borders | non-text — no requirement |
| `text-admin-text` | `#f2ede3` | primary text | ~15.3:1 (AAA) |
| `text-admin-muted` | `#a49a8d` | secondary text, labels | 7.3:1 (AAA) |
| `text-admin-faint` | `#8a7f72` | tertiary, placeholders, section kickers | 4.7:1 (AA) |
| `text-admin-danger` | `#f87171` (red-400) | destructive text/icons, error banners | 6.7:1 (AA) |
| `text-admin-warning` | `#fbbf24` (amber-400) | pending/draft emphasis | 10.6:1 (AA) |
| `text-admin-success` | `#34d399` (emerald-400) | delivered/completed/published | 9.6:1 (AA) |
| `text-accent` / `bg-accent` | `#b08d57` (brass) | brand accent, filled buttons (ink text rides 5.4:1) | 6.9:1 |
| `text-brass-light` / `bg-brass-light` | `#c9a86f` | hover/active brass on dark, focus ring | 10.1:1 |
| `text-ink` | `#1f1d1a` | text ON filled brass (buttons, chips) | 5.4:1 on brass |

Opacity modifiers (`/10`, `/15`, `/30` …) are safe: the repo already exercises `accent/40`, `accent/10` and Tailwind v4 emits `color-mix()`.

### 3.2 Radius scale (Tailwind defaults, disciplined)

| Element | Radius |
|---|---|
| inputs, icon buttons, nav links | `rounded-lg` (8px) |
| cards, dialogs, banners, dropzones, table frames | `rounded-2xl` (16px) |
| buttons, pills, chips | `rounded-full` |

### 3.3 Spacing rhythm (Tailwind defaults, disciplined)

- Page gutter `px-4 md:px-8`; content max-width `max-w-[1440px]` (tables must breathe — drop the old `max-w-6xl`).
- Stack rhythm: `gap-2` inside chips/rows · `gap-3` inside fields · `gap-4` between form rows · `gap-6/8` between sections.
- Card padding `p-5`, table cells `px-4 py-3`, dialog body `p-6`.
- Section separations `mt-6` (within tab) / `mt-10` (between Settings sections with `border-t border-admin-line pt-8`).

### 3.4 Focus treatment

- **Global:** `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }` — already in globals.css.
- **Context switch:** `.admin-shell { --focus-ring: var(--brass-light); }`. Apply `admin-shell` to the `<div>` root of `/admin` and `/admin/login` in Phase B. Only native elements ignoring the global ring need `focusRing` from the kit.
- **Visible on every keyboard interaction, never on mouse click** (`:focus-visible` semantics).

### 3.5 Motion tokens (globals.css)

- `.animate-admin-fade` 120ms — backdrops, banner entries.
- `.animate-admin-pop` 140ms ease-out — dialogs, confirm steps.
- `.skeleton-shimmer` 1.4s — loading rows/cards (`shimmer`/`shimmerRow`/`shimmerText` in the kit).
- `.animate-pulse` (Tailwind) — static skeleton blocks (`skeleton*`).
- All killed under `prefers-reduced-motion`.

---

## 4. Admin shell

### 4.1 Structure (Phase B rewrites `app/admin/page.tsx` wrapper)

```
<div className="admin-shell">                      ← root: dark canvas, brass focus ring, color-scheme: dark
  <div className="shellMain flex flex-col gap-8 md:flex-row md:gap-8">
    <aside className={sidebar} aria-label={t("admin_nav_aria")}>   ← hidden md:flex
      <p className={sidebarBrand}>{BRAND}</p>
      <nav className="flex flex-col gap-0.5">
        [tab button ×7]: className={active ? sideLinkActive : sideLinkInactive}
        <Icon className={sideLinkIcon} /> {t(tabLabel)}
      </nav>
      <button className={sideLinkDanger + " mt-auto"} onClick={logout}>
        <LogOut className={sideLinkIcon} /> {t("admin_logout")}
      </button>
    </aside>

    <div className="min-w-0 flex-1">
      <nav className={mobileNav} aria-label={t("admin_nav_aria")}>   ← md:hidden
        [tab pill ×7]: className={active ? filterChipActive : filterChipInactive}
        <span className="mx-1 h-5 w-px bg-admin-line" aria-hidden />
        [logout pill]: filterChipInactive + hover:text-admin-danger (LogOut icon)
      </nav>
      <div className="mt-6 md:mt-0">
        {tab === "dashboard"   && <AdminDashboard … />}
        {tab === "bookings"    && <AdminBookings … />}
        …
      </div>
    </div>
  </div>
</div>
```

### 4.2 Behavior contract

- **Nav state:** `aria-current="page"` on the active tab; the seven tabs remain `useState`-driven **but the engineer must lift `tab` into the URL** as `?tab=` (`router.replace()`), so the bookings tab can also carry `?status=` — this is the foundation defect-2 fix (`?status=` filter was unused). Read the initial tab from `useSearchParams` on mount; back/forward must work.
- **Logout:** `clearToken()` + `router.replace("/")` (unchanged behavior). No confirm — logout is cheap and reversible.
- **Session expiry (defect 1 — foundation):** introduce ONE global guard: `adminFetch` surfaces `"NOT_AUTHENTICATED"` on any 401; a shell-level handler (wrap the tab render in an error boundary per tab, or a tiny shared `useAdminRequest` wrapper) must `clearToken()` then `router.replace("/admin/login?expired=1")` **and** show a full-tab "session expired" card (icon + `admin_booking…` no → `admin_session_expired` + "Sign in again" `btnPrimary` linking to login) while the redirect happens. Never a silent blank panel. Login flash state (§9) is the in-page design for it.
- **Empty/middle states:** all collection/table tabs implement their own (§5–§9). The shell itself renders nothing while `!ready` except the existing centered spinner, restyled to `Loader2` with `text-accent` (already the case).

### 4.3 States
| State | Behavior |
|---|---|
| default | sidebar on md+, snap-scrolling pill row on mobile (`-mx-1 overflow-x-auto snap-x`, no wrap — defect-8 fix) |
| active tab | `sideLinkActive` (brass tint) / `filterChipActive` (brass fill) + `aria-current="page"` |
| ready false | centered `Loader2` spinner in `text-accent` |

---

## 5. Dashboard

### 5.1 Structure
```
pageHeader:
  h1 pageTitle          → t("admin_dashboard")
  p  pageSub            → t("admin_dash_sub")
  button iconBtnSecondary (RefreshCw) aria-label={t("admin_dash_refresh")}
       + <span className="sr-only" aria-live="polite">{updatedFlash}</span>

grid grid-cols-2 gap-4 sm:grid-cols-4:
  [8 × stat]: button className={statCardClickable} + aria-label (deep links)
      p statValue → number (Fraunces, brass)
      p statLabel → label

card (recent bookings):
  cardHeader: h2 font-serif (reuse cardHeaderTitle) + count badge
  table in tableScrollWrap
  footer: btnGhost → t("admin_dash_view_all") (arrow icon)

end of page: empty/error/loading states per §5.3
```

### 5.2 Stat deep-links (defect 7 "hover parity" + dead ends)
Each stat is a **button** (keyboard-reachable, not a div):
- `total`, `pending`, `confirmed`, `inProduction`, `delivered`, `completed`, `cancelled` → `?tab=bookings` (status ones additionally set `?status=<STATUS>` so the bookings screen opens pre-filtered);
- `clients` → `?tab=clients`.

Labels: `t("admin_dash_stat_total")`, `t("admin_dash_stat_clients")`, and the six statuses via the existing `t(statusKey(status))`.

### 5.3 Recent-bookings table
Columns: Reference · Service · Status · Date.
- Reference cell = `tdCls`: `font-semibold text-brass-light` — rendered as the row's **focusable trigger** (button; Enter/Space opens bookings tab with that row highlighted — see §6).
- Status = `statusPill(b.status)`.
- Date = `formatDate(b.createdAt, locale)` (`lib/format.ts`).
- Click anywhere on the row (besides the link) opens the bookings tab too (`onClick` is fine on `tbodyRow` **because a real focusable trigger exists first in tab order**).

### 5.4 States
| State | Render |
|---|---|
| Loading | `loadingState` containing `skeletonRows(6)` + one `skeletonCard` |
| Error | `errorBanner` (`role="alert"`) with message + `btnSecondary` Retry (`admin_retry`) that refetches |
| Empty | `emptyState` + `Inbox` icon in `emptyStateIconWrap` + `emptyStateTitle` `admin_dash_empty` |
| Refresh | icon swaps to `Loader2` spin for the request; `admin_dash_updated` announced in the sr-only live region |

---

## 6. Bookings

### 6.1 Screen structure
```
pageHeader: pageTitle (admin_bookings) + pageSub (admin_bookings_sub)

filterRow (chips): [All statuses | PENDING | CONFIRMED | IN_PRODUCTION | DELIVERED | COMPLETED | CANCELLED]
   role = navigation, aria-label = t("admin_bookings_filter")
   active chip = filterChipActive; label = "All" → admin_bookings_filter_all, others t(statusKey(s))
   click → router.replace(`?tab=bookings&status=${s | ""}`) — never a dead param (defect 2)

tableScrollWrap:
  table min-w-[840px]
  thead theadRow: thCls columns (admin_bookings_col_ref/_client/_service/_status/_created)
  tbody tbody (divide-admin-line), rows tbodyRow
```

### 6.2 Rows: keyboard-first trigger (defect 2)
- **Row is NOT the click target.** The Reference cell renders as a `<button className="font-semibold text-brass-light hover:text-brass">` — Tab order 1 per row; Enter/Space opens the dialog.
- `aria-label` on the button: `${t("admin_bookings_open")} ${b.reference}`.
- The rest of the row's `onClick` can still open the dialog (pointer users) — the button alone satisfies keyboard a11y.
- Status cell: `statusPill(b.status)`; Created: `formatDate`.

### 6.3 Detail dialog (defect 2 — full a11y contract)
```
<div className={dialogBackdrop}            role="presentation"        onClick={close}>
  <div className={dialogPanel + dialogPanelLg}                        ← lg (max-w-4xl) — this dialog is data-dense
       role="dialog" aria-modal="true" aria-labelledby="bd-title"
       aria-describedby="bd-subtitle" tabIndex={-1}
       onClick={stopPropagation}
       onKeyDown={ESC → close}>
    <header className={dialogHeader}>
      <div>
        <h2 id="bd-title" className={dialogTitle}>{reference}   ← Fraunces
        <p id="bd-subtitle" className="mt-1 text-sm text-admin-muted">
          {service name} · {t("admin_bookings_col_created")} {formatDate(...)}  (or "—")
      <button className={iconBtnGhost} aria-label={t("admin_close")}><X/></button>
    </header>

    <div className={dialogBody + " space-y-6"}>
      [grid sm:grid-cols-2 gap-4]
        card cardCls p-4 → admin_booking_client: name (semibold), email, phone (admin_booking_contact)
        card cardCls p-4 → admin_booking_production: date / location / budget
      [details]: if b.details → card cardCls p-4: admin_booking_details + text

      [Status transitions]  sectionLabel admin_booking_update_status
        current pill: statusPill(current)
        next actions: NEXT[status] buttons:
          CANCELLED option  → btnDangerGhost   (destructive)
          any other next    → btnSecondary
          all disabled while busy; the pressed one shows Loader2
        note field + save: label adminFieldLabel admin_booking_note_label
          textarea adminTextareaCls rows=2 placeholder admin_booking_note_placeholder
          button btnSecondary btnSm → admin_booking_note_save
        PATCH body: { status, note (only when non-empty) }   ← backend ALREADY accepts note (surface it now — defect 2)
        error: errorBanner role="alert" (admin_error_generic + server message)
        live region: <p className="sr-only" aria-live="polite">{t("admin_booking_status_live")} {lastApplied}</p>

      [Timeline]  sectionLabel admin_booking_timeline
        ul timeline: li timelineItem (dot timelineDot, title timelineTitle = t(statusKey(e.status)),
           timelineMeta = formatDate, note → timelineNote)   ← backend note surfaced here too
        empty: admin_booking_timeline_empty (muted)

      [Notifications]  sectionLabel admin_booking_notifications
        ul: channel · kind → recipient: statusPill-ish (SENT → badgeSuccess "SENT"… but no hardcoded EN:
           label = n.status, classes success/danger), error detail text-admin-faint
        empty: admin_booking_notifications_empty
    </div>

    <footer className={dialogFooter}>
      [revoke]: <button className={rowActionDanger}><RotateCcw/>{t("admin_booking_revoke")}</button>
        → confirmStep: confirmBox + confirmTitle(admin_booking_revoke_title)
                       + confirmBody(admin_booking_revoke_body)
                       + [btnSecondary admin_booking_revoke_keep] [btnDanger admin_booking_revoke_confirm]
        → success: successBanner admin_booking_revoked (clears on dialog close)
      [close]  btnSecondary admin_close (bottom-left secondary, keeps ESC consistent)
    </footer>
  </div>
</div>
```

### 6.4 Dialog a11y checklist (also §10)
1. `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; subtitle `aria-describedby`.
2. **ESC** closes (keydown on the panel — must not bubble to page).
3. **Focus trap:** `tabIndex={-1}` panel; programmatic focus onto the panel on open; Tab/Shift+Tab wrap by intercepting when focus leaves panel bounds.
4. **Initial focus:** first focusable = close button (predictable) or the primary status action (efficiency — engineer choice, must be consistent).
5. **Restore focus** to the row trigger on close.
6. Backdrop click closes; clicks inside the panel stopPropagation.
7. `aria-hidden`/`inert` NOT required on the rest of the app while `aria-modal` is present.
8. Body scroll lock while open (`overflow-hidden` on `document.body`).

### 6.5 States
| State | Render |
|---|---|
| Loading | `tableScrollWrap` + `loadingState` + `skeletonRows(8)` |
| Error (list) | `errorBanner` + Retry `admin_retry` |
| Empty (all) | `emptyState` + `Inbox` icon + `admin_bookings_empty` |
| Filter empty | same empty state — chip stays active (honest emptiness, no silent reset) |
| Busy (status/note) | affected buttons disabled + `Loader2` |
| Revoke busy | confirm buttons disabled; after success `successBanner`; row pill reflects revoked via toast on next load |

---

## 7. Collection manager — Services · Portfolio · Blog

One pattern, three data shapes. This section defines the **shared manager**, then per-collection deltas.

### 7.1 Manager screen skeleton
```
pageHeader:
  h1 pageTitle (per-collection: admin_services / admin_portfolio / admin_blog)
  button btnPrimary → New (per-collection key)   [+ icon]

[error]       errorBanner role="alert" (admin_error_load or server msg) + btnSecondary Retry
[loading]     grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 → 6 × skeletonCard
[empty]       emptyState: emptyStateIconWrap icon + emptyStateTitle + emptyStateBody + btnPrimary New
[default]     list or grid of items (below)

[editing]     editor form (below) — renders ABOVE the list, scrolling to it
```

### 7.2 Editor form (shared contract)
- Wraps in `<form onSubmit={save} className="mt-6 rounded-2xl border border-admin-border bg-admin-base">` with `cardHeader` (editor title = Fraunces `cardHeaderTitle`, "Edit/New …") + `cardBody space-y-5`.
- **Every field:** `adminedFieldLabel` + `adminInputCls` (or `adminSelectCls` in `selectWrap` with a `ChevronDown` in `selectChevron`, or `adminTextareaCls`). Same `h-10` everywhere.
- **Toggles:** native checkbox `checkboxCls` in a flex `items-center gap-2` label (`admin_status_published` / `admin_featured`).
- **Busy:** Save/Create button `btnPrimary` disabled + `Loader2`; label `admin_saving` → `admin_saved` on success (persistent flash in `successBanner`, no timers).
- **Errors:** `errorBanner` `role="alert"` + field-level `adminFieldError` for validation.
- **Cancel / dirty guard:** Cancel = `btnSecondary`. If form is dirty (`JSON.stringify(original) !== JSON.stringify(editing)`), swap Cancel for a `confirmBox` inline step: `admin_unsaved_title` / `admin_unsaved_body` + `[admin_discard] [admin_keep_editing]`. No `window.confirm` anywhere.
- **Delete (everywhere):** the Delete button morphs (in-place) into `confirmBox`: `confirmTitle` `admin_delete_title`, `confirmBody` `admin_delete_body` + `[btnSecondary admin_delete]`→ wait, cancel = `admin_keep_editing`-style `btnSecondary` labeled `admin_form_cancel`, go = `btnDanger` `admin_delete_confirm` with `Loader2` while busy, + `admin_deleting` label. Errors from delete → `errorBanner` (defect 9 — no `confirm()`, no unhandled rejection).
- **Dropzone:** `dropzoneCls` (+ `dropzoneActive` while drag-over). Click opens the hidden file input. Preview rendered when `imageUrl`/`coverUrl` exists. Busy label swaps to `admin_logos_uploading` (reuse) with a small spinner. Errors inline via `adminFieldError`.
- Per-row actions **always visible** (defect 3): `rowActionBrass` Edit (`admin_edit`, with `Pencil` icon) + `rowActionDanger` Delete. Minimum h-8, they live INSIDE the card, never in a hover overlay.

### 7.3 Services (deltas)
- **List:** grid `sm:grid-cols-2 lg:grid-cols-3` of `cardCls` cards:
  - optional thumb `img` (`thumbWide`) top;
  - `cardBody`: `p font-semibold` nameEn, `p text-sm text-admin-muted` priceEn, status signals below: `pubPill(published)` + `badgeBrass` (`Stars` icon) `admin_featured` when featured, `linkCls` to `/blog/<linkedPostSlug>` when present.
  - footer row: Edit + Delete (`rowActionBrass`/`rowActionDanger`) — always visible.
- **Form fields:** nameEn\*, nameRw\*, descriptionEn, descriptionRw, priceEn\*, priceRw\*, **category → `adminSelectCls` over the canonical five** (defect 5): Photography · Videography · Livestreaming · Post-production · Production (keys `admin_service_cat_*`; legacy values preserved as an extra option like the portfolio legacy pattern), icon (existing icon list), image dropzone (`admin_service_image`/`_hint`/`_remove_image` reuse), linked post select (reuse `admin_service_linked_post`/`_none`), toggles published + featured, `sortOrder` numeric input (hint `admin_sort_order_hint`).
- **Empty:** `admin_services_empty`.

### 7.4 Portfolio (deltas)
- **List — touch-safe CARDS, no overlay** (defect 3):
  ```
  <div className="relative overflow-hidden rounded-2xl border border-admin-border group">
    <img className={thumbCls} … />
    <div className={cardScrim}>                    ← ALWAYS VISIBLE
      <div> <p className="text-sm font-semibold text-admin-text">{titleEn}</p>
            <p className="text-xs text-admin-muted">{category}</p>
      <div className="flex gap-2 shrink-0">
        [Edit] rowActionBrass  [Delete] rowActionDanger
    </div>
  </div>
  ```
- **Form:** titleEn\*, titleRw, category `adminSelectCls` (canonical six via `portfolio_filter_*` keys, legacy option preserved — current behavior), client name, media type select, **tags input fixed** (defect 3 — controlled `value={tags.join(", ")}` + `onChange` that writes back immediately; the stale-`defaultValue`/onBlur bug is gone), cover dropzone (single) + existing `mediaUrls` rendered as a small thumbnail list with per-item remove (Phase C: multi-upload dropzone).
- **Empty:** `admin_portfolio_empty`.

### 7.5 Blog (deltas)
- **List:** table (`min-w-[860px]`) — Title (+ `/{slug}` muted sub-line), Type (`badgeBrass`; label via `postTypeKey`), Status (`pubPill` + `draftBadge` `admin_status_draft` for drafts — defect 4 visibility), Views (`Eye` + number), Likes (`Heart` + number), Updated (`formatDate`), Actions (Edit/Delete `rowAction*` **always visible**).
- **Form:** cover dropzone; **EN section + RW section** separated by `sectionLabel` `admin_lang_en` / `admin_lang_rw` headers, each with title\*, excerpt, content\* (`adminTextareaCls` rows 8, markdown hint `admin_blog_markdown`); type select (`blog_type_*` keys via `postTypeKey` values), slug input (placeholder hint `admin_blog_slug_hint`), published toggle.
- **Delete wrapped in try/catch** (defect 4): failure → `errorBanner`; success reload; the two-step confirm covers accidental clicks.
- **Empty:** `admin_blog_empty`.

---

## 8. Settings

Sectioned, single file grows into **three sections, each its own `<form>`** (defect 6 — the "3 components in one file" is an organization decision for the engineer; the *design* requirement is what follows):

### 8.1 Site content
- `pageTitle` `admin_settings_title` + `pageSub` `admin_settings_sub`.
- Key-value cards, each `cardCls p-5`: mono key kicker (`sectionLabel` + `font-mono`) + `grid gap-4 sm:grid-cols-2` **EN/RW side by side** (column headers `admin_lang_en` / `admin_lang_rw`, `adminFieldLabel`).
- Save = a **real form submit** (`<form onSubmit={save}>`), so Enter works everywhere (defect 6). Button `btnPrimary` `admin_settings_save`; busy `admin_saving` + `Loader2`; success `successBanner` `admin_saved` **persists until the next edit** — NO `setTimeout` race, no "Saved ✓" flash-and-disappear hack (defect 6).
- Errors → `errorBanner` `role="alert"`.

### 8.2 Client logos
- Existing behavior preserved (dropzone → POST `/admin/uploads` → POST `/admin/logos`; per-logo delete), now restyled: `dropzoneCls`/`dropzoneActive`, `cardCls` tiles with `img` `h-14 object-contain` or the `font-serif` wordmark fallback, delete via the **inline confirm pattern** (§7.2), `admin_logos_*` keys (reuse).

### 8.3 Testimonials
- List table (`min-w-[760px]`): Quote (truncated EN + RW second line), Author (+role), Status (`pubPill`), Created, Actions.
- Actions **always visible**: `rowActionBrass` **Edit** (defect 6 — loaded into the create form, same component path), `rowActionDefault` publish toggle (`admin_testimonials_publish`/`_unpublish`), `rowActionDanger` Delete with inline confirm.
- Create/Edit form: author\*, role, quoteEn\*, quoteRw, published toggle, `[btnPrimary admin_form_create | admin_save] [btnSecondary admin_form_cancel]`.
- ⚠ **Backend gap (cross-phase):** editing a testimonial's content needs `PUT /admin/testimonials/:id` — today only `PATCH {published}` exists. Design is ready; the engineer files this as a backend Phase B item (route + model `update` already exists at `testimonialModel.update`).

---

## 9. Login + session-expired flash (defect 1's face)

```
<div className="admin-shell flex min-h-svh items-center justify-center px-4 py-16">
  <div className="w-full max-w-md">
    <div className="text-center">
      <p className="font-serif text-3xl font-semibold text-admin-text">{BRAND}</p>
      <p className="mt-1 text-sm text-admin-muted">{t("admin_area_sub")}</p>
    </div>

    <form className={cardCls + " mt-8 p-8 space-y-5"} onSubmit={submit}>
      {searchParams.get("expired") === "1" &&
        <div className={infoBanner} role="status">{t("admin_login_expired")}</div>}
      {error && <div className={errorBanner} role="alert">{error}</div>}

      [field] admin_email → adminInputCls (placeholder admin_login_email_placeholder)
      [field] admin_password → adminInputCls
      <button className={btnPrimary + " w-full h-11"} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t("admin_signin")}
      </button>
    </form>
  </div>
</div>
```

- Root gains `admin-shell` (dark canvas + focus ring switch).
- `?expired=1` renders the brass `infoBanner` (not an error — the user did nothing wrong; the session expired on its own).
- Invalid credentials keep the red `errorBanner` (`admin_login_invalid`).
- On success: `router.replace("/admin")` + `router.refresh()` (current flow retained).

---

## 10. A11y glossary (applies to every component)

1. **Focus-visible everywhere.** Global ring (`--focus-ring` under `.admin-shell`). Icon-only buttons carry `aria-label`s from i18n keys. No hover-only affordance may be the only way to reach a control (defect 3/8).
2. **Dialogs (§6.3)** — `role="dialog"`, `aria-modal`, `aria-labelledby`, ESC, focus trap, initial focus, focus restore, body scroll lock.
3. **Tables** — real triggers instead of row onClick (Reference buttons), `scope="col"` on all `th`, `aria-label` per action, never rely on `title` attributes.
4. **Pills/dots** — color + text label always; dots get `aria-hidden` when the adjacent label already exists (they are decorative then).
5. **Busy/error/empty announcements** — errors `role="alert"`, successes and refresh completions via `aria-live="polite"` sr-only regions.
6. **Labels** — every input has a visible `<label htmlFor>` (`adminFieldLabel`); placeholders never substitute labels.
7. **Reduced motion** — dialogs/skeletons/buttons collapse to static frames (globals.css handles the classes; JS autoplay isn't in the admin).
8. **Contrast** — text tokens all ≥4.5:1 (§3.1); margin indicators never encoded in color alone.
9. **Touch** — min control height `h-8`; inputs `h-10`; chips scroll (snap), never wrap/clip (defect 8).

---

## 11. i18n string inventory (new `DictKey`s — en + rw shorthand)

Rules: every key below is added to `en` and `rw` in `src/lib/i18n.tsx` together (typed `Record<keyof typeof en, …>` prevents drift — Phase B adds `: DictKey`-typed entries). Translations marked *(rw)* are shorthand, review by founder/translator. Keys marked **(reuse)** already exist.

### 11.1 Shell & globals

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `admin_nav_aria` | Admin navigation | Ibice by'umuyobozi |
| `admin_close` | Close | Funga |
| `admin_retry` | Retry | Ongera ugerageze |
| `admin_error_load` | Couldn't load this section. | Ntibishobotse gutanga iki gice. |
| `admin_error_generic` | Something went wrong. | Hari ikibazo cyabaye. |
| `admin_session_expired` | Your session has expired — please sign in again. | Kwinjira kwawe kwarangiye — ongera uhinjire. |
| `admin_unsaved_title` | Discard changes? | Kureka ibyahinduwe? |
| `admin_unsaved_body` | This form has unsaved changes. Leaving will lose them. | Iyi fishi ifite ibyahinduwe bitarabikwa. Gusohokamo bizabitakaza. |
| `admin_discard` | Discard | Kureka |
| `admin_keep_editing` | Keep editing | Komeza guhindura |
| `admin_save` | Save | Bika |
| `admin_saving` | Saving… | Birimo kubikwa… |
| `admin_saved` | Saved | Byabikwe |
| `admin_edit` | Edit | Hindura |
| `admin_delete_title` | Delete this item? | Siba iki kintu? |
| `admin_delete_body` | This action cannot be undone. | Iki gikorwa ntigishobora guhindurwa. |
| `admin_delete_confirm` | Yes, delete | Yego, siba |
| `admin_deleting` | Deleting… | Birimo gusibwa… |
| `admin_status_published` | Published | Byasohotse |
| `admin_status_draft` | Draft | Atarasohoka |
| `admin_featured` | Featured | By'ibanze |
| `admin_lang_en` | English | Icyongereza |
| `admin_lang_rw` | Kinyarwanda | Ikinyarwanda |

### 11.2 Dashboard

| DictKey | EN | RW |
|---|---|---|
| `admin_dash_sub` | At a glance: bookings, statuses and recent requests. | Incamake: ibyifuzo, ibyegeranyo n'ibisabwe biheruka. |
| `admin_dash_refresh` | Refresh | Vugurura |
| `admin_dash_updated` | Updated just now | Byavuguruwe ubu |
| `admin_dash_stat_total` | Total bookings | Ibyifuzo byose |
| `admin_dash_stat_clients` | Clients | Abakiriya |
| (statuses) | **(reuse)** `t(statusKey(s))` → track_received / track_confirm / track_in_production / track_delivered / track_completed / track_cancelled | — |
| `admin_dash_recent` | Recent bookings | Ibyifuzo biheruka |
| `admin_dash_view_all` | View all bookings | Reba ibyifuzo byose |
| `admin_dash_empty` | No bookings yet — incoming requests will appear here. | Nta byifuzo biracyariho — ibisabwe bizagaragara hano. |

### 11.3 Bookings

| DictKey | EN | RW |
|---|---|---|
| `admin_bookings_sub` | Search, filter and update production requests. | Shakisha, cyungura uhindure ibyifuzo by'imikoranire. |
| `admin_bookings_filter` | Filter bookings by status | Cyungura ibyifuzo ku byegeranyo |
| `admin_bookings_filter_all` | All statuses | Byose |
| `admin_bookings_col_ref` | Reference | Umubare |
| `admin_bookings_col_client` | Client | Umukiriya |
| `admin_bookings_col_service` | Service | Serivisi |
| `admin_bookings_col_status` | Status | Icyegeranyo |
| `admin_bookings_col_created` | Created | Byaremwe |
| `admin_bookings_empty` | No bookings match this filter. | Nta byifuzo bihuye n'icyegeranyo cyatoranyijwe. |
| `admin_bookings_open` | View booking | Reba icyifuzo |
| `admin_booking_client` | Client | Umukiriya |
| `admin_booking_contact` | Contact | Aho twabahuriraho |
| `admin_booking_production` | Production | Umurimo |
| `admin_booking_event_date` | Event date | Itariki y'ibirori |
| `admin_booking_location` | Location | Aho biherereye |
| `admin_booking_budget` | Budget | Amafaranga |
| `admin_booking_details` | Details | Ibindi |
| `admin_booking_update_status` | Update status | Hindura icyegeranyo |
| `admin_booking_no_transitions` | No further status changes for this booking. | Nta yandi mahinduka y'icyegeranyo kuri iki cyifuzo. |
| `admin_booking_note_label` | Note (optional) | Inyandiko (sibyo ngombwa) |
| `admin_booking_note_placeholder` | Internal note — shown on the client's timeline. | Inyandiko y'imo — igaragara ku rutonde rw'umukiriya. |
| `admin_booking_note_save` | Save note | Bika inyandiko |
| `admin_booking_timeline` | Timeline | Ibyabaye |
| `admin_booking_timeline_empty` | No status changes yet. | Nta mahinduka biracyariho. |
| `admin_booking_notifications` | Notifications | Ubutumwa bwoherejwe |
| `admin_booking_notifications_empty` | No notifications sent yet. | Nta butumwa bwoherejwe biracyariho. |
| `admin_booking_revoke` | Revoke tracking link | Kuraho urugero rwo gukurikirana |
| `admin_booking_revoke_title` | Revoke the tracking link? | Kuraho urugero rwo gukurikirana? |
| `admin_booking_revoke_body` | The client's tracking link will stop working immediately. They'll need to contact you for a new one. | Urugero rw'umukiriya ruzahagarara ako kanya. Azakenera kukubwira kugira ngo ahabwe urundi. |
| `admin_booking_revoke_keep` | Keep link | Gumana n'urugero |
| `admin_booking_revoke_confirm` | Yes, revoke | Yego, kuraho |
| `admin_booking_revoked` | Tracking link revoked. | Urugero rwakuyweho. |
| `admin_booking_status_live` | Booking status | Icyegeranyo cy'icyifuzo |

### 11.4 Collection manager (Services / Portfolio / Blog)

| DictKey | EN | RW |
|---|---|---|
| `admin_services_new` | New service | Serivisi nshya |
| `admin_services_empty` | No services yet — create your first service. | Nta serivisi iracyariho — kora ubwa mbere. |
| `admin_services_name_en` | Name (EN) * | Izina (EN) * |
| `admin_services_name_rw` | Name (RW) * | Izina (RW) * |
| `admin_services_desc_en` | Description (EN) | Ibisobanuro (EN) |
| `admin_services_desc_rw` | Description (RW) | Ibisobanuro (RW) |
| `admin_services_price_en` | Price (EN) * | Igiciro (EN) * |
| `admin_services_price_rw` | Price (RW) * | Igiciro (RW) * |
| `admin_services_category` | Category | Icyiciro |
| `admin_services_icon` | Icon | Akamenyetso |
| `admin_service_cat_photography` | Photography | Amafoto |
| `admin_service_cat_videography` | Videography | Amashusho |
| `admin_service_cat_livestreaming` | Livestreaming | Kwerekana ku mubare mubanza |
| `admin_service_cat_postproduction` | Post-production | Guhindura amashusho |
| `admin_service_cat_production` | Production | Umurimo |
| `admin_sort_order_hint` | Lower numbers appear first. | Imibare mito ibanza. |
| `admin_portfolio_new` | Add work | Ongeraho umurimo |
| `admin_portfolio_empty` | No work published yet — add your first production. | Nta mirimo yashyizwe ahagaragara — ongeraho umurimo wa mbere. |
| `admin_portfolio_title_en` | Title (EN) * | Umutwe (EN) * |
| `admin_portfolio_title_rw` | Title (RW) | Umutwe (RW) |
| `admin_portfolio_category` | Category | Icyiciro |
| `admin_portfolio_client` | Client | Umukiriya |
| `admin_portfolio_media_type` | Media type | Ubwoko bw'amashusho |
| `admin_portfolio_media_image` | Image | Ifoto |
| `admin_portfolio_media_video` | Video | Video |
| `admin_portfolio_tags` | Tags (comma separated) | Utumenyetso (utandukanyije n'imigabo) |
| `admin_portfolio_tags_hint` | e.g. Kigali, FAO, live | urugero: Kigali, FAO, live |
| `admin_portfolio_cover` | Cover image | Ifoto y'ibanze |
| (categories) | **(reuse)** `portfolio_filter_weddings/events/corporate/concerts/documentaries/portraits` | — |
| `admin_blog_new` | New post | Inyandiko nshya |
| `admin_blog_empty` | No posts yet — write your first story. | Nta nkuru iracyariho — andika iya mbere. |
| `admin_blog_field_title_en` | Title (EN) * | Umutwe (EN) * |
| `admin_blog_field_title_rw` | Title (RW) * | Umutwe (RW) * |
| `admin_blog_field_excerpt_en` | Excerpt (EN) | Impera (EN) |
| `admin_blog_field_excerpt_rw` | Excerpt (RW) | Impera (RW) |
| `admin_blog_field_content_en` | Content (EN) * | Umutwe w'inkuru (EN) * |
| `admin_blog_field_content_rw` | Content (RW) * | Umutwe w'inkuru (RW) * |
| `admin_blog_field_type` | Type | Ubwoko |
| `admin_blog_field_slug` | Slug | Slug |
| `admin_blog_slug_hint` | auto-generated from title if left empty | urakomoka ku mutwe niba hasigaye ubusa |
| `admin_blog_cover` | Cover image | Ifoto y'ibanze |
| `admin_blog_markdown` | Markdown supported. | Markdown iraremewe. |
| `admin_blog_col_title` | Title | Umutwe |
| `admin_blog_col_type` | Type | Ubwoko |
| `admin_blog_col_status` | Status | Icyegeranyo |
| `admin_blog_col_updated` | Updated | Byavuguruwe |
| (type labels) | **(reuse)** `blog_type_recap/story/guide/news` | — |
| (views/likes) | **(reuse)** `blog_views` / `blog_likes` | — |
| (image strings) | **(reuse)** `admin_service_image`/`admin_service_image_hint`/`admin_service_remove_image`/`admin_logos_uploading`/`admin_form_create`/`admin_form_cancel`/`admin_form_delete` | — |

### 11.5 Settings & login

| DictKey | EN | RW |
|---|---|---|
| `admin_settings_title` | Site settings | Igenamiterere ry'urubuga |
| `admin_settings_sub` | These values power the public site's hero, about section, and contact details. | Aya makuru atanga umurongo ku rubuga rusange: hero, abo turi bo n'aho duherereye. |
| `admin_settings_save` | Save changes | Bika impinduka |
| (logos) | **(reuse)** `admin_logos_*` | — |
| (testimonials) | **(reuse)** `admin_testimonials_*` | — |
| `admin_login_email_placeholder` | admin@creativesoundstudio.rw | admin@creativesoundstudio.rw |

---

## 12. Decisions the frontend-engineer must follow (binders)

1. **Tokens live in `globals.css`** (`:root` + `@theme inline`). This repo is Tailwind **v4 CSS-config** — there is no `tailwind.config.js` and none should be created. New tokens: add the var to `:root` AND the `@theme inline` map; never hardcode hexes in components.
2. **`ui.ts` (extended) is the ONLY class source.** Import + `cx()`; per-element overrides join LAST. If a primitive is missing, add it to `ui.ts` — never paste ad-hoc classes into a component.
3. **Every surface gets `.admin-shell`** on `/admin` and `/admin/login` roots (Phase B) — it switches the focus ring and dark canvas. Without it the panel renders cream (body default).
4. **i18n discipline:** every visible string uses a `DictKey`; this spec's §11 is the key table to add to `i18n.tsx`. Status labels reuse `statusKey()`/`postTypeKey()`; never `alert()`/`confirm()` — all replaced by banners + inline confirm steps.
5. **Motion binding:** `transition duration-150` (or `100` for rows) is already in the kit; new animations use the globals.css keyframes and the reduced-motion block.
6. **URL as state:** lift `tab` to `?tab=`, bookings filter to `?status=` (defect 2); read via `useSearchParams` in a Suspense boundary (pattern already used by `/login`).
7. **Keyboard contract:** rows are not click-only — the Reference cell button exists first in tab order; dialogs follow §6.3.
8. Blog delete + all mutations wrap errors into banners (no unhandled rejections).
9. Sessions: any `NOT_AUTHENTICATED` → `clearToken()` + `/admin/login?expired=1` (§9 flash).

## 13. Deliberately left for Phase B..E

- **Phase B (frontend-engineer):** the seven tab component rewrites per §4–§9, shell/page.tsx (`.admin-shell`, `?tab=`), login page rewrite, i18n.tsx key additions, global 401 handler. Purely mechanical against this spec + ui.ts.
- **Phase B (backend-engineer):** `PUT /admin/testimonials/:id` for testimonial editing; nothing else is needed — the bookings `note` field and `?status` filter already exist server-side.
- **Phase C:** portfolio multi-image gallery upload UI; services category data normalization across existing rows; optional testimonial drag-reorder; blog markdown live preview.
- **Phase D (content):** the founder-side strings review for the RW shorthand in §11, plus the public content items already open in PLAN.md.
- Not in scope and not designed: public site (cream theme, already redesigned), payments, notifications retry flows, pagination for large collections (only relevant past ~100 bookings/posts — a Phase E perf item).