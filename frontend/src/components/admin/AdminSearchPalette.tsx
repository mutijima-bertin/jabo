"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  Loader2,
  Mic,
  Newspaper,
  Search,
  SearchX,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { adminApi, useSessionGuard } from "@/lib/admin";
import { SEARCH_MIN_TERM, type SearchResults } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { statusKey, useI18n, type DictKey, type Locale } from "@/lib/i18n";
import {
  btnSecondary,
  clearIcon,
  cx,
  emptyStateBody,
  emptyStateIcon,
  emptyStateTitle,
  pubPill,
  searchFooter,
  searchFooterKbd,
  searchGroupLabel,
  searchInput,
  searchInputClear,
  searchInputIcon,
  searchInputWrap,
  searchOption,
  searchOptionActive,
  searchOptionIcon,
  searchOptionIconWrap,
  searchOptionMeta,
  searchOptionTitle,
  searchOptionTitleActive,
  searchOverlay,
  searchPanel,
  searchResults,
  searchState,
  statusPill,
} from "@/lib/ui";
import { useFocusTrap } from "./shared/useFocusTrap";

/** Debounce for the `q` fetch — long enough to type a word, short enough to feel live. */
const DEBOUNCE_MS = 250;

const LIST_ID = "admin-search-list";
const INPUT_ID = "admin-search-input";
/** Stable id the topbar trigger points `aria-controls` at while the palette is open. */
export const SEARCH_PANEL_ID = "admin-search-palette";

type GroupKey = "bookings" | "clients" | "posts" | "services";

/** Group order + per-family icon (groups with no hits are dropped). */
const GROUPS: Array<{ kind: GroupKey; label: DictKey; icon: typeof CalendarCheck }> = [
  { kind: "bookings", label: "search_group_bookings", icon: CalendarCheck },
  { kind: "clients", label: "search_group_clients", icon: Users },
  { kind: "posts", label: "search_group_posts", icon: Newspaper },
  { kind: "services", label: "search_group_services", icon: Mic },
];

/** One flattened, clickable result — `href` is the admin-page query string. */
interface Row {
  key: string;
  title: string;
  meta: string;
  href: string;
  /** Booking status (statusPill) — bookings only. */
  status?: string;
  /** Publication state (pubPill) — posts & services only. */
  published?: boolean;
}

type Status = "idle" | "loading" | "error" | "none";

/** Locale-first EN/RW title, falling back to the other language. */
function localizedTitle(locale: Locale, en: string | null, rw: string | null): string {
  return (locale === "rw" ? rw || en : en || rw) || "";
}

/**
 * ⌘K global search palette.
 *
 * Opened by the topbar search trigger (`open`/`onOpenChange`) or by the global
 * ⌘K / Ctrl+K listener registered HERE on `window`, so one component owns the
 * shortcut. Data comes from `GET /admin/search?q=` (4 groups, max 5 hits each);
 * a trimmed term shorter than `SEARCH_MIN_TERM` is never sent (the API answers
 * 400 VALIDATION for those) and renders the "type at least 2 characters" hint.
 *
 * a11y (spec §6.3/§6.4 spirit): `role="dialog"` + `aria-modal` + an
 * `aria-label` from the dictionary; the field carries the combobox pattern
 * (`aria-controls` + `aria-activedescendant` onto the active option);
 * ArrowUp/Down walk the FLATTENED list, Enter opens the active row, ESC and
 * backdrop clicks close, Tab is trapped inside the panel (`useFocusTrap`),
 * initial focus lands in the field, focus returns to the trigger on close, and
 * the body scroll is locked while open.
 */
export function AdminSearchPalette({
  token,
  open,
  onOpenChange,
}: {
  token: string;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const guard = useSessionGuard();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // aria-modal promises a focus trap; the palette now keeps that promise
  // (Tab/Shift+Tab cycle inside the panel) via the shared hook.
  const panelRef = useFocusTrap<HTMLDivElement>(open);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  // Monotonic id: the newest request wins; the debounce cleanup bumps it so a
  // response for an abandoned term can never repaint the list.
  const requestIdRef = useRef(0);

  /** Close = clear the session, then hide — every close path goes through here. */
  const close = useCallback(() => {
    setQuery("");
    setResults(null);
    setStatus("idle");
    setError("");
    setActive(0);
    onOpenChange(false);
  }, [onOpenChange]);

  /** One search request. Shared by the debounced effect and the Retry button. */
  const runSearch = useCallback(
    (term: string) => {
      const id = ++requestIdRef.current;
      setStatus("loading");
      setError("");
      adminApi
        .get<SearchResults>(`/admin/search?q=${encodeURIComponent(term)}`, token)
        .then((data) => {
          if (requestIdRef.current !== id) return;
          setResults(data);
          setActive(0);
          const total =
            (data.bookings?.length ?? 0) +
            (data.clients?.length ?? 0) +
            (data.posts?.length ?? 0) +
            (data.services?.length ?? 0);
          setStatus(total === 0 ? "none" : "idle");
        })
        .catch((e) => {
          if (requestIdRef.current !== id) return;
          // 401 belongs to the centralized session guard — never handled here.
          if ((e as Error).message === "NOT_AUTHENTICATED") {
            guard();
            return;
          }
          setError((e as Error).message);
          setStatus("error");
        });
    },
    [token, guard],
  );

  // Global ⌘K / Ctrl+K — toggles the palette and always swallows the browser's
  // own "focus the search bar" shortcut. Registered while mounted, so the
  // shortcut works from any admin tab.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "k" && e.key !== "K") return;
      if (!e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      if (open) close();
      else onOpenChange(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close, onOpenChange]);

  // Initial focus in the field + body scroll lock + focus restore on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      requestIdRef.current += 1; // drop any in-flight response
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  // Debounced search — nothing is requested below the minimum term, and stale
  // results are cleared in the onChange handler (never setState in an effect body).
  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < SEARCH_MIN_TERM) return;
    const handle = setTimeout(() => runSearch(term), DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      requestIdRef.current += 1;
    };
  }, [open, query, runSearch]);

  // Grouped rows (localized with the ACTIVE locale), then the flat list the
  // keyboard walks.
  const groups = useMemo(() => {
    const out: Array<{ kind: GroupKey; label: DictKey; icon: typeof CalendarCheck; rows: Row[] }> = [];
    for (const group of GROUPS) {
      const rows: Row[] = [];
      if (group.kind === "bookings") {
        for (const b of results?.bookings ?? []) {
          rows.push({
            key: `b-${b.id}`,
            title: `${b.reference} — ${b.contactName}`,
            meta: [b.serviceName, formatDate(b.createdAt, locale)].filter(Boolean).join(" · "),
            href: `?tab=bookings&open=${encodeURIComponent(b.id)}`,
            status: b.status,
          });
        }
      }
      if (group.kind === "clients") {
        for (const c of results?.clients ?? []) {
          rows.push({
            key: `c-${c.id}`,
            title: c.name,
            meta: [c.email, c.phone].filter(Boolean).join(" · ") || "—",
            href: "?tab=clients",
          });
        }
      }
      if (group.kind === "posts") {
        for (const p of results?.posts ?? []) {
          rows.push({
            key: `p-${p.id}`,
            title: localizedTitle(locale, p.titleEn, p.titleRw),
            meta: p.slug,
            href: "?tab=blog",
            published: p.published,
          });
        }
      }
      if (group.kind === "services") {
        for (const s of results?.services ?? []) {
          rows.push({
            key: `s-${s.id}`,
            title: localizedTitle(locale, s.nameEn, s.nameRw),
            meta: s.category,
            href: "?tab=services",
            published: s.published,
          });
        }
      }
      if (rows.length > 0) out.push({ ...group, rows });
    }
    return out;
  }, [results, locale]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  // Keep the keyboard-active row inside the scroll viewport.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, groups]);

  function onQueryChange(next: string) {
    setQuery(next);
    setActive(0);
    if (next.trim().length < SEARCH_MIN_TERM) {
      // Below the minimum term there is nothing to show — drop stale results
      // here (an event handler) rather than from the fetch effect.
      setResults(null);
      setStatus("idle");
      setError("");
    }
  }

  function openRow(row: Row) {
    close();
    router.replace(pathname + row.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      const row = flat[active];
      if (!row) return;
      e.preventDefault();
      openRow(row);
    }
  }

  if (!open) return null;

  // aria-activedescendant may only point at a rendered option — the listbox is
  // replaced by the loading/empty/error state, so the id is dropped there.
  const listVisible = status === "idle" && flat.length > 0;
  const activeId = listVisible && flat[active] ? `${LIST_ID}-${flat[active].key}` : undefined;
  const liveMessage =
    status === "loading"
      ? t("search_loading")
      : status === "none"
        ? t("search_none")
        : status === "error"
          ? t("search_error")
          : listVisible
            ? t("search_count").replace("{n}", String(flat.length))
            : "";

  return (
    <div className={searchOverlay} role="presentation" onClick={close}>
      <div
        id={SEARCH_PANEL_ID}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("search_palette_aria")}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // ESC from anywhere in the panel closes (the field stops it first).
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
        }}
        className={searchPanel}
      >
        <div className={searchInputWrap}>
          <Search className={searchInputIcon} aria-hidden="true" />
          <input
            id={INPUT_ID}
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-label={t("search_palette_aria")}
            autoComplete="off"
            spellCheck={false}
            className={searchInput}
            placeholder={t("search_palette_placeholder")}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {query.length > 0 && (
            <button
              type="button"
              className={searchInputClear}
              aria-label={t("search_clear")}
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
            >
              <X className={clearIcon} />
            </button>
          )}
        </div>

        {/* Status announcements — polite, so typing is never interrupted. */}
        <p className="sr-only" aria-live="polite">
          {liveMessage}
        </p>

        {status === "loading" ? (
          <div className={searchState}>
            <Loader2 className={cx(emptyStateIcon, "animate-spin")} aria-hidden="true" />
            <p className={emptyStateTitle}>{t("search_loading")}</p>
          </div>
        ) : status === "error" ? (
          <div className={searchState}>
            <TriangleAlert className={emptyStateIcon} aria-hidden="true" />
            <p className={emptyStateTitle}>{t("search_error")}</p>
            {error && <p className={emptyStateBody}>{error}</p>}
            <button
              type="button"
              className={btnSecondary}
              onClick={() => runSearch(query.trim())}
              disabled={query.trim().length < SEARCH_MIN_TERM}
            >
              {t("admin_retry")}
            </button>
          </div>
        ) : status === "none" ? (
          <div className={searchState}>
            <SearchX className={emptyStateIcon} aria-hidden="true" />
            <p className={emptyStateTitle}>{t("search_none")}</p>
            <p className={emptyStateBody}>{t("search_none_body")}</p>
          </div>
        ) : !listVisible ? (
          <div className={searchState}>
            <Search className={emptyStateIcon} aria-hidden="true" />
            <p className={emptyStateTitle}>{t("search_idle")}</p>
            <p className={emptyStateBody}>
              {query.trim().length < SEARCH_MIN_TERM ? t("search_hint_min_chars") : t("search_loading")}
            </p>
          </div>
        ) : (
          <div
            ref={listRef}
            id={LIST_ID}
            role="listbox"
            aria-label={t("search_palette_aria")}
            className={searchResults}
          >
            {groups.map((group) => {
              const GroupIcon = group.icon;
              const labelId = `${LIST_ID}-${group.kind}-label`;
              return (
                <div key={group.kind} role="group" aria-labelledby={labelId}>
                  <p id={labelId} className={searchGroupLabel}>
                    {t(group.label)}
                  </p>
                  {group.rows.map((row) => {
                    const isActive = flat[active]?.key === row.key;
                    return (
                      <button
                        key={row.key}
                        type="button"
                        id={`${LIST_ID}-${row.key}`}
                        role="option"
                        aria-selected={isActive}
                        className={isActive ? searchOptionActive : searchOption}
                        onMouseEnter={() => setActive(flat.findIndex((r) => r.key === row.key))}
                        onClick={() => openRow(row)}
                      >
                        <span className={searchOptionIconWrap} aria-hidden="true">
                          <GroupIcon className={searchOptionIcon} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={isActive ? searchOptionTitleActive : searchOptionTitle}>
                            {row.title}
                          </span>
                          {row.meta && <span className={searchOptionMeta}>{row.meta}</span>}
                        </span>
                        {row.status && (
                          <span className={statusPill(row.status)}>{t(statusKey(row.status))}</span>
                        )}
                        {row.published !== undefined && (
                          <span className={pubPill(row.published)}>
                            {row.published ? t("admin_status_published") : t("admin_status_draft")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <footer className={searchFooter}>
          <span className="flex items-center gap-1.5">
            <kbd className={searchFooterKbd}>↑</kbd>
            <kbd className={searchFooterKbd}>↓</kbd>
            {t("search_footer_move")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={searchFooterKbd}>↵</kbd>
            {t("search_footer_open")}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={searchFooterKbd}>Esc</kbd>
            {t("search_footer_close")}
          </span>
        </footer>
      </div>
    </div>
  );
}
