"use client";

import { useState } from "react";
import { Inbox, Search } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { AdminClient } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { DeleteButton } from "@/components/admin/shared/CollectionManager";
import {
  adminInputCls,
  cx,
  emptyState,
  emptyStateBody,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  iconBtnGhost,
  loadingState,
  pageHeader,
  pageTitle,
  sectionLabel,
  skeletonRows,
  successBanner,
  table,
  tableScrollWrap,
  tbody,
  tdCls,
  tdMuted,
  theadRow,
  thCls,
  tbodyRow,
} from "@/lib/ui";

export function AdminClients({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: clients, error, loading, reload } = useAdminFetch<AdminClient[]>("/admin/clients", token);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [removedName, setRemovedName] = useState<string | null>(null);

  /**
   * DELETE /admin/clients/:id → cascades bookings + testimonials.
   * Contract: 200 { ok: true, deletedBookings, deletedTestimonials };
   * 404 { error: "CLIENT_NOT_FOUND" }. On success the removed row vanishes
   * after reload, so the "removed" confirmation persists above the table.
   */
  async function remove(client: AdminClient) {
    setDeletingId(client.id);
    setActionError("");
    setRemovedName(null);
    try {
      await adminApi.del<{ ok: boolean }>(`/admin/clients/${client.id}`, token);
      setRemovedName(client.name);
      reload();
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      const msg = (e as Error).message || t("admin_error_generic");
      setActionError(msg === "CLIENT_NOT_FOUND" ? t("admin_error_generic") : msg);
    } finally {
      setDeletingId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered =
    clients === null
      ? null
      : q === ""
        ? clients
        : clients.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.email ?? "").toLowerCase().includes(q) ||
              (c.phone ?? "").toLowerCase().includes(q),
          );

  return (
    <div>
      <div className={pageHeader}>
        <h1 className={pageTitle}>{t("admin_clients_title")}</h1>
      </div>

      {error && (
        <div className="mt-6">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" className={iconBtnGhost} onClick={reload}>
              {t("admin_retry")}
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mt-6">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{actionError}</span>
          </div>
        </div>
      )}

      {removedName && (
        <div className="mt-6" role="status">
          <div className={successBanner}>{t("admin_clients_removed")}</div>
        </div>
      )}

      {loading ? (
        <div className={loadingState}>{skeletonRows(5).map((c, i) => (
          <div key={i} className={c} />
        ))}</div>
      ) : (
        <>
          <div className="mt-6 w-full max-w-sm">
            <label className={sectionLabel} htmlFor="clients-search">
              {t("admin_clients_search")}
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-faint" />
              <input
                id="clients-search"
                className={cx(adminInputCls, "pl-9")}
                placeholder={t("admin_clients_search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {filtered !== null && filtered.length === 0 ? (
            <div className={emptyState}>
              <div className={emptyStateIconWrap}>
                <Inbox className={emptyStateIcon} />
              </div>
              <p className={emptyStateTitle}>
                {q === "" ? t("admin_clients_empty") : t("admin_clients_no_match")}
              </p>
              {q !== "" && <p className={emptyStateBody}>{t("admin_clients_no_match_hint")}</p>}
            </div>
          ) : (
            <div className={cx(tableScrollWrap, "mt-6")}>
              <table className={table}>
                <thead className={theadRow}>
                  <tr>
                    <th scope="col" className={thCls}>{t("admin_clients_col_name")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_email")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_whatsapp")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_bookings")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_last_booking")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_created")}</th>
                    <th scope="col" className={thCls}>{t("admin_clients_col_actions")}</th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {filtered?.map((c) => {
                    const last = [...c.bookings].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )[0];
                    return (
                      <tr key={c.id} className={tbodyRow}>
                        <td className={tdCls}>
                          <p className="font-medium">{c.name}</p>
                        </td>
                        <td className={cx(tdCls, tdMuted)}>{c.email ?? "—"}</td>
                        <td className={cx(tdCls, tdMuted)}>{c.phone ?? "—"}</td>
                        <td className={tdCls}>{c.bookings.length}</td>
                        <td className={cx(tdCls, tdMuted)}>
                          {last ? (
                            <span>
                              {last.reference}
                              <span className="ml-2">{formatDate(last.createdAt, locale)}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className={cx(tdCls, tdMuted)}>{formatDate(c.createdAt, locale)}</td>
                        <td className={tdCls}>
                          <div className="flex items-center justify-end gap-2">
                            <DeleteButton
                              busy={deletingId === c.id}
                              onConfirm={() => remove(c)}
                              confirmLabel={t("admin_clients_delete_confirm")}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
