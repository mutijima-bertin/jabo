"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Inbox, Loader2, RotateCcw } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { Booking } from "@/lib/api";
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

export function AdminBookings({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter lives in the URL: ?tab=bookings&status=X (spec §6.1/§4.2 defect 2).
  const rawStatus = searchParams.get("status") ?? "";
  const status = (STATUS_ORDER as readonly string[]).includes(rawStatus) ? rawStatus : "";

  const { data: bookings, error, loading, reload } = useAdminFetch<Booking[]>(
    status ? `/admin/bookings?status=${status}` : "/admin/bookings",
    token,
  );

  const [selected, setSelected] = useState<Booking | null>(null);

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

      <nav className={cx(filterRow, "mt-6")} role="navigation" aria-label={t("admin_bookings_filter")}>
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
          <table className={cx(table, "min-w-[840px]")}>
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
    setBusy(next);
    setError("");
    setNoteSaved(false);
    try {
      const hadNote = note.trim().length > 0;
      await adminApi.patch(`/admin/bookings/${detail.id}/status`, token, {
        status: next,
        ...(hadNote ? { note: note.trim() } : {}),
      });
      setNote("");
      setNoteSaved(hadNote);
      const fresh = await adminApi.get<Booking>(`/admin/bookings/${detail.id}`, token);
      setDetail(fresh);
      setSaved(t(statusKey(next)));
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
