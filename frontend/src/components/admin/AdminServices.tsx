"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Inbox, Loader2, Pencil, Stars } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { AdminPost, Service } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import {
  adminInputCls,
  adminSelectCls,
  adminTextareaCls,
  badgeBrass,
  cardBody,
  cardCls,
  cardFooter,
  checkboxCls,
  cx,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  iconBtnGhostSm,
  linkCls,
  pubPill,
  rowActionBrass,
  selectChevron,
  thumbWide,
} from "@/lib/ui";
import { CollectionManager, DeleteButton, Dropzone, Field, ManagerEditor, putCollectionOrder } from "@/components/admin/shared/CollectionManager";

const empty = {
  nameEn: "",
  nameRw: "",
  descriptionEn: "",
  descriptionRw: "",
  priceEn: "",
  priceRw: "",
  category: "Photography",
  icon: "camera",
  imageUrl: "",
  linkedPostSlug: "",
  featured: false,
  published: true,
  sortOrder: 0,
};

/** Canonical service taxonomy — backend validates against this exact list (spec §7.3 defect 5). */
const SERVICE_CATEGORIES: Array<{ value: string; labelKey: DictKey }> = [
  { value: "Photography", labelKey: "admin_service_cat_photography" },
  { value: "Videography", labelKey: "admin_service_cat_videography" },
  { value: "Livestreaming", labelKey: "admin_service_cat_livestreaming" },
  { value: "Post-production", labelKey: "admin_service_cat_postproduction" },
  { value: "Production", labelKey: "admin_service_cat_production" },
];

const ICONS = ["camera", "video", "broadcast", "drone", "photo", "edit", "ad"];

/** API rows carry nullable image/link — the editor operates on plain strings. */
function normalize(s: Service): Partial<Service> & { id?: string } {
  return { ...s, imageUrl: s.imageUrl ?? "", linkedPostSlug: s.linkedPostSlug ?? "" };
}

export function AdminServices({ token }: { token: string }) {
  const { t } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: items, error: loadError, loading, reload, setData } = useAdminFetch<Service[]>("/admin/services", token);
  /** Blog rows feeding the linked-post dropdown. */
  const { data: posts } = useAdminFetch<AdminPost[]>("/admin/posts", token);

  const [editing, setEditing] = useState<Partial<Service> & { id?: string } | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Non-null while a reorder PUT is in flight: all arrows disabled, clicked one spins. */
  const [orderBusy, setOrderBusy] = useState<{ id: string; dir: -1 | 1 } | null>(null);

  const publishedPosts = (posts ?? []).filter((p) => p.published);
  const dirty = editing !== null && JSON.stringify(editing) !== baseline;

  const openNew = () => {
    setError("");
    setSaved(false);
    setEditing({ ...empty });
    setBaseline(JSON.stringify(empty));
  };

  const openEdit = (s: Service) => {
    setError("");
    setSaved(false);
    const row = normalize(s);
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
        nameEn: editing.nameEn,
        nameRw: editing.nameRw,
        descriptionEn: editing.descriptionEn ?? "",
        descriptionRw: editing.descriptionRw ?? "",
        priceEn: editing.priceEn,
        priceRw: editing.priceRw,
        category: editing.category,
        icon: editing.icon,
        // Backend zod: imageUrl/linkedPostSlug are z.string().optional() (null rejected) — send "".
        imageUrl: editing.imageUrl ?? "",
        linkedPostSlug: editing.linkedPostSlug ?? "",
        featured: editing.featured,
        published: editing.published,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await adminApi.put(`/admin/services/${editing.id}`, token, body);
      else await adminApi.post("/admin/services", token, body);
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
      await adminApi.del(`/admin/services/${id}`, token);
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
    const from = items.findIndex((s) => s.id === id);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= items.length) return;
    setOrderBusy({ id, dir });
    setError("");
    try {
      const next = await putCollectionOrder("/admin/services/order", token, items, from, to);
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

  const missingLegacy =
    editing?.linkedPostSlug && !publishedPosts.some((p) => p.slug === editing.linkedPostSlug);

  const set = (patch: Partial<Service>) => setEditing((prev) => ({ ...(prev ?? {}), ...patch }));

  const list = items ?? [];

  return (
    <CollectionManager
      title={t("admin_services")}
      newLabel={t("admin_services_new")}
      onNew={openNew}
      error={loadError}
      onRetry={reload}
      loading={loading}
    >
      {editing ? (
        <ManagerEditor
          title={editing.id ? t("admin_edit") : t("admin_services_new")}
          onSubmit={save}
          onCancel={closeEditor}
          dirty={dirty}
          busy={busy}
          saved={saved}
          error={error}
          saveLabel={editing.id ? t("admin_save") : t("admin_form_create")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin_services_name_en")} htmlFor="svc-name-en">
              <input
                id="svc-name-en"
                required
                className={adminInputCls}
                value={editing.nameEn ?? ""}
                onChange={(e) => set({ nameEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_name_rw")} htmlFor="svc-name-rw">
              <input
                id="svc-name-rw"
                required
                className={adminInputCls}
                value={editing.nameRw ?? ""}
                onChange={(e) => set({ nameRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_desc_en")} htmlFor="svc-desc-en">
              <textarea
                id="svc-desc-en"
                rows={2}
                className={adminTextareaCls}
                value={editing.descriptionEn ?? ""}
                onChange={(e) => set({ descriptionEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_desc_rw")} htmlFor="svc-desc-rw">
              <textarea
                id="svc-desc-rw"
                rows={2}
                className={adminTextareaCls}
                value={editing.descriptionRw ?? ""}
                onChange={(e) => set({ descriptionRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_price_en")} htmlFor="svc-price-en">
              <input
                id="svc-price-en"
                required
                className={adminInputCls}
                value={editing.priceEn ?? ""}
                onChange={(e) => set({ priceEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_price_rw")} htmlFor="svc-price-rw">
              <input
                id="svc-price-rw"
                required
                className={adminInputCls}
                value={editing.priceRw ?? ""}
                onChange={(e) => set({ priceRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_services_category")} htmlFor="svc-category">
              <div className="relative">
                <select
                  id="svc-category"
                  className={adminSelectCls}
                  value={editing.category ?? ""}
                  onChange={(e) => set({ category: e.target.value })}
                >
                  {editing.category &&
                    !SERVICE_CATEGORIES.some((c) => c.value === editing.category) && (
                      <option value={editing.category}>
                        {editing.category} ({t("admin_form_legacy")})
                      </option>
                    )}
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(c.labelKey)}
                    </option>
                  ))}
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t("admin_services_icon")} htmlFor="svc-icon">
              <div className="relative">
                <select
                  id="svc-icon"
                  className={adminSelectCls}
                  value={editing.icon ?? "camera"}
                  onChange={(e) => set({ icon: e.target.value })}
                >
                  {ICONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t("admin_service_linked_post")} htmlFor="svc-post">
              <div className="relative">
                <select
                  id="svc-post"
                  className={adminSelectCls}
                  value={editing.linkedPostSlug ?? ""}
                  onChange={(e) => set({ linkedPostSlug: e.target.value })}
                >
                  <option value="">{t("admin_service_linked_post_none")}</option>
                  {/* A stored slug can outlive its post — keep it visible so editing doesn't silently drop it */}
                  {missingLegacy && (
                    <option value={editing.linkedPostSlug ?? ""}>
                      {editing.linkedPostSlug} ({t("admin_service_linked_post_missing")})
                    </option>
                  )}
                  {publishedPosts.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.titleEn}
                    </option>
                  ))}
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t("admin_sort_order")} htmlFor="svc-sort" hint={t("admin_sort_order_hint")}>
              <input
                id="svc-sort"
                type="number"
                className={adminInputCls}
                value={editing.sortOrder ?? 0}
                onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t("admin_service_image")}>
              <Dropzone
                token={token}
                value={editing.imageUrl ?? ""}
                onChange={(url) => set({ imageUrl: url })}
                onError={setError}
                title={t("admin_service_image")}
                hint={t("admin_service_image_hint")}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={!!editing.published}
                  onChange={(e) => set({ published: e.target.checked })}
                />
                {t("admin_status_published")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-text">
                <input
                  type="checkbox"
                  className={checkboxCls}
                  checked={!!editing.featured}
                  onChange={(e) => set({ featured: e.target.checked })}
                />
                {t("admin_featured")}
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
              <p className={emptyStateTitle}>{t("admin_services_empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s, idx) => (
                <div key={s.id} className={cx(cardCls, "overflow-hidden")}>
                  {s.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element -- admin-only service thumbnail */
                    <img src={s.imageUrl} alt="" className={thumbWide} loading="lazy" />
                  )}
                  <div className={cardBody}>
                    <p className="font-semibold text-admin-text">{s.nameEn}</p>
                    <p className="mt-1 text-sm text-admin-muted">{s.priceEn}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={pubPill(s.published)}>
                        {s.published ? t("admin_status_published") : t("admin_status_draft")}
                      </span>
                      {s.featured && (
                        <span className={badgeBrass}>
                          <Stars className="h-3 w-3" />
                          {t("admin_featured")}
                        </span>
                      )}
                    </div>
                    {s.linkedPostSlug && (
                      <a className={cx(linkCls, "mt-2 inline-flex items-center gap-1")} href={`/blog/${s.linkedPostSlug}`}>
                        /blog/{s.linkedPostSlug}
                      </a>
                    )}
                  </div>
                  <div className={cardFooter}>
                    <button
                      type="button"
                      aria-label={t("admin_reorder_up")}
                      disabled={orderBusy !== null || idx === 0}
                      className={iconBtnGhostSm}
                      onClick={() => move(s.id, -1)}
                    >
                      {orderBusy?.id === s.id && orderBusy?.dir === -1 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label={t("admin_reorder_down")}
                      disabled={orderBusy !== null || idx === list.length - 1}
                      className={iconBtnGhostSm}
                      onClick={() => move(s.id, 1)}
                    >
                      {orderBusy?.id === s.id && orderBusy?.dir === 1 ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <button type="button" className={rowActionBrass} onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                      {t("admin_edit")}
                    </button>
                    <DeleteButton busy={deletingId === s.id} onConfirm={() => remove(s.id)} />
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
