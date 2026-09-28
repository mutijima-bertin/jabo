# Creative Sound Studio — Admin Interface Design Spec (Phase A)

> Status: **DESIGN LOCKED** · Phase A deliverable · Date: 2026-09-11 · **reconciled with Tier-1 admin 2026-09-24 (shipped, uncommitted)**
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

**Amended 2026-09-24 (Tier-1 admin).** Everything described in §4–§13 is now **implemented and
on disk** (uncommitted working tree, same session as the Phase-20 email/contact work). This
document was updated to describe the code as built, not as intended. The sections below are now
a *record* plus the contract future work must hold, not a build order. The two places where the
shipped code deliberately contradicts an original instruction are called out in place: the
**fluid §3.3 shell** and the **§4.1 sticky topbar** (neither existed when this spec was
authored). Open items live in §13a; the endpoints the admin consumes in §14.

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

- Page gutter `px-4 md:px-6 lg:px-8`; **shell max-width `max-w-[1600px]`, fluid below it** — see the deviation note below.
- Stack rhythm: `gap-2` inside chips/rows · `gap-3` inside fields · `gap-4` between form rows · `gap-6/8` between sections.
- Card padding `p-5`, table cells `px-5 py-3`, dialog body `p-6`.
- Section separations `mt-6` (within tab) / `mt-10` (between Settings sections with `border-t border-admin-line pt-8`).

> ⚠ **SHIPPED DEVIATION (2026-09-24, Tier-1 admin) — do not "fix" this back.**
> §3.3 originally **mandated** a fixed `max-w-[1440px]` content column (an explicit instruction to drop the old `max-w-6xl`). Phase B shipped `max-w-7xl` in its place. Tier-1 then replaced **both** with a **fluid** shell, at the user's explicit request ("give the admin a full-screen feel, not a narrow column"):
>
> ```ts
> // lib/ui.ts — shellMain
> "w-full px-4 md:px-6 lg:px-8 py-6 mx-auto max-w-[1600px]"
> ```
>
> - `max-w-[1600px]` is a **ceiling, not a column**: below 1600px the canvas is genuinely full-bleed, so tables and the recent-bookings card use the whole viewport instead of floating in the middle of a wide monitor.
> - `px-4 md:px-6 lg:px-8` is a **three-step** gutter, not the spec'd two-step `px-4 md:px-8` — `lg` buys back the horizontal room the cap would otherwise waste.
> - `py-6` (down from `py-8`) gives the sticky topbar (§4.1) the top boundary's job, so the two never stack into dead space.
> - `thCls`/`tdCls` moved `px-4` → **`px-5`** in the same pass: with a wider canvas the 16px cell padding read as cramped against the 20px (`p-5`) card padding.
>
> If a future ticket "normalizes" the shell back to a fixed max-width, that is a regression, not a cleanup — re-confirm with the founder first.

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

As built, plus the **Tier-1 sticky topbar** that now opens the main column. Note the extra
nesting level: `shellMain` is the fluid canvas (§3.3), and the sidebar/main split lives in a
plain inner flex row — the topbar therefore spans the **main column only**, never the sidebar.

```
<div className="admin-shell">                      ← root: dark canvas, brass focus ring, color-scheme: dark
  <Suspense fallback={<ShellFallback />}>           ← useSearchParams suspends on the server
  <div className={shellMain}>                       ← "w-full px-4 md:px-6 lg:px-8 py-6 mx-auto max-w-[1600px]"
    <div className="flex flex-col gap-8 md:flex-row md:gap-8">
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
        <header className={topbar}>                 ← STICKY, first child of the main column
          <div className={topbarInner}>
            <p className={topbarBreadcrumb}>
              <span className={topbarBrandLabel}>{BRAND}</span>          ← sm+ only
              <ChevronRight className={topbarSeparator} aria-hidden />
              <span className={topbarTabLabel}>{t(activeTab.label)}</span>
              <span className={topbarDate}>                            ← lg+ only
                {t("admin_topbar_date").replace("{date}", formatDate(today, locale))}
              </span>
            </p>
            <div className={topbarActions}>
              [search trigger] topbarSearchTrigger → setSearchOpen(true)   (§4.2 palette)
                <Search className={topbarIcon}/> <kbd className={topbarKbd}>⌘K</kbd>
              <AdminNotifications token={token} />                         (§4.2 bell)
              <span role="img" aria-label={t("admin_account_chip_aria")} className={accountChip}>A</span>
            </div>
          </div>
        </header>

        <AdminSearchPalette token open={searchOpen} onOpenChange={setSearchOpen} />
                                       ← mounted once; renders null while closed; owns ⌘K

        <nav className={mobileNav} aria-label={t("admin_nav_aria")}>   ← md:hidden
          [tab pill ×7]: className={active ? filterChipActive : filterChipInactive} + "shrink-0"
          <span className="mx-1 h-5 w-px shrink-0 bg-admin-line" aria-hidden />
          [logout pill]: filterChipInactive + "shrink-0 hover:text-admin-danger" (LogOut icon)
        </nav>

        <ToastProvider>                          ← toast host is z-[60], ABOVE dialogs
          <div className="mt-6 md:mt-0">
            {tab === "dashboard"   && <AdminDashboard token onOpenBookings={() => navigateTab("bookings")} />}
            {tab === "bookings"    && <AdminBookings token />}
            …
          </div>
        </ToastProvider>
      </div>
    </div>
  </Suspense>
</div>
```

**Render order in the main column is load-bearing: topbar → mobile pill nav → content.** The
topbar sits above the pill nav (it is the app's persistent chrome, not a tab affordance) and
the `ToastProvider` wraps only the content row, so `useToast()` is unavailable to the topbar
itself — by design, a topbar toast would race the bell's own refresh.

#### 4.1a Topbar `ui.ts` tokens (Tier-1)

| Token | Role |
|---|---|
| `topbar` | the sticky band: `sticky top-0 z-30 w-full border-b border-admin-line bg-admin-base/85 backdrop-blur-sm` |
| `topbarInner` | the aligned inner row: `mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-4` |
| `topbarBreadcrumb` | left cluster: `flex min-w-0 items-center gap-1.5 text-sm text-admin-muted` |
| `topbarBrandLabel` | `hidden min-w-0 truncate sm:inline` — the `BRAND` word is dropped on xs |
| `topbarTabLabel` | `min-w-0 truncate font-medium text-admin-text` |
| `topbarSeparator` | `h-3.5 w-3.5 shrink-0 text-admin-faint` (the `ChevronRight`) |
| `topbarIcon` | `h-4 w-4 shrink-0` — shared by the search and bell glyphs |
| `topbarActions` | `flex shrink-0 items-center gap-2` |
| `topbarSearchTrigger` | the fake-input search button (h-10, panel surface, hairline border) |
| `topbarKbd` | `hidden … md:inline-flex` `⌘K` keycap — the glyph is hidden below md |
| `topbarDate` | `hidden … lg:inline` — the date is a **large-screen** extra |
| `accountChip` | `h-9 w-9 rounded-full` initials avatar |

Rules the topbar inherits from §12.2: every one of these is exported from `ui.ts` and nothing
in `page.tsx` composes a topbar class by hand. `z-30` is deliberate — below dialogs (`z-50`),
the search overlay (`z-50`), the notification popover (`z-40`) and toasts (`z-[60]`).

`accountChip` is a **static placeholder**: it renders the literal `A` with
`aria-label={t("admin_account_chip_aria")}` and has no menu, no logout and no profile data
behind it. Real staff accounts are deferred (§13); the chip exists so the topbar's right
cluster reads as a finished row today. **It must not be dressed up as an account menu.**

### 4.2 Behavior contract

- **Nav state:** `aria-current="page"` on the active tab; the seven tabs remain `useState`-driven **but the engineer must lift `tab` into the URL** as `?tab=` (`router.replace()`), so the bookings tab can also carry `?status=` — this is the foundation defect-2 fix (`?status=` filter was unused). Read the initial tab from `useSearchParams` on mount; back/forward must work.
  - **Built:** `tab` is *derived*, never stored — `searchParams.get("tab")` validated against `VALID_TABS`, invalid values falling back to `dashboard` so a hand-typed `?tab=` never 404s or blanks the panel.
  - `navigateTab(next)` rewrites `?tab=` while **preserving** the other params, and **deletes `status` / `q` / `open`** when leaving `bookings` so a dead filter can never survive into another tab.
  - **Tab is read inside a `<Suspense>` boundary** (`ShellFallback` renders the same centered `Loader2` spinner) because `useSearchParams` suspends during prerender.
- **Logout:** `clearToken()` + `router.replace("/")` (unchanged behavior). No confirm — logout is cheap and reversible.
- **Session expiry (defect 1 — foundation):** introduce ONE global guard: `adminFetch` surfaces `"NOT_AUTHENTICATED"` on any 401; a shell-level handler (wrap the tab render in an error boundary per tab, or a tiny shared `useAdminRequest` wrapper) must `clearToken()` then `router.replace("/admin/login?expired=1")` **and** show a full-tab "session expired" card (icon + `admin_booking…` no → `admin_session_expired` + "Sign in again" `btnPrimary` linking to login) while the redirect happens. Never a silent blank panel. Login flash state (§9) is the in-page design for it.
- **Empty/middle states:** all collection/table tabs implement their own (§5–§9). The shell itself renders nothing while `!ready` except the existing centered spinner, restyled to `Loader2` with `text-accent` (already the case).

#### 4.2a `g`-chord tab shortcuts (Tier-1)

`g` then one letter jumps tabs, Linear/GitHub style. Registered as a single `window` keydown
listener in `AdminShellInner` — the same URL contract as the sidebar buttons, because it calls
`navigateTab` rather than a second state path.

| Chord | Tab | | Chord | Tab |
|---|---|---|---|---|
| `g` `d` | dashboard | | `g` `p` | portfolio |
| `g` `b` | bookings | | `g` `l` | blog |
| `g` `s` | services | | `g` `c` | clients |
| | | | `g` `t` | settings |

The first letters are unique, so the chord can never be ambiguous. The armed `g` lives in a
**ref** (no re-render) and **self-disarms after 1000ms**, so a stray `g` can never hijack a later
keystroke. Guards — all four must pass before a chord fires:

1. **No modifier keys** — `metaKey`/`ctrlKey`/`altKey` bail, so `⌘R`/`⌘P`/`⌥…` are untouched. `shiftKey` is *not* checked (the key is lowercased), which is intentional: `G`+key works.
2. **Palette closed** — the `g`-listener returns while `searchOpen` is true; the ⌘K overlay owns the keyboard.
3. **No open modal** — it bails when `document.querySelector('[role="dialog"][aria-modal="true"]')` matches, so an open booking dialog is never navigated out from under the founder.
4. **Not typing** — `isTypingTarget(e.target)` rejects `INPUT`/`TEXTAREA`/`SELECT`/`contentEditable`. Because the `keydown` target *is* the focused element, this one check also covers every field inside an open dialog.

A chord that resolves to the tab already open is swallowed (no `preventDefault`, no no-op
`router.replace`); `e.preventDefault()` runs only on a real navigation.

#### 4.2b Toast announcer (Tier-1)

`lib/toast.tsx` exports `ToastProvider` + `useToast()`. It lives in `lib/` beside `i18n.tsx`
because it is a cross-cutting provider, not a screen. Contract:

```ts
const { push } = useToast();
push("success", t("toast_status_changed"), { actionLabel: t("toast_undo"), onAction });
```

- **`push` takes already-translated strings** — `t(...)` is resolved by the caller that owns the wording, so the module stays free of the dictionary and the visible string is still a `DictKey`.
- Kinds are `success | warning | danger`; each maps to a `toast*` border + icon variant pair. Color is never alone: **every card carries a glyph and a border**.
- Host: `toastHost` — `pointer-events-none fixed … bottom-0 z-[60]`, so the whole strip is click-through and a toast raised from inside a dialog is never buried under its own `z-50` backdrop. Each card re-enables pointer events.
- A11y: the host is `role="status" aria-live="polite"` and is **mounted empty**, so assistive tech observes the live region before any text arrives.
- Auto-dismiss at `TOAST_MS = 4000`; `MAX_VISIBLE = 3` evicts the oldest so the stack can never cover the viewport. An **action does not extend the lifetime** — the card is dismissed *first*, then `onAction` runs, so a slow undo request never leaves an orphaned card behind.
- `useToast()` outside a provider returns a **no-op `push`** rather than throwing, so a component can render in isolation (tests, future routes) safely.
- Motion is `animate-admin-pop`, which globals.css already disables under `prefers-reduced-motion`.

#### 4.2c Notification bell (Tier-1 — `AdminNotifications.tsx`)

- **Data:** `useAdminFetch<AdminNotifResponse>("/admin/notifications?limit=30")`, re-polled every **`POLL_MS = 30_000`**. The interval is cleared on unmount and **paused while the dropdown is open** (the list is already on screen, and a mid-interaction re-render would be jarring). Rows are re-sorted newest-first client-side (ISO strings compare lexicographically).
- **Badge:** unread `≤ 9` → a red dot (`bellBadgeDot`); `10–99` → a brass count pill (`bellBadgeCount`); `> 99` → `"99+"`. The badge is always `aria-hidden` — **the count lives in the trigger's `aria-label`** (`notif_bell_aria` + `{n}`), per §2.9 (color/count is never the only signal).
- **Mark-read:** clicking a row `POST`s `/admin/notifications/read { ids: [id] }`; the footer button `POST`s `{}` (the contract's "empty body = all"). Both `reload()` afterward so the badge stays honest. Non-401 failures are best-effort — the panel keeps its current state rather than flashing an error.
- **Deep links:** each row's `linkHref` is a **relative query string on the admin page** (authored by the backend, e.g. `?tab=bookings&open=<id>`), never a full URL. `router.replace(pathname + linkHref)`. A row with `linkHref: null` (e.g. `SEND_FAILED`, which points nowhere) is marked read and stops there.
- **Row copy** is a per-type `notifTitle()` interpolation of `notif_*` keys against the free-form `payload`; `STATUS_CHANGED` nests `t(statusKey(payload.to))` so the new status is a real localized pill, and a testimonial with no author falls back to `notif_testimonial_generic`.
- **a11y — a popover, not a dialog:** no focus trap, but focus *does* move onto the panel (`tabIndex={-1}`) on open, ESC closes **and restores focus to the trigger**, outside-`mousedown` closes, and every row is a real `<button>` (min-h-10) whose `aria-label` prefixes `notif_unread` for unread rows. States: `skeletonRows(3)` while loading, `errorBanner`-style line + `admin_retry` on failure, `emptyState` + `CheckCheck` when caught up.

#### 4.2d ⌘K search palette (Tier-1 — `AdminSearchPalette.tsx`)

- **Open:** the `topbarSearchTrigger` button (`aria-haspopup="dialog"`, `aria-expanded`, `aria-controls={SEARCH_PANEL_ID}`) or the global `⌘K`/`Ctrl+K` listener, which is registered **on `window` inside this component** so one component owns the shortcut from every tab. It always `preventDefault()`s, so the browser's own "focus the search bar" is never triggered.
- **Query:** debounced **`DEBOUNCE_MS = 250`**. A trimmed term shorter than `SEARCH_MIN_TERM = 2` is **never sent** (the endpoint answers `400 VALIDATION` for those) and renders `search_hint_min_chars`. The request sequence is guarded by a monotonic `requestIdRef`, so an abandoned term's response can never repaint the list; the cleanup also bumps the id on close.
- **Results:** `GET /admin/search?q=` returns **4 groups, each capped at 5** (`bookings`, `clients`, `posts`, `services`). Empty groups are dropped; the panel then shows `search_none` / `search_none_body`. Post and service titles are localized with **locale-first EN/RW, falling back** to the other language.
- **Deep links per group:** bookings → `?tab=bookings&open=<id>` (opens the detail dialog, §6.1) · clients → `?tab=clients` · posts → `?tab=blog` · services → `?tab=services`. Bookings rows carry a `statusPill`, posts/services a `pubPill`.
- **Keyboard:** `ArrowDown`/`ArrowUp` walk the **flattened** list with wraparound; `Enter` opens the active row; `ESC` closes. Footer legend (`searchFooter` + `searchFooterKbd`) advertises ↑ ↓ / ↵ / Esc.
- **a11y contract (§6.3/§6.4 spirit):** `role="dialog"` + `aria-modal="true"` + dictionary `aria-label`; the field is a **combobox** (`aria-controls={LIST_ID}` + `aria-autocomplete="list"` + `aria-activedescendant` onto the active option) with `role="listbox"` / `role="group"` / `role="option"` below; the active option is marked by `aria-selected` **and** the `searchOptionActive` brass surface (never color alone — it is also the row Enter opens). `aria-activedescendant` is **dropped** while the list is replaced by a loading/empty/error state, since it may only point at a rendered option. Initial focus lands in the field, body scroll is locked while open, and focus returns to the previous element on close.
- **States:** `search_idle` (under-minimum hint), `search_loading` (spinner), `search_error` (+ `admin_retry` re-running the current term), `search_none`, and the grouped list. All four are announced through one `sr-only aria-live="polite"` region (`search_count` with `{n}` for the list).
- **Not in this pass:** result ranking beyond the backend's deterministic per-group ordering, and no ⌘K entry for *actions* (jump-to-tab, create) — it searches **records** only.

### 4.3 States
| State | Behavior |
|---|---|
| default | sidebar on md+, snap-scrolling pill row on mobile (`-mx-1 overflow-x-auto snap-x`, no wrap — defect-8 fix) |
| active tab | `sideLinkActive` (brass tint) / `filterChipActive` (brass fill) + `aria-current="page"` |
| ready false | centered `Loader2` spinner in `text-accent` |
| scrolled | the topbar stays `sticky top-0` with `bg-admin-base/85 backdrop-blur-sm` — content reads *through* it, never behind a solid bar |
| no token | centered `max-w-sm` card: `admin_area` + `admin_area_sub` + `btnPrimary` → `/admin/login` (never a bare redirect) |
| palette / bell open | the `g`-chord is inert (§4.2a); the topbar itself never unmounts |


---

## 5. Dashboard
### 5.1 Structure

Render order is load-bearing — the top two blocks are **above the payload's own
loading/error/empty branch**, so attention and health still speak when the dashboard
payload itself failed. `UPCOMING_VISIBLE = 8`.

```
pageHeader:
  h1 pageTitle          → t("admin_dashboard")
  p  pageSub            → t("admin_dash_sub")
  button iconBtnSecondary (RefreshCw) aria-label={t("admin_dash_refresh")}
       + <span className="sr-only" aria-live="polite">{updatedFlash}</span>

<AdminAttention token />        ← §5.5 · renders NULL when nothing is unread
<AdminHealthStrip token />      ← §5.6 · renders NULL while the probe is in flight

[error → errorBanner + Retry] | [loading → skeleton] | [empty → emptyState] | else:

  grid grid-cols-2 gap-4 sm:grid-cols-4:
    [8 × stat]: button className={statCardClickable} + aria-label (deep links)
        p statValue → number (Fraunces, brass)
        p statLabel → label

  card (upcoming productions):  ← §5.7 · hidden entirely when empty
    cardHeader: h2 (admin_upcoming_title) + badgeMuted count
    ul aria-label={t("admin_upcoming_aria")}:
      [≤ 8 × upcomingRow]: upcomingRowDate · linkCls reference · upcomingRowService
                            · upcomingRowContact · statusPill
    if (total > 8) <p className={upcomingMore}> admin_upcoming_more +{n} more

  rangeRow:  ← §5.8 · label + chips, sits directly above the charts
    p sectionLabel → t("chart_range_label")
    div filterRow role="group" aria-label={t("chart_range_label")}:
      [7|14|30|90 chip]: filterChipActive|filterChipInactive + aria-pressed + aria-label(chart_range_days)

  mt-6 grid gap-4 md:grid-cols-2:
    <DashboardCharts stats bookingsByDay topServices days={days} />   ← range-aware titles
    <QuickActions onOpenBookings />

  card (recent bookings):  ← §5.3
    cardHeader: h2 font-serif (reuse cardHeaderTitle) + count badge
    table in tableScrollWrap
    footer: btnGhost → t("admin_dash_view_all") (arrow icon)
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
| attention / health | independent of the above — both sit above the branch and render on their own fetches |

### 5.5 Attention queue — `AdminAttention.tsx` (Tier-1)

The "needs your attention" panel: a brass-edged block that answers *"what should I open
first?"* without opening anything.

- **Renders `null` when there is nothing unread** — `!data || unreadCount === 0 || rows.length === 0` all return `null`. An empty dashboard never shouts. It also mounts **above** the stat grid, so it is the first thing on the page when it exists.
- **Own fetch:** a second, independent `useAdminFetch<AdminNotifResponse>("/admin/notifications?limit=30")` — deliberately *not* folded into the `DashboardStats` payload, so the dashboard contract stays untouched. This mirrors the bell's endpoint, not its state.
- **Grouping:** unread rows are bucketed by `type` in `PRIORITY_TYPES` order — `NEW_BOOKING` · `NEW_CONTACT_MESSAGE` · `SEND_FAILED` · `TESTIMONIAL_SUBMITTED` — and **`STATUS_CHANGED` only surfaces when nothing else is unread**, because routine status churn must never outrank a new booking. A category with no deep link (`SEND_FAILED`, `linkHref: null`) degrades to a static `attentionRow` **div**; every other row is a `<button>` that `router.replace(pathname + href)`.
- **24h window:** `NEW_CONTACT_MESSAGE` is filtered to a trailing-24h window (`TWENTY_FOUR_HOURS_MS`) — a month-old message is not something the founder should act on today. `NEW_BOOKING` rows additionally show the **oldest** unread booking's date (`attention_oldest` + `formatDate`), so a stale queue is visible as such.
- **Signals:** `attentionPanel` (brass-tinted `rounded-2xl`, written out in full rather than composed from `cardCls` so the accent border deterministically outranks regular cards) · `countBadge*` per category (brass / warning / danger / success / muted) · `notifDot(type)` for the per-type hue. Layout is `grid gap-2 md:grid-cols-2` — two columns from md up. The header carries the brass total with an `aria-label` of `attention_title: <n>`.

### 5.6 System-health strip — `AdminHealthStrip.tsx` (Tier-1)

A slim one-line band between the attention panel and the stat grid, backed by
`GET /admin/health` → `{ status, uptimeSeconds, db, failedSends24h }`.

- **Own fetch**, like the attention panel — uptime and the 24h failure count are **never** folded into `DashboardStats`. The admin probe is distinct from the public `/health`, which deliberately exposes neither.
- **Silent while in flight** — `!data && !error` returns `null`: no skeleton, no layout jump on the happy path. It appears the moment it has something honest to say.
- **Two states, picked by a ternary, never by `cx()`** (Tailwind class order does not resolve same-slot color conflicts, so the danger variant is written out in full like `errorBanner`):
  - **green** — `healthStrip` + `healthDot`: `admin_health_ok` · `admin_health_db_ok` · `admin_health_failed_sends` · `admin_health_uptime`, joined by `aria-hidden` `·` separators (`healthSep`).
  - **danger** — `healthStripDanger` + `healthDotDanger`: a single `admin_health_db_down` line plus a 40px `iconBtnGhost` retry (`admin_retry`). Reached on **any** of: the request failed, `db !== "ok"`, or `status !== "ok"` — including a `200` that carries an unhealthy body.
- **Escalation without panic:** a non-zero `failedSends24h` keeps the **healthy** tone and escalates only that one metric to `healthMetricAlert` (warning hue). The strip never turns red for a number.
- `formatUptime(seconds)` (`lib/format.ts`) renders compact locale-neutral units — `3d 4h` · `23h 12m` · `45m` — interpolated into `admin_health_uptime`.

### 5.7 Upcoming productions card (Tier-1)

Sourced from the same `/admin/dashboard` payload (`upcoming`), which returns productions in the
**next 14 days** with status **not** `COMPLETED`/`CANCELLED`, `eventDate` ascending, capped at 20.

- **Hidden entirely when `upcoming` is empty** — no header, no "nothing scheduled" line. An empty schedule is not news.
- **Renders at most `UPCOMING_VISIBLE = 8` rows**; the cap is in the *card*, not the API, so the count badge always shows the true total and a `+{n} more` line (`upcomingMore`) appears when `total > 8`.
- **Not range-driven.** `?days=` moves the area chart only — the 14-day production window is fixed and deliberate, so a 7-day chart selection never hides a shoot that is actually coming up.
- Rows: `upcomingRowDate` (fixed `w-28` so the dates align down the card, `—` when `eventDate` is null) · a `linkCls` **reference button** deep-linking to `?tab=bookings&open=<id>` (§6.1) with the same `aria-label` shape as §5.3 · `upcomingRowService` (truncating `flex-1`) · `upcomingRowContact` · `statusPill`.

### 5.8 Chart date range (Tier-1)

`RANGES = [7, 14, 30, 90]`, defaulting to `14` to match the API default.

- `days` is **component state**, not a URL param — the dashboard does not read `?days=` from the URL, and `?days=` is not shared/bookmarkable. The fetch is `/admin/dashboard?days=${days}`; the backend validates against the same set and defaults to 14 when the param is absent, so the frontend and API can never disagree about the legal values.
- Chips reuse `filterChipActive`/`filterChipInactive` (the same pair as the status filters) inside a `filterRow` with `role="group"`, `aria-label={t("chart_range_label")}` and `aria-pressed` on each chip. The visible label is the bare numeral; the full meaning (`chart_range_days` → "Last {n} days") is the chip's `aria-label`.
- `DashboardCharts` takes `days` and derives **every** range-dependent string from it — the area-chart heading (`chart_range_title`), the `role="img"` label (`chart_range_area_aria`), the recharts `title` prop, and the empty state (`chart_range_empty`) — so the heading, the accessible name and the empty copy can never disagree.


---

## 6. Bookings

### 6.1 Screen structure
```
fieldSearchWrap mt-6 w-full sm:max-w-sm:      ← §6.6 free-text search (?q=)
  label sr-only → bookings_search_label
  fieldSearchIcon (absolute, pointer-events-none)
  input type="search" className={fieldSearchInput}  placeholder=bookings_search_placeholder
  fieldSearchClear (absolute right, ≥40px, only while non-empty)
if (term) <p className={adminFieldHint}>bookings_search_hint

filterRow (chips, mt-4): [All statuses | PENDING | CONFIRMED | IN_PRODUCTION | DELIVERED | COMPLETED | CANCELLED]
   role = navigation, aria-label = t("admin_bookings_filter")
   active chip = filterChipActive; label = "All" → admin_bookings_filter_all, others t(statusKey(s))
   click → router.replace(`?tab=bookings&status=${s | ""}`) — never a dead param (defect 2)

tableScrollWrap:
  table min-w-[840px]
  thead theadRow: thCls columns (admin_bookings_col_ref/_client/_service/_status/_created)
  tbody tbody (divide-admin-line), rows tbodyRow
```

**URL contract for this tab** — three params, all read from `useSearchParams`, all written
with `router.replace`:

| Param | Meaning | Source | Consumed by |
|---|---|---|---|
| `?status=` | status filter | §6.1 chips | `GET /admin/bookings?status=` |
| `?q=` | free-text filter | §6.6 search field | `GET /admin/bookings?q=` |
| `?open=` | deep-link a booking into the detail dialog | §4.2c bell, §4.2d palette, §5.7 upcoming card | **never sent to the API** |

`?open=` survives the `?q=`/`?status=` write-through (the search effect clones the existing
params) and is dropped by the shell's `navigateTab` the moment the founder leaves the tab.
`?status=` and `?q=` are **ANDed** server-side, so the combination is honest rather than a
filter that silently loses.

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
        live region: <p className="sr-only" aria-live="polite">{t("admin_bookings_status_live")} {lastApplied}</p>
        on success: push("success", t("toast_status_changed"), {actionLabel: t("toast_undo"), …})   ← §6.7

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
| Search empty | same empty state, with `?q=` still in the URL and the search field still populated |
| Busy (status/note) | affected buttons disabled + `Loader2` |
| Revoke busy | confirm buttons disabled; after success `successBanner`; row pill reflects revoked via toast on next load |

### 6.6 Free-text search — `?q=` (Tier-1)

- **URL-bound exactly like `?status=`**, per §4.2/§12.6. The list is the single source of truth; the field is a local mirror. `GET /admin/bookings?status=&q=` is only refetched once the **URL** actually changes, so the search term can never drift from what the server was asked.
- **Debounced write-through at `SEARCH_DEBOUNCE_MS = 300`.** Typing is instant (the input is controlled local state); only the URL lags, by one debounce. The effect clones the existing params, so `?status=` and `?open=` are preserved, and deletes `?q=` entirely when the field is emptied.
- **Echo suppression.** A `pushedRef` records what this component last wrote, so the effect that mirrors an *external* `?q=` change (back/forward, a shared link) back into the field can tell the router's own echo apart from a real change and will not fight itself. The mirror is deferred by a tick to respect the no-setState-in-effect-body rule.
- **Field anatomy** (ui.ts `fieldSearch*`): `fieldSearchWrap` is a `relative` anchor; the `Search` glyph is `fieldSearchIcon` (absolutely positioned, `pointer-events-none`, `left-3`, vertically centered); the input is `fieldSearchInput` — `adminInputCls` with `pl-9 pr-11` and the WebKit native `::-webkit-search-cancel-button` **suppressed**, because the repo ships its own clear button; `fieldSearchClear` is `iconBtnGhostSm` absolutely pinned right, so the tap target stays ≥40px like every other control. Label is `sr-only` (`bookings_search_label`), placeholder is `bookings_search_placeholder`, and `bookings_search_hint` sits below in `adminFieldHint` while a term is active — telling the founder *what* matches, not just that something might.
- **Server contract:** `q` is trimmed, `min(2)`, `max(60)`, `.optional()`, and **ANDs** with `status`. The predicate is the *same* `bookingTextWhere()` the ⌘K palette uses (reference · contact name · contact email · related service's bilingual name), so the list filter and the palette can never return different rows for the same word. The hint string deliberately over-promises slightly by naming location too — see §13.
- Because the backend rejects a 1-character term, the field's minimum useful input is 2 characters; there is no client-side error for it because the backend is never asked.

### 6.7 Status-change confirmation + Undo (Tier-1)

The status PATCH is the most destructive routine action in the admin, so it gets a
**reversible** outcome notice rather than a second confirm step (the buttons are already
`btnDangerGhost` for CANCELLED, and the transitions are server-validated).

- **Snapshot before the write.** `applyStatus` captures `previousStatus` (and the exact `noteText` that rode along) *before* the PATCH, so Undo replays the original pair — the note wording the founder typed is preserved, not reconstructed.
- **On success:** the list is reloaded, `detail` is re-fetched, the dialog's live region updates, and *then* `push("success", t("toast_status_changed"), { actionLabel: t("toast_undo"), onAction })`. By the time the toast exists, every local surface already agrees, so the dialog can never show a stale status next to the card.
- **The Undo action** dismisses the card first (§4.2b) and then `PATCH`es `{ status: previousStatus, note? }` back. A successful revert re-syncs the dialog and pushes `toast_undo_done`.
- **A rejected revert is never silent.** The backend answers `INVALID_TRANSITION` / `STATUS_UNCHANGED` (someone else moved the booking, or the old status is no longer reachable), so the dialog shows the `errorBanner` **and** a `danger` toast carrying the reason code — `toast_undo_failed` interpolates `{error}`, falling back to `toast_undo_error` when the server sent nothing.
- **A failed change produces no toast at all** — the existing `errorBanner` path is kept, so a failure is never dressed up as a confirmation. `NOT_AUTHENTICATED` routes to the session guard (§4.2) in both paths.
- The toast is chosen over an in-dialog success banner because the dialog may be **closed** by the time the founder looks for the confirmation; a global announcer survives that.


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

**Current state (2026-09-24, after Tier-1 admin):** **505 keys in `en`, 505 in `rw` — parity 505/505**, TS-enforced by the `rw: Record<keyof typeof en, string>` annotation (a missing RW key is a compile error, not a runtime fallback). Tier-1 added **64** keys on top of Phase-20's 441, in the families below: topbar layout (5) · `notif_*` (11) · `attention_*` (8) · `search_*` (17) · `bookings_search_*` (4) · `chart_range_*` (5) · `admin_upcoming_*` (3) · `toast_*` (5) · `admin_health_*` (6).

Two Tier-1 keys are documented as **reserved-but-unused** rather than deleted, so a future reader does not "fix" them into the code by accident: `admin_notifications_aria` (§11.1) is shadowed by `notif_bell_aria`, and `attention_status_changes` (§11.6) is only reachable when `STATUS_CHANGED` is the *only* unread type. See §13.

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
| **Sticky topbar (Tier-1, §4.1)** | | |
| `admin_search_placeholder` | Search… | Shakisha… |
| `admin_search_aria` | Search | Shakisha |
| `admin_notifications_aria` | Notifications | Ubutumwa — **reserved, unused** (the bell uses `notif_bell_aria`, which carries the unread count) |
| `admin_account_chip_aria` | Account | Konte |
| `admin_topbar_date` | Today, {date} | Uyu munsi, {date} |


### 11.2 Dashboard

Tier-1 additions for this tab (`admin_upcoming_*`, `chart_range_*`, `attention_*`, `admin_health_*`) are inventoried in **§11.6b/e/f/h**; the table below is unchanged from Phase B.

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

Tier-1 additions for this tab (`bookings_search_*`, `notif_*`, `toast_*`) are inventoried in **§11.6a/d/g**; the table below is otherwise unchanged from Phase B.

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

### 11.6 Tier-1 admin — notifications, attention, search, health, toasts (64 keys, all added 2026-09-24)

Every key is a `{placeholder}`-interpolated string resolved with `.replace("{name}", …)` at the
call site — the dictionary holds the *template*, never a concatenated sentence, so RW word
order stays free (§2.10).

#### 11.6a Notification bell & dropdown — `notif_*` (11, §4.2c)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `notif_panel_title` | Notifications | Ubutumwa |
| `notif_bell_aria` | Notifications ({n} unread) | Ubutumwa ({n} butarasomwa) |
| `notif_empty` | You're all caught up | Nta butumwa busigaye |
| `notif_unread` | Unread | Ntibyasomwe |
| `notif_mark_all` | Mark all as read | Andika byose nk'ibyasomwe |
| `notif_new_booking` | New booking {reference} | Icyifuzo gishya {reference} |
| `notif_status_changed` | {reference} is now {to} | {reference} ubu ni {to} |
| `notif_new_contact` | New message from {name} | Ubutumwa bushya bwa {name} |
| `notif_testimonial` | New testimonial from {author} | Ubuhamya bushya bwa {author} |
| `notif_testimonial_generic` | New testimonial to review | Ubuhamya bushya busaba isuzuma |
| `notif_send_failed` | Failed send to {recipient} | Kohereza {recipient} ntabwo byabaye |

#### 11.6b Dashboard attention queue — `attention_*` (8, §5.5)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `attention_title` | Needs your attention | Bisaba kwitabwaho |
| `attention_new_bookings` | New bookings | Ibyifuzo bishya |
| `attention_contact_messages` | Contact messages (24h) | Ubutumwa bw'abakiriya (amasaha 24) |
| `attention_failed_sends` | Failed sends | Ubutumwa butanzwe nabi |
| `attention_testimonials` | Testimonials to review | Ubuhamya busaba isuzuma |
| `attention_status_changes` | Status changes | Ibyegeranyo byahindutse — **only shown when it is the sole unread type** |
| `attention_open` | Open | Fungura |
| `attention_oldest` | oldest {date} | kera cyane {date} |

#### 11.6c ⌘K palette — `search_*` (17, §4.2d)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `search_palette_aria` | Search studio records | Shakisha ibikoreshwa bya studio |
| `search_palette_placeholder` | Search bookings, clients, posts, services… | Shakisha ibyifuzo, abakiriya, inkuru n'iserivisi… |
| `search_hint_min_chars` | Type at least 2 characters | Andika ibitaragoya 2 |
| `search_group_bookings` | Bookings | Ibyifuzo |
| `search_group_clients` | Clients | Abakiriya |
| `search_group_posts` | Blog posts | Inkuru z'blog |
| `search_group_services` | Services | Iserivisi |
| `search_idle` | Find anything in the studio | Shakisha ibintu byose muri studio |
| `search_loading` | Searching… | Birimo kushakisha… |
| `search_none` | No matches | Nta byahantu |
| `search_none_body` | Try a different reference, name, email or service. | Gerageza umubare w'icyifuzo, izina, email cyangwa serivisi indi. |
| `search_error` | Search failed — check your connection and try again. | Kushakisha ntibwakunze — generatora kandi ugerageze nanone. |
| `search_count` | {n} results | Abisanzwe: {n} |
| `search_clear` | Clear search | Siba ibishakisha |
| `search_footer_move` | move | uhunze |
| `search_footer_open` | open | fungura |
| `search_footer_close` | close | funga |

The three footer keys are **lowercase fragments**, not sentences — they sit after a `kbd` glyph
in the legend, so they must stay fragments in both locales.

#### 11.6d Bookings free-text search — `bookings_search_*` (4, §6.6)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `bookings_search_label` | Search bookings | Shakisha ibyifuzo |
| `bookings_search_placeholder` | Search reference, client or service… | Shakisha umubare, umukiriya cyangwa serivisi… |
| `bookings_search_clear` | Clear search | Siba ibishakisha |
| `bookings_search_hint` | Matches reference, client, service and location. | Bushakisha umubare, umukiriya, serivisi n'aho bizabera. |

#### 11.6e Chart date range — `chart_range_*` (5, §5.8)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `chart_range_label` | Date range | Igihe |
| `chart_range_days` | Last {n} days | Umunsi {n} gusa — *(rw shorthand: reads oddly; founder review pending)* |
| `chart_range_title` | Bookings — last {n} days | Ibyifuzo — umunsi {n} gusa |
| `chart_range_area_aria` | Area chart, new bookings per day over the last {n} days | Grafiki y'umuzigo: ibyifuzo ku munsi mu minsi {n} ishize |
| `chart_range_empty` | New bookings in the last {n} days will appear here. | Ibyifuzo bishya mu minsi {n} ishize bizagaragara hano. |

#### 11.6f Upcoming productions — `admin_upcoming_*` (3, §5.7)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `admin_upcoming_title` | Upcoming productions | Imirimo izaruzuka |
| `admin_upcoming_aria` | Upcoming productions in the next 14 days | Imirimo izaruzuka mu minsi 14 ikurikira |
| `admin_upcoming_more` | +{n} more | +{n} byindi |

`admin_upcoming_aria` hard-codes "14" in both locales because the window is a fixed backend
constant (`UPCOMING_WINDOW_DAYS`), not a user-chosen range — unlike `chart_range_*`, which
interpolates the chip value. If the window ever becomes configurable, this key must become a
`{n}` template.

#### 11.6g Toasts & Undo — `toast_*` (5, §4.2b / §6.7)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `toast_status_changed` | Status updated | Icyegeranyo cyahinduwe |
| `toast_undo` | Undo | Subira inyuma |
| `toast_undo_done` | Status change undone | Impinduka y'icyegeranyo yasubiywe |
| `toast_undo_failed` | Couldn't undo — {error} | Ntibyabasha gusozanya — {error} |
| `toast_undo_error` | Couldn't undo the status change. | Ntitibyabasha gusubiramo impinduka y'icyegeranyo. |

`toast_undo_failed` interpolates a **raw server reason code** (`INVALID_TRANSITION`,
`STATUS_UNCHANGED`). The template wraps the code rather than hiding it, so an operator can
match it against the backend log — the RW rendering of an untranslated code is a known,
accepted rough edge.

#### 11.6h System-health strip — `admin_health_*` (6, §5.6)

| DictKey | EN | RW (shorthand) |
|---|---|---|
| `admin_health_aria` | System health | Ibumwe bw' Sisitemu |
| `admin_health_ok` | System healthy | Sisitemu ihagaze neza |
| `admin_health_db_ok` | DB ok | DB ihagaze neza |
| `admin_health_db_down` | System unhealthy — DB unreachable | Sisitemu siyibaye neza — DB ntiboneka |
| `admin_health_failed_sends` | {n} failed sends (24h) | Ubutumwa {n} ntubwoherejwe (24h) |
| `admin_health_uptime` | up {n} | Ukelihe {n} — `{n}` is `formatUptime()` output (`3d 4h`), locale-neutral units |

Note: this family is **admin-only** and must never be reused on the public site — the public
`/health` endpoint deliberately exposes neither uptime nor the failure count (§5.6).


---

## 12. Decisions the frontend-engineer must follow (binders)

1. **Tokens live in `globals.css`** (`:root` + `@theme inline`). This repo is Tailwind **v4 CSS-config** — there is no `tailwind.config.js` and none should be created. New tokens: add the var to `:root` AND the `@theme inline` map; never hardcode hexes in components.
2. **`ui.ts` (extended) is the ONLY class source.** Import + `cx()`; per-element overrides join LAST. If a primitive is missing, add it to `ui.ts` — never paste ad-hoc classes into a component. **Tier-1 sharpened this, not loosened it:** the fluid shell, the whole sticky topbar (`topbar`, `topbarInner`, `topbarBreadcrumb`, `topbarBrandLabel`, `topbarTabLabel`, `topbarSeparator`, `topbarIcon`, `topbarActions`, `topbarDate`, `topbarSearchTrigger`, `topbarKbd`, `accountChip`), the search field (`fieldSearch*`), the palette (`search*`), the bell (`bellBadge*`, `notif*`), the attention panel (`attentionPanel`, `attentionRow`, `countBadge*`), the upcoming rows (`upcomingRow*`, `upcomingMore`), the health strip (`healthStrip*`, `healthDot*`, `healthLead*`, `healthMetric*`, `healthSep`), the toasts (`toast*`) and the `notifDot()` helper all live in `ui.ts` — **`page.tsx` composes topbar classes by importing, never by typing.** The one class a component may add on its own is a **layout-only join of existing kit tokens** (`cx(filterChipInactive, "shrink-0")`, `cx(cardCls, "mt-6")`).
   - Corollary, learned the hard way in Tier-1: when two variants touch the **same** class slot (borders, colors, backgrounds), write the losing one out in full — `healthStripDanger`, `attentionPanel`, `searchInput` — instead of `cx()`-ing two variants. Tailwind class *order* in the output string does not resolve same-slot conflicts.
3. **Every surface gets `.admin-shell`** on `/admin` and `/admin/login` roots (Phase B) — it switches the focus ring and dark canvas. Without it the panel renders cream (body default).
4. **i18n discipline:** every visible string uses a `DictKey`; this spec's §11 is the key table to add to `i18n.tsx`. Status labels reuse `statusKey()`/`postTypeKey()`; never `alert()`/`confirm()` — all replaced by banners + inline confirm steps. `{placeholder}` strings are templates resolved with `.replace()` at the call site, never concatenation. (One known violation is logged in §13.)
5. **Motion binding:** `transition duration-150` (or `100` for rows) is already in the kit; new animations use the globals.css keyframes and the reduced-motion block. Tier-1 reused `animate-admin-pop` for dialogs, the palette **and** toasts — a new keyframe would have been redundant.
6. **URL as state:** lift `tab` to `?tab=`, bookings filter to `?status=` and `?q=`, deep-link target to `?open=` (defect 2); read via `useSearchParams` in a Suspense boundary (pattern already used by `/login`). **`?days=` is the documented exception** — the dashboard range is deliberately component state, not a URL param (§5.8). **And every param the frontend writes must be read back somewhere** — §13 lists the one (`attention`) that currently is not.
7. **Keyboard contract:** rows are not click-only — the Reference cell button exists first in tab order; dialogs follow §6.3. Tier-1 adds the `g`-chord (§4.2a) and the ⌘K palette (§4.2d); both are registered on `window` at the shell, and both are inert while a modal owns the keyboard.
8. Blog delete + all mutations wrap errors into banners (no unhandled rejections). **Tier-1 rule:** a mutation's toast fires only on success, and a *reversal* of that mutation reports its own failure loudly (§6.7).
9. Sessions: any `NOT_AUTHENTICATED` → `clearToken()` + `/admin/login?expired=1` (§9 flash). Tier-1 routes every new `adminApi` call through `useSessionGuard()`; **401 is never handled locally** by the palette, the bell or the health strip.
10. **Layer discipline for the z-axis** (Tier-1): `topbar` `z-30` < notification popover `z-40` < dialogs / search overlay `z-50` < **toasts `z-[60]`**. The only reason toasts sit above dialogs is the §6.7 Undo, which is raised from inside an open dialog.
11. **The gate is `npm run lint` (`eslint`), not `next lint`.** Per the Next 16 upgrade guide, "the `next lint` command has been removed. Use Biome or ESLint directly" — and, critically, **`next build` no longer runs linting**, so a green build is *not* a lint signal. `frontend/package.json` maps `lint` to a bare `eslint` call; do not "restore" a `next lint` invocation, it targets a command that no longer exists. **Turbopack is the default bundler** in Next 16 (`next dev` / `next build`) — there is no `--turbo` flag to add, and `next.config.ts` pins only `turbopack.root` at the repo root (so a stray lockfile outside the repo can't be picked up) plus the `images.qualities` allowlist, the `/uploads` rewrite and the CSP. E2E stays Playwright (`frontend/e2e/*.spec.ts`); there is no Vitest-in-browser in this repo.
12. **Parity is a build-time invariant, not a test.** `rw: Record<keyof typeof en, string>` means a missing RW key fails `tsc`. Tier-1 stands at **505/505**.

## 13. Deliberately left for Phase B..E

**Shipped in Phase B (2026-09-12) — the seven tab rewrites, `?tab=` shell, login rewrite, `i18n.tsx` additions, global 401 handler, and `PUT /admin/testimonials/:id`.** All of the below is what came *after*.

### 13a Still open — Tier-2 / Tier-3 deferrals from Tier-1 admin

| # | Deferred | Why | Blocked on |
|---|---|---|---|
| 1 | **Staff roles + staff accounts + 2FA** | The app is single-admin by design (`AdminNotification` has no `userId` on purpose). Adding staff means a `Role` enum, a real login-flow change, and a security posture the founder has not chosen. | **Founder-only decision** — do not start without it. |
| 2 | **Bulk actions** (multi-select → set status / delete / reorder) | Needs a selection model across the tables plus a batch endpoint. Tier-1 shipped single-row actions only. | 1 (who is allowed to bulk-move a booking?) |
| 3 | **CSV export** (bookings, clients, invoices) | Report shape, column set and PII scope are a product decision, not an engineering one. | Founder |
| 4 | **Client merge** (two `Client` rows → one, re-pointing bookings + testimonials) | Destructive, needs a preview + undo strategy, and interacts with magic-link tokens. | 1 |
| 5 | **Pagination** on the bookings/clients lists | Lists still render every row. Only becomes real past ~100 bookings; the admin is one founder. | Volume |
| 6 | **Full month calendar** for the production schedule | Tier-1 shipped an *upcoming list* (14 days, 8 rows) because a calendar needs a real availability model. | 5, and a scheduling decision |
| 7 | **Full contact-inbox tab** | `ContactMessage` rows are now **persisted** (Tier-1) and the bell deep-links at them, but there is no read/search/reply UI. `?tab=dashboard&attention=contact` has nowhere to land. | — ready to build |
| 8 | **Email mirror of the in-app notifications** | The bell is in-app only; there is no digest or per-event admin email. | 1 (per-staff addressing) |
| 9 | **`?tab=dashboard&attention=contact` is a dead param today** | The backend authors it on every `NEW_CONTACT_MESSAGE`, but **no frontend code reads `attention`**. The founder lands on the dashboard with an ignored query string — exactly the defect-2 "dead param" this spec bans. Needs either a real inbox (#7) or an `AdminAttention` scroll-and-focus consumption. Until then, treat the deep link as landing on the dashboard. | 7 |
| 10 | **`AdminAttention` can disagree with the bell badge** | Attention fetches `/admin/notifications?limit=30` **without `unread=1`** and filters the 24h contact window **client-side**, so past 30 notifications the attention panel's grouping can fall behind the backend-computed `unreadCount` the bell shows. Also means the documented `?unread=1` filter is currently unused. | Small fix (use the param / a dedicated count) |
| 11 | **Bookings search hint over-promises** | `bookings_search_hint` says "reference, client, service and **location**", but `bookingTextWhere()` matches reference · contact name · contact email · service name — **not** `location`. Either narrow the string or add the column to the predicate. | Copy or one-line model change |
| 12 | **One hardcoded EN string survives on the dashboard** | `DashboardCharts` still renders `New bookings per day, oldest to newest.` as a literal, directly under now-i18n'd neighbours (`chart_range_title` / `chart_range_area_aria` / `chart_range_empty`) — a §2.10 / §12.4 violation. Pre-existing, but Tier-1 widened the gap. | A new `DictKey` pair |
| 13 | **Reserved-but-unused keys** | `admin_notifications_aria` (shadowed by `notif_bell_aria`) and `attention_status_changes` (reachable only when it is the sole unread type). Left in place deliberately; delete or wire them when the above lands. | — |
| 14 | **Palette searches records, not actions** | ⌘K has no "new booking" / "jump to tab" entries, and ranking is the backend's deterministic per-group order. | — |
| 15 | **`accountChip` is a placeholder** | A static `A` with an `aria-label` and no menu, no logout, no profile. It exists so the topbar's right cluster reads as finished; it must not be presented as a working account menu. | 1 |
| 16 | `AdminNotification` rows are never pruned | No retention job; the table grows monotonically forever. | 1 (per-staff read state makes pruning safe) |

### 13b Unchanged from the original spec

- **Phase C:** portfolio multi-image gallery upload UI; services category data normalization across existing rows; optional testimonial drag-reorder; blog markdown live preview.
- **Phase D (content):** the founder-side strings review for the RW shorthand in §11 — **now including all of §11.6**, where several RW strings are explicitly marked as needing review (`chart_range_days`, `toast_undo_failed`'s untranslated code) — plus the public content items already open in PLAN.md.
- Not in scope and not designed: public site (cream theme, already redesigned), payments, notifications retry flows.

---

## 14. Tier-1 admin API contract (2026-09-24)

The admin UI cannot be reasoned about without these, so the contract is recorded here even
though it is owned by api-designer / backend-engineer. All routes sit behind `requireAdmin`.
Frontend types live in `frontend/src/lib/api.ts`.

### 14.1 Notifications (§4.2c, §5.5)

```
GET  /api/admin/notifications?limit=<1..50, default 20>&unread=<0|1>
     → { items: AdminNotifItem[], unreadCount: number }
POST /api/admin/notifications/read  { ids?: string[] }   ← max 100
     → { ok: true }
```

`AdminNotifItem` = `{ id, type, payload, linkHref, readAt, createdAt }` — `payload` is raw JSONB
(**every field is optional**: the UI interpolates defensively and falls back to `—`), `linkHref`
is a **relative admin query string** (`"?tab=bookings&open=<id>"`), `readAt: null` = unread.
`unreadCount` is computed server-side and is **independent of `limit`**.

**Omitting `ids` marks ALL unread rows read.** The bell's "mark all" button relies on this.

`AdminNotificationType` enum = `NEW_BOOKING` · `STATUS_CHANGED` · `NEW_CONTACT_MESSAGE` ·
`TESTIMONIAL_SUBMITTED` · `SEND_FAILED`. The single `AdminNotification` model has **no `userId`** —
single-admin by design, staff accounts are deferred (§13a #1).

Event writers, all through `services/adminNotifications.ts::notifyAdmin()` — which **never
throws**, so a notification-storage hiccup can never break the request that triggered it:

| Event | `linkHref` | Written from |
|---|---|---|
| `NEW_BOOKING` | `?tab=bookings&open=<id>` | `services/bookings.ts` `createBooking` |
| `STATUS_CHANGED` | `?tab=bookings&open=<id>` | `services/bookings.ts` `updateBookingStatus` |
| `NEW_CONTACT_MESSAGE` | `?tab=dashboard&attention=contact` | `controllers/public.controller.ts` `contact` |
| `TESTIMONIAL_SUBMITTED` | `?tab=settings` | `controllers/clients.controller.ts` `postTestimonial` |
| `SEND_FAILED` | `null` | `services/notifications.ts` `log()` — fires **only** on `status === "failed"`, one row per failed delivery attempt (`skipped`, e.g. SMTP unconfigured, deliberately does **not** raise a bell) |

Migration `20260924084956_admin_notifications_contact_messages` added both
`AdminNotification` and `ContactMessage`.

### 14.2 Global search (§4.2d)

```
GET /api/admin/search?q=<term>   ← trimmed, min 2, max 60
    → { bookings: BookingHit[], clients: ClientHit[], posts: PostHit[], services: ServiceHit[] }
```

**Every group is always present** (empty array, never omitted) and **capped at 5**
(`SEARCH_RESULT_LIMIT`), so the palette renders sections unconditionally. Ordering is
deterministic per group (bookings newest-first · clients by name · posts by `publishedAt` desc
with nulls last so drafts sink · services by catalog `sortOrder`).

`bookingTextWhere(term)` is the **one** booking free-text predicate, shared with the bookings
`?q=` filter (§6.6) so the list and the palette can never disagree: reference · contact name ·
contact email · related service's `nameEn`/`nameRw`. (No `location` — see §13a #11.)

### 14.3 Dashboard (§5.6–§5.8)

```
GET /api/admin/dashboard?days=<7|14|30|90, default 14>
    → { stats, bookingsByDay, topServices, counts, recent, upcoming }
```

- `days` is validated against the same tuple the UI offers; anything else is `400 VALIDATION`. `bookingsByDay` is zero-filled, **one entry per requested day**, oldest → newest, computed in UTC.
- `upcoming` is **always present** (empty array when nothing is scheduled): productions in the **next 14 days** (`UPCOMING_WINDOW_DAYS`), status **not** `COMPLETED`/`CANCELLED` (`UPCOMING_EXCLUDED_STATUSES`), `eventDate` ascending, **capped at 20** (`UPCOMING_LIMIT`). The API cap (20) and the UI cap (`UPCOMING_VISIBLE = 8`) are independent on purpose — the count badge shows the true total and `+{n} more` covers the gap.

### 14.4 Health (§5.6)

```
GET /api/admin/health
    200 { status: "ok", uptimeSeconds, db: "ok", failedSends24h }
    500 { error: "DB_DOWN" }
```

Distinct from the public `/health`, which **deliberately exposes neither uptime nor the failure
count**. A dead database is still JSON, never a crash. `failedSends24h` counts
`NotificationLog.status === "failed"` in a trailing 24h window.

### 14.5 Bookings list (§6.6)

```
GET /api/admin/bookings?status=<BookingStatus>&q=<term, min 2, max 60>
```

`status` and `q` are **both optional and AND together**; the response row shape is unchanged.
`q` is `undefined` when the UI clears the field — the UI simply omits the param rather than
sending an empty `q=`, so the `min(2)` validation is never hit by a cleared field.
