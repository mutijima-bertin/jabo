"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Inbox, Loader2, RotateCcw, Search, X } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import { SEARCH_MIN_TERM, type Booking } from "@/lib/api";
import { STATUS_ORDER, statusKey, useI18n } from "@/lib/i18n";
import {
  adminFieldHint,
  adminFieldLabel,
  adminTextareaCls,
  badgeDanger,
  badgeSuccess,
  btnDanger,
  btnDangerGhost,
  btnSecondary,
  btnSm,
  cardCls,
  clearIcon,
  confirmBody,
  confirmBox,
  confirmTitle,
  cx,
  dialogBody,
  dialogFooter,
  dialogHeader,
  dialogTitle,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  fieldSearchClear,
  fieldSearchIcon,
  fieldSearchInput,
  fieldSearchWrap,
  filterChipActive,
  filterChipInactive,
  filterRow,
  loadingState,
  pageHeader,
  pageSub,
  pageTitle,
  rowActionDanger,
  sectionLabel,
  skeletonRows,
  statusPill,
  successBanner,
  table,
  tableScrollWrap,
  tbody,
  tbodyRow,
  tdCls,
  thCls,
  theadRow,
  timeline,
  timelineDot,
  timelineItem,
  timelineMeta,
  timelineNote,
  timelineTitle,
} from "@/lib/ui";
import { formatDate } from "@/lib/format";
import { useToast } from "@/lib/toast";
import { AdminDialog } from "@/components/admin/shared/AdminDialog";

// Mirrors the backend's FORWARD_STATUSES map (backend/src/services/bookings.ts).
const FORWARD: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Debounce before the typed term is mirrored into `?q=` (the URL is the source
 *  of truth, so the list only refetches once the URL actually changes). */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * The `?q=` term the API may actually receive, or `null` when it must be dropped.
 * The list endpoint validates `q` as `z.string().trim().min(2)` (same rule as the
 * ⌘K palette, backend adminBookings controller), so a shorter term — a lone
 * character, or whitespace the user typed — is a `400 VALIDATION` that would
 * replace the list with an error banner. Trimming is a URL/fetch concern ONLY:
 * the field keeps whatever was typed, and an empty/blank term means "no `q`",
 * i.e. the full list.
 */
const apiSearchTerm = (term: string): string | null =>
  term.trim().length >= SEARCH_MIN_TERM ? term.trim() : null;

export function AdminBookings({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter lives in the URL: ?tab=bookings&status=X (spec §6.1/§4.2 defect 2).
  const rawStatus = searchParams.get("status") ?? "";
  const status = (STATUS_ORDER as readonly string[]).includes(rawStatus) ? rawStatus : "";

  // Free-text search is URL-bound the same way: ?q=<term>, mirrored by a local
  // input so typing stays instant while the list follows the debounced URL.
  const q = searchParams.get("q") ?? "";
  const [term, setTerm] = useState(q);
  // Tracks what THIS component last pushed so the sync effect below can tell
  // its own echo (back from the router) apart from an external change.
  const pushedRef = useRef(q);

  // Debounced write-through: typing → ?q= (preserving ?status= and ?open=).
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextTerm = apiSearchTerm(term);
      if (nextTerm) params.set("q", nextTerm);
      else params.delete("q");
      const next = params.toString();
      // The echo marker is what the URL will read back — the trimmed term, or ""
      // once the param is gone — so the mirror effect below recognises its own
      // push and never rewrites the field the user is still typing in.
      pushedRef.current = nextTerm ?? "";
      if (next !== searchParams.toString()) router.replace(`${pathname}?${next}`);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [term, pathname, router, searchParams]);

  // External ?q= changes (back/forward, a deep link) mirror back into the field.
  // Deferred by a tick so the no-sync-setState-in-effect rule stays happy.
  useEffect(() => {
    if (q === pushedRef.current) return;
    pushedRef.current = q;
    const handle = setTimeout(() => setTerm(q), 0);
    return () => clearTimeout(handle);
  }, [q]);

  // List endpoint: the status filter and the search term ride together
  // (?open= stays in the URL for the deep-link effect and never hits the API).
  // The term is re-checked here too, so a hand-typed or back/forward `?q=` below
  // the floor lists everything for the debounce window instead of 400-ing.
  const listTerm = apiSearchTerm(q);
  const listParams = new URLSearchParams();
  if (status) listParams.set("status", status);
  if (listTerm) listParams.set("q", listTerm);
  const listPath = listParams.toString() ? `/admin/bookings?${listParams.toString()}` : "/admin/bookings";

  const { data: bookings, error, loading, reload } = useAdminFetch<Booking[]>(listPath, token);

  const [selected, setSelected] = useState<Booking | null>(null);

  // ?open=<bookingId> deep-link (spec §6.1 extension): the bell's linkHref can
  // carry a booking to preview. Opens via the EXISTING dialog path/setSelected —
  // never a second dialog. Re-runs whenever the param value CHANGES (deep-links
  // arriving while this tab is already active) and whenever the list (re)loads.
  // A consumed-ref guards against re-opening after a manual close + a reload
  // (e.g. status change while `?open=` still sits in the URL).
  const openId = searchParams.get("open") ?? "";
  const consumedOpenRef = useRef("");
  useEffect(() => {
    if (!openId || !bookings) return;
    const match = bookings.find((b) => b.id === openId);
    if (!match || consumedOpenRef.current === openId) return;
    consumedOpenRef.current = openId;
    setSelected(match);
  }, [openId, bookings]);

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "bookings");
    if (next) params.set("status", next);
    else params.delete("status");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>{t("admin_bookings")}</h1>
          <p className={pageSub}>{t("admin_bookings_sub")}</p>
        </div>
      </div>

      {/* Free-text search — URL-bound (?q=), debounced, aligned with the chips. */}
      <div className={cx(fieldSearchWrap, "mt-6 w-full sm:max-w-sm")}>
        <label htmlFor="bookings-search" className="sr-only">
          {t("bookings_search_label")}
        </label>
        <Search className={fieldSearchIcon} aria-hidden="true" />
        <input
          id="bookings-search"
          type="search"
          className={fieldSearchInput}
          placeholder={t("bookings_search_placeholder")}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        {term && (
          <button
            type="button"
            className={fieldSearchClear}
            aria-label={t("bookings_search_clear")}
            onClick={() => setTerm("")}
          >
            <X className={clearIcon} />
          </button>
        )}
      </div>
      {term && <p className={adminFieldHint}>{t("bookings_search_hint")}</p>}

      <nav className={cx(filterRow, "mt-4")} role="navigation" aria-label={t("admin_bookings_filter")}>
        <button
          type="button"
          className={status === "" ? filterChipActive : filterChipInactive}
          onClick={() => setStatus("")}
        >
          {t("admin_bookings_filter_all")}
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={status === s ? filterChipActive : filterChipInactive}
            onClick={() => setStatus(s)}
          >
            {t(statusKey(s))}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="mt-6">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
            <button className={btnSecondary} onClick={reload}>
              {t("admin_retry")}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className={cx(tableScrollWrap, "mt-6")}>
          <div className={loadingState}>
            {skeletonRows(8).map((cls, i) => (
              <div key={i} className={cls} />
            ))}
          </div>
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <div className={emptyState}>
          <div className={emptyStateIconWrap}>
            <Inbox className={emptyStateIcon} />
          </div>
          <p className={emptyStateTitle}>{t("admin_bookings_empty")}</p>
        </div>
      ) : (
        <div className={cx(tableScrollWrap, "mt-6")}>
          <table className={cx(table, "min-w-[1100px]")}>
            <thead className={theadRow}>
              <tr>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_ref")}
                </th>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_client")}
                </th>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_service")}
                </th>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_event_date")}
                </th>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_location")}
                </th>
                <th scope="col" className={thCls}>
                  {t("admin_bookings_col_budget")}
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
              {bookings.map((b) => (
                <tr key={b.id} onClick={() => setSelected(b)} className={cx(tbodyRow, "cursor-pointer")}>
                  <td className={tdCls}>
                    {/* Keyboard-first trigger (spec §6.2) — first in tab order */}
                    <button
                      type="button"
                      className="font-semibold text-brass-light transition-colors hover:text-brass"
                      onClick={() => setSelected(b)}
                      aria-label={`${t("admin_bookings_open")} ${b.reference}`}
                    >
                      {b.reference}
                    </button>
                  </td>
                  <td className={tdCls}>
                    <p className="font-medium text-admin-text">{b.contactName}</p>
                    <p className="text-xs text-admin-muted">{b.contactEmail}</p>
                  </td>
                  <td className={tdCls}>{b.service?.nameEn ?? "—"}</td>
                  <td className={tdCls}>{formatDate(b.eventDate, locale) || "—"}</td>
                  <td className={tdCls}>{b.location ?? "—"}</td>
                  <td className={tdCls}>{b.budgetRange ?? "—"}</td>
                  <td className={tdCls}>
                    <span className={statusPill(b.status)}>{t(statusKey(b.status))}</span>
                  </td>
                  <td className={tdCls}>{formatDate(b.createdAt, locale) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <BookingDialog
          token={token}
          booking={selected}
          onChanged={reload}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog — spec §6.3 (status transitions + note, timeline, notifications)
// ---------------------------------------------------------------------------

function BookingDialog({
  token,
  booking,
  onChanged,
  onClose,
}: {
  token: string;
  booking: Booking;
  onChanged: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const handleSessionExpired = useSessionGuard();
  // Toast announcer — the shell mounts the provider; the undo action rides a
  // card, so it stays reachable after this dialog is closed.
  const { push } = useToast();
  // Seed with the row snapshot for instant render; the detail fetch below adds
  // events (the list endpoint returns notifications but NOT events).
  const [detail, setDetail] = useState<Booking>(booking);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  // Honest success feedback: a note is only ever persisted WITH a status
  // transition — when one was attached, show it (QA #6).
  const [noteSaved, setNoteSaved] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    adminApi
      .get<Booking>(`/admin/bookings/${booking.id}`, token)
      .then((fresh) => {
        setDetail(fresh);
        setError("");
      })
      .catch((e) => {
        if ((e as Error).message === "NOT_AUTHENTICATED") {
          handleSessionExpired();
          return;
        }
        setError((e as Error).message);
      });
  }, [booking.id, token, handleSessionExpired]);

  async function applyStatus(next: string) {
    if (!detail) return;
    // Snapshot BEFORE the PATCH: undo replays exactly this pair (status + the
    // note that rode along with it), so the original wording is preserved.
    const previousStatus = detail.status;
    const noteText = note.trim();
    setBusy(next);
    setError("");
    setNoteSaved(false);
    try {
      await adminApi.patch(`/admin/bookings/${detail.id}/status`, token, {
        status: next,
        ...(noteText ? { note: noteText } : {}),
      });
      setNote("");
      setNoteSaved(noteText.length > 0);
      const fresh = await adminApi.get<Booking>(`/admin/bookings/${detail.id}`, token);
      setDetail(fresh);
      setSaved(t(statusKey(next)));
      onChanged();
      // Confirmation + one-tap undo. By the time the toast exists the list is
      // already reloaded and `detail` already re-fetched, so the dialog can
      // never show a stale status next to the card.
      push("success", t("toast_status_changed"), {
        actionLabel: t("toast_undo"),
        onAction: () => void undoStatus(previousStatus, noteText),
      });
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      // A FAILED change keeps the existing banner path — no toast, so a failure
      // is never dressed up as a confirmation.
      setError((e as Error).message || t("admin_error_generic"));
    } finally {
      setBusy("");
    }
  }

  /**
   * Replay a status change backwards (the toast's "Undo"). A rejected revert
   * is NEVER silent: the backend answers INVALID_TRANSITION / STATUS_UNCHANGED
   * (someone else already moved the booking, or the old status is no longer
   * reachable), so the dialog shows the banner AND a destructive toast that
   * carries the reason code.
   */
  async function undoStatus(previousStatus: string, originalNote: string) {
    try {
      await adminApi.patch(`/admin/bookings/${detail.id}/status`, token, {
        status: previousStatus,
        ...(originalNote ? { note: originalNote } : {}),
      });
      const fresh = await adminApi.get<Booking>(`/admin/bookings/${detail.id}`, token);
      setDetail(fresh);
      setSaved(t(statusKey(previousStatus)));
      onChanged();
      push("success", t("toast_undo_done"));
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      const reason = (e as Error).message;
      setError(reason || t("admin_error_generic"));
      push("danger", reason ? t("toast_undo_failed").replace("{error}", reason) : t("toast_undo_error"));
    }
  }

  async function revoke() {
    if (!detail) return;
    setBusy("revoke");
    setError("");
    try {
      await adminApi.post(`/admin/bookings/${detail.id}/revoke-token`, token, {});
      setRevoked(true);
      setRevoking(false);
      const fresh = await adminApi.get<Booking>(`/admin/bookings/${detail.id}`, token);
      setDetail(fresh);
      onChanged();
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((e as Error).message || t("admin_error_generic"));
    } finally {
      setBusy("");
    }
  }

  const nextSteps = FORWARD[detail.status] ?? [];

  return (
    <AdminDialog labelledBy="bd-title" describedBy="bd-subtitle" size="lg" onClose={onClose}>
      <header className={cx(dialogHeader, "pr-12")}>
        <div className="min-w-0">
          <h2 id="bd-title" className={dialogTitle}>
            {detail.reference}
          </h2>
          <p id="bd-subtitle" className="mt-1 text-sm text-admin-muted">
            {detail.service?.nameEn ?? "—"} · {t("admin_bookings_col_created")}{" "}
            {formatDate(detail.createdAt, locale) || "—"}
          </p>
        </div>
      </header>

      <div className={cx(dialogBody, "space-y-6")}>
        {error && (
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={cx(cardCls, "p-4")}>
            <p className={sectionLabel}>{t("admin_booking_client")}</p>
            <p className="mt-2 font-semibold text-admin-text">{detail.contactName}</p>
            <p className={cx(sectionLabel, "mt-3")}>{t("admin_booking_contact")}</p>
            <p className="mt-1 text-sm text-admin-muted">{detail.contactEmail}</p>
            {detail.contactPhone && <p className="text-sm text-admin-muted">{detail.contactPhone}</p>}
          </div>
          <div className={cx(cardCls, "p-4")}>
            <p className={sectionLabel}>{t("admin_booking_production")}</p>
            <dl className="mt-2 space-y-1 text-sm text-admin-text">
              <div className="flex gap-2">
                <dt className="text-admin-muted">{t("admin_booking_event_date")}:</dt>
                <dd>{detail.eventDate ? formatDate(detail.eventDate, locale) : "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-admin-muted">{t("admin_booking_location")}:</dt>
                <dd>{detail.location ?? "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-admin-muted">{t("admin_booking_budget")}:</dt>
                <dd>{detail.budgetRange ?? "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        {detail.details && (
          <div className={cx(cardCls, "p-4")}>
            <p className={sectionLabel}>{t("admin_booking_details")}</p>
            <p className="mt-2 text-sm text-admin-text">{detail.details}</p>
          </div>
        )}

        {/* Status transitions + note (spec §6.3) */}
        <section aria-labelledby="bd-status">
          <p id="bd-status" className={sectionLabel}>
            {t("admin_booking_update_status")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={statusPill(detail.status)}>{t(statusKey(detail.status))}</span>
            {nextSteps.map((next) => (
              <button
                key={next}
                type="button"
                className={next === "CANCELLED" ? btnDangerGhost : cx(btnSecondary, btnSm)}
                disabled={busy !== ""}
                onClick={() => applyStatus(next)}
              >
                {busy === next ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t(statusKey(next))}
              </button>
            ))}
          </div>
          {nextSteps.length === 0 && (
            <p className="mt-3 text-sm text-admin-muted">{t("admin_booking_no_transitions")}</p>
          )}

          {noteSaved && (
            <div className={successBanner} role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {t("admin_booking_note_transition_only")}
            </div>
          )}

          {/* The backend only persists a note WITH a status transition — there is
              no standalone save. Any text here rides the next status change (QA #6). */}
          <div className="mt-5">
            <label htmlFor="bd-note" className={adminFieldLabel}>
              {t("admin_booking_note_label")}
            </label>
            <textarea
              id="bd-note"
              className={adminTextareaCls}
              rows={2}
              placeholder={t("admin_booking_note_placeholder")}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSaved(false);
              }}
            />
            <p className={adminFieldHint}>{t("admin_booking_note_placeholder")}</p>
          </div>

          <p className="sr-only" aria-live="polite">
            {saved ? `${t("admin_booking_status_live")} ${saved}` : ""}
          </p>
        </section>

        {/* Timeline (spec §6.3) */}
        <section aria-labelledby="bd-timeline">
          <p id="bd-timeline" className={sectionLabel}>
            {t("admin_booking_timeline")}
          </p>
          {detail.events && detail.events.length > 0 ? (
            <ul className={timeline}>
              {detail.events.map((ev) => (
                <li key={ev.id} className={timelineItem}>
                  <span className={timelineDot} aria-hidden="true" />
                  <p className={timelineTitle}>{t(statusKey(ev.status))}</p>
                  <p className={timelineMeta}>{formatDate(ev.createdAt, locale)}</p>
                  {ev.note && <p className={timelineNote}>{ev.note}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-admin-muted">{t("admin_booking_timeline_empty")}</p>
          )}
        </section>

        {/* Notifications (spec §6.3) */}
        <section aria-labelledby="bd-notifications">
          <p id="bd-notifications" className={sectionLabel}>
            {t("admin_booking_notifications")}
          </p>
          {detail.notifications && detail.notifications.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {detail.notifications.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium text-admin-text">{n.channel}</span>
                  <span className="text-admin-muted">{n.kind}</span>
                  <span className="text-admin-faint">→ {n.recipient}</span>
                  <span className={n.status === "SENT" ? badgeSuccess : badgeDanger}>{n.status}</span>
                  {n.error && <span className="text-xs text-admin-faint">{n.error}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-admin-muted">{t("admin_booking_notifications_empty")}</p>
          )}
        </section>
      </div>

      <footer className={cx(dialogFooter, "justify-between")}>
        <div className="flex flex-wrap items-center gap-3">
          {revoking ? (
            <div className={confirmBox}>
              <p className={confirmTitle}>{t("admin_booking_revoke_title")}</p>
              <p className={confirmBody}>{t("admin_booking_revoke_body")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={busy === "revoke"}
                  onClick={() => setRevoking(false)}
                >
                  {t("admin_booking_revoke_keep")}
                </button>
                <button type="button" className={btnDanger} disabled={busy === "revoke"} onClick={revoke}>
                  {busy === "revoke" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {t("admin_booking_revoke_confirm")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={rowActionDanger}
              disabled={revoked}
              onClick={() => setRevoking(true)}
            >
              {revoked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {revoked ? t("admin_booking_revoked_action") : t("admin_booking_revoke")}
            </button>
          )}
          {revoked && (
            <div className={successBanner} role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {t("admin_booking_revoked")}
            </div>
          )}
        </div>
        <button type="button" className={btnSecondary} onClick={onClose}>
          {t("admin_close")}
        </button>
      </footer>
    </AdminDialog>
  );
}
