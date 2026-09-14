"use client";

/* eslint-disable @next/next/no-img-element -- admin gallery thumbnails; next/image isn't used in the panel (matches AdminSettings pattern) */

import { useState } from "react";
import { ChevronDown, ChevronUp, Inbox, Loader2, Pencil, X } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { PortfolioItem } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import {
  adminInputCls,
  adminSelectCls,
  cardScrim,
  checkboxCls,
  cx,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  iconBtnGhostSm,
  rowActionBrass,
  selectChevron,
  thumbCls,
} from "@/lib/ui";
import { CollectionManager, DeleteButton, Dropzone, Field, ManagerEditor, putCollectionOrder } from "@/components/admin/shared/CollectionManager";

const empty = {
  titleEn: "",
  titleRw: "",
  category: "Events",
  clientName: "",
  tags: [] as string[],
  coverUrl: "",
  mediaUrls: [] as string[],
  mediaType: "image" as const,
  published: true,
  sortOrder: 0,
};

/** Canonical portfolio taxonomy (backend validates against this exact list). */
const CATEGORIES: Array<{ value: string; labelKey: DictKey }> = [
  { value: "Weddings", labelKey: "portfolio_filter_weddings" },
  { value: "Events", labelKey: "portfolio_filter_events" },
  { value: "Corporate", labelKey: "portfolio_filter_corporate" },
  { value: "Concerts", labelKey: "portfolio_filter_concerts" },
  { value: "Documentaries", labelKey: "portfolio_filter_documentaries" },
  { value: "Portraits", labelKey: "portfolio_filter_portraits" },
];

function categoryLabel(category: string, t: (k: DictKey) => string): string {
  const found = CATEGORIES.find((c) => c.value === category);
  return found ? t(found.labelKey) : category;
}

export function AdminPortfolio({ token }: { token: string }) {
  const { t } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: items, error: loadError, loading, reload, setData } = useAdminFetch<PortfolioItem[]>("/admin/portfolio", token);

  const [editing, setEditing] = useState<Partial<PortfolioItem> | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Non-null while a reorder PUT is in flight: all arrows disabled, clicked one spins. */
  const [orderBusy, setOrderBusy] = useState<{ id: string; dir: -1 | 1 } | null>(null);

  const dirty = editing !== null && JSON.stringify(editing) !== baseline;

  const set = (patch: Partial<PortfolioItem>) => setEditing((prev) => ({ ...(prev ?? {}), ...patch }));

  const openNew = () => {
    setError("");
    setSaved(false);
    setEditing({ ...empty, tags: [] });
    setBaseline(JSON.stringify({ ...empty, tags: [] }));
  };

  const openEdit = (i: PortfolioItem) => {
    setError("");
    setSaved(false);
    const row = { ...i, tags: [...i.tags], mediaUrls: [...i.mediaUrls] };
    setEditing(row);
    setBaseline(JSON.stringify(row));
  };

  const closeEditor = () => {
    setEditing(null);
    setSaved(false);
    setError("");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        titleEn: editing.titleEn,
        titleRw: editing.titleRw ?? "",
        category: editing.category,
        clientName: editing.clientName ?? "",
        tags: [...(editing.tags ?? [])],
        coverUrl: editing.coverUrl,
        mediaUrls: [...(editing.mediaUrls ?? [])],
        mediaType: editing.mediaType ?? "image",
        published: editing.published ?? true,
        sortOrder: editing.sortOrder ?? 0,
      };
      if (editing.id) await adminApi.put(`/admin/portfolio/${editing.id}`, token, body);
      else await adminApi.post("/admin/portfolio", token, body);
      setSaved(true);
      setBaseline(JSON.stringify(editing));
      reload();
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((e as Error).message || t("admin_error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError("");
    try {
      await adminApi.del(`/admin/portfolio/${id}`, token);
      reload();
    } catch (e) {
      if ((e as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((e as Error).message || t("admin_error_generic"));
    } finally {
      setDeletingId(null);
    }
  }

  /** Non-optimistic reorder: swap in a copy, PUT the full collection, adopt the canonical 200 as state. */
  async function move(id: string, dir: -1 | 1) {
    if (!items || orderBusy) return;
    const from = items.findIndex((i) => i.id === id);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= items.length) return;
    setOrderBusy({ id, dir });
    setError("");
    try {
      const next = await putCollectionOrder("/admin/portfolio/order", token, items, from, to);
      setData(next);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      if (msg === "STALE_COLLECTION") {
        setError(t("admin_reorder_stale"));
        reload();
        return;
      }
      setError(msg || t("admin_error_generic"));
    } finally {
      setOrderBusy(null);
    }
  }

  const removeMedia = (index: number) => {
    if (!editing) return;
    const urls = [...(editing.mediaUrls ?? [])];
    urls.splice(index, 1);
    set({ mediaUrls: urls });
  };

  const list = items ?? [];

  /** Shared always-visible action row — used in the mobile footer strip AND
   *  the md+ scrim so both breakpoints expose the same touch-safe controls. */
  const renderActions = (item: PortfolioItem, itemIdx: number) => (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        aria-label={t("admin_reorder_up")}
        disabled={orderBusy !== null || itemIdx === 0}
        className={iconBtnGhostSm}
        onClick={() => move(item.id, -1)}
      >
        {orderBusy?.id === item.id && orderBusy?.dir === -1 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        aria-label={t("admin_reorder_down")}
        disabled={orderBusy !== null || itemIdx === list.length - 1}
        className={iconBtnGhostSm}
        onClick={() => move(item.id, 1)}
      >
        {orderBusy?.id === item.id && orderBusy?.dir === 1 ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      <button type="button" className={rowActionBrass} onClick={() => openEdit(item)}>
        <Pencil className="h-3.5 w-3.5" />
        {t("admin_edit")}
      </button>
      <DeleteButton busy={deletingId === item.id} onConfirm={() => remove(item.id)} />
    </div>
  );

  return (
    <CollectionManager
      title={t("admin_portfolio")}
      newLabel={t("admin_portfolio_new")}
      onNew={openNew}
      error={loadError}
      onRetry={reload}
      loading={loading}
    >
      {editing ? (
        <ManagerEditor
          title={editing.id ? t("admin_edit") : t("admin_portfolio_new")}
          onSubmit={save}
          onCancel={closeEditor}
          dirty={dirty}
          busy={busy}
          saved={saved}
          error={error}
          saveLabel={editing.id ? t("admin_save") : t("admin_form_create")}
        >
          <Field label={t("admin_portfolio_cover")}>
            <Dropzone
              token={token}
              value={editing.coverUrl ?? ""}
              onChange={(url) => set({ coverUrl: url })}
              onError={setError}
              title={t("admin_portfolio_cover")}
              hint={t("admin_service_image_hint")}
            />
          </Field>

          {editing.mediaUrls && editing.mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {editing.mediaUrls.map((url, i) => (
                <div key={url} className="relative">
                  <img src={url} alt="" className="h-20 w-28 rounded-lg object-cover" />
                  <button
                    type="button"
                    aria-label={t("admin_service_remove_image")}
                    className={cx(iconBtnGhostSm, "absolute -right-2 -top-2")}
                    onClick={() => removeMedia(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin_portfolio_title_en")} htmlFor="pf-title-en">
              <input
                id="pf-title-en"
                required
                className={adminInputCls}
                value={editing.titleEn ?? ""}
                onChange={(e) => set({ titleEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_portfolio_title_rw")} htmlFor="pf-title-rw">
              <input
                id="pf-title-rw"
                className={adminInputCls}
                value={editing.titleRw ?? ""}
                onChange={(e) => set({ titleRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_portfolio_category")} htmlFor="pf-category">
              <div className="relative">
                <select
                  id="pf-category"
                  className={adminSelectCls}
                  value={editing.category ?? "Events"}
                  onChange={(e) => set({ category: e.target.value })}
                >
                  {editing.category && !CATEGORIES.some((c) => c.value === editing.category) && (
                    <option value={editing.category}>
                      {editing.category} ({t("admin_form_legacy")})
                    </option>
                  )}
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t("admin_portfolio_client")} htmlFor="pf-client">
              <input
                id="pf-client"
                className={adminInputCls}
                value={editing.clientName ?? ""}
                onChange={(e) => set({ clientName: e.target.value })}
              />
            </Field>
            <Field label={t("admin_portfolio_media_type")} htmlFor="pf-media">
              <div className="relative">
                <select
                  id="pf-media"
                  className={adminSelectCls}
                  value={editing.mediaType ?? "image"}
                  onChange={(e) => set({ mediaType: e.target.value as "image" | "video" })}
                >
                  <option value="image">{t("admin_portfolio_media_image")}</option>
                  <option value="video">{t("admin_portfolio_media_video")}</option>
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            {/* Controlled tags input — writes back on every keystroke (defect 3: no stale defaultValue/onBlur) */}
            <Field label={t("admin_portfolio_tags")} hint={t("admin_portfolio_tags_hint")} htmlFor="pf-tags">
              <input
                id="pf-tags"
                className={adminInputCls}
                value={(editing.tags ?? []).join(", ")}
                onChange={(e) =>
                  set({ tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })
                }
              />
            </Field>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={!!editing.published}
                  onChange={(e) => set({ published: e.target.checked })}
                />
                {t("admin_status_published")}
              </label>
            </div>
          </div>
        </ManagerEditor>
      ) : (
        <>
          {error && (
            <div className="mb-6">
              <div className={errorBanner} role="alert">
                <span className="min-w-0 flex-1">{error}</span>
              </div>
            </div>
          )}
          {items && items.length === 0 ? (
            <div className={emptyState}>
              <div className={emptyStateIconWrap}>
                <Inbox className={emptyStateIcon} />
              </div>
              <p className={emptyStateTitle}>{t("admin_portfolio_empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((i, idx) => (
                <div
                  key={i.id}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-admin-border bg-admin-base md:block"
                >
                  <img src={i.coverUrl} alt={i.titleEn} className={thumbCls} loading="lazy" />
                  {/* Mobile (≤639px): actions flow BELOW the media as a footer strip
                      like the services cards — no half-cover scrim (QA #4). */}
                  <div className="flex items-center justify-between gap-2 px-3 py-3 md:hidden">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-admin-text">{i.titleEn}</p>
                      <p className="truncate text-xs text-admin-muted">{categoryLabel(i.category, t)}</p>
                    </div>
                    {renderActions(i, idx)}
                  </div>
                  {/* md+: always-visible scrim over the cover art (QA #4). */}
                  <div className={cardScrim}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-admin-text">{i.titleEn}</p>
                      <p className="truncate text-xs text-admin-muted">{categoryLabel(i.category, t)}</p>
                    </div>
                    {renderActions(i, idx)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </CollectionManager>
  );
}
