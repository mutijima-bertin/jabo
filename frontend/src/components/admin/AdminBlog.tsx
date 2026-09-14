"use client";

import { useState } from "react";
import { ChevronDown, Eye, Heart, Inbox, Pencil, Plus } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { AdminPost, PostContentType } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { postTypeKey, useI18n, type DictKey } from "@/lib/i18n";
import {
  adminInputCls,
  adminSelectCls,
  badgeBrass,
  btnPrimary,
  cx,
  adminTextareaCls,
  checkboxCls,
  draftBadge,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  pubPill,
  rowActionBrass,
  selectChevron,
  table,
  tableActions,
  tableScrollWrap,
  tbody,
  tdCls,
  tdMuted,
  theadRow,
  thCls,
  tbodyRow,
} from "@/lib/ui";
import { CollectionManager, DeleteButton, Dropzone, Field, ManagerEditor } from "@/components/admin/shared/CollectionManager";

const BLOG_TYPES: Array<{ value: PostContentType; labelKey: DictKey }> = [
  { value: "PROJECT_RECAP", labelKey: "blog_type_recap" },
  { value: "CLIENT_STORY", labelKey: "blog_type_story" },
  { value: "EDUCATIONAL", labelKey: "blog_type_guide" },
  { value: "STUDIO_NEWS", labelKey: "blog_type_news" },
];

const empty: Partial<AdminPost> = {
  titleEn: "",
  titleRw: "",
  excerptEn: "",
  excerptRw: "",
  contentEn: "",
  contentRw: "",
  contentType: "PROJECT_RECAP",
  coverImageUrl: "",
  slug: "",
  published: true,
};

export function AdminBlog({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: items, error: loadError, loading, reload } = useAdminFetch<AdminPost[]>("/admin/posts", token);

  const [editing, setEditing] = useState<Partial<AdminPost> | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dirty = editing !== null && JSON.stringify(editing) !== baseline;

  const set = (patch: Partial<AdminPost>) => setEditing((prev) => ({ ...(prev ?? {}), ...patch }));

  const openNew = () => {
    setError("");
    setSaved(false);
    const row = { ...empty };
    setEditing(row);
    setBaseline(JSON.stringify(row));
  };

  const openEdit = (p: AdminPost) => {
    setError("");
    setSaved(false);
    const row: Partial<AdminPost> = {
      ...p,
      excerptEn: p.excerptEn ?? "",
      excerptRw: p.excerptRw ?? "",
      coverImageUrl: p.coverImageUrl ?? "",
    };
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
        excerptEn: editing.excerptEn ?? "",
        excerptRw: editing.excerptRw ?? "",
        contentEn: editing.contentEn ?? "",
        contentRw: editing.contentRw ?? "",
        contentType: editing.contentType ?? "PROJECT_RECAP",
        coverImageUrl: editing.coverImageUrl ?? "",
        slug: editing.slug ?? "",
        published: editing.published ?? true,
      };
      // Backend routes: create=POST, edit=PATCH, delete=DELETE (QA #1).
      if (editing.id) await adminApi.patch(`/admin/posts/${editing.id}`, token, body);
      else await adminApi.post("/admin/posts", token, body);
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
      await adminApi.del(`/admin/posts/${id}`, token);
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

  return (
    <CollectionManager
      title={t("admin_blog")}
      newLabel={t("admin_blog_new")}
      onNew={openNew}
      error={loadError}
      onRetry={reload}
      loading={loading}
    >
      {editing ? (
        <ManagerEditor
          title={editing.id ? t("admin_edit") : t("admin_blog_new")}
          onSubmit={save}
          onCancel={closeEditor}
          dirty={dirty}
          busy={busy}
          saved={saved}
          error={error}
          saveLabel={editing.id ? t("admin_save") : t("admin_form_create")}
        >
          <Field label={t("admin_blog_cover")}>
            <Dropzone
              token={token}
              value={editing.coverImageUrl ?? ""}
              onChange={(url) => set({ coverImageUrl: url })}
              onError={setError}
              title={t("admin_blog_cover")}
              hint={t("admin_service_image_hint")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin_blog_field_title_en")} htmlFor="post-title-en">
              <input
                id="post-title-en"
                required
                className={adminInputCls}
                value={editing.titleEn ?? ""}
                onChange={(e) => set({ titleEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_title_rw")} htmlFor="post-title-rw">
              <input
                id="post-title-rw"
                required
                className={adminInputCls}
                value={editing.titleRw ?? ""}
                onChange={(e) => set({ titleRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_excerpt_en")} htmlFor="post-excerpt-en">
              <input
                id="post-excerpt-en"
                className={adminInputCls}
                value={editing.excerptEn ?? ""}
                onChange={(e) => set({ excerptEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_excerpt_rw")} htmlFor="post-excerpt-rw">
              <input
                id="post-excerpt-rw"
                className={adminInputCls}
                value={editing.excerptRw ?? ""}
                onChange={(e) => set({ excerptRw: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_slug")} hint={t("admin_blog_slug_hint")} htmlFor="post-slug">
              <input
                id="post-slug"
                className={adminInputCls}
                value={editing.slug ?? ""}
                onChange={(e) => set({ slug: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_type")} htmlFor="post-type">
              <div className="relative">
                <select
                  id="post-type"
                  className={adminSelectCls}
                  value={editing.contentType ?? "PROJECT_RECAP"}
                  onChange={(e) => set({ contentType: e.target.value as PostContentType })}
                >
                  {BLOG_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {t(bt.labelKey)}
                    </option>
                  ))}
                </select>
                <ChevronDown className={selectChevron} aria-hidden="true" />
              </div>
            </Field>
            <Field label={t("admin_blog_field_content_en")} htmlFor="post-content-en" hint={t("admin_blog_markdown")}>
              <textarea
                id="post-content-en"
                required
                rows={8}
                className={adminTextareaCls}
                value={editing.contentEn ?? ""}
                onChange={(e) => set({ contentEn: e.target.value })}
              />
            </Field>
            <Field label={t("admin_blog_field_content_rw")} htmlFor="post-content-rw" hint={t("admin_blog_markdown")}>
              <textarea
                id="post-content-rw"
                rows={8}
                className={adminTextareaCls}
                value={editing.contentRw ?? ""}
                onChange={(e) => set({ contentRw: e.target.value })}
              />
            </Field>
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
              <p className={emptyStateTitle}>{t("admin_blog_empty")}</p>
              <button type="button" className={btnPrimary} onClick={openNew}>
                <Plus className="h-4 w-4" />
                {t("admin_blog_new")}
              </button>
            </div>
          ) : (
            <div className={tableScrollWrap}>
              <table className={cx(table, "min-w-[860px]")}>
                <thead className={theadRow}>
                  <tr>
                    <th scope="col" className={thCls}>{t("admin_blog_col_title")}</th>
                    <th scope="col" className={thCls}>{t("admin_blog_col_type")}</th>
                    <th scope="col" className={thCls}>{t("admin_blog_col_status")}</th>
                    <th scope="col" className={thCls}>{t("blog_views")}</th>
                    <th scope="col" className={thCls}>{t("blog_likes")}</th>
                    <th scope="col" className={thCls}>{t("admin_blog_col_updated")}</th>
                    <th scope="col" className={thCls} aria-hidden="true"></th>
                  </tr>
                </thead>
                <tbody className={tbody}>
                  {(items ?? []).map((p) => (
                    <tr key={p.id} className={tbodyRow}>
                      <td className={cx(tdCls, "max-w-xs")}>
                        <p className="truncate font-medium">{p.titleEn}</p>
                        {p.slug && <p className={cx(tdMuted, "mt-0.5 truncate text-xs")}>/{p.slug}</p>}
                      </td>
                      <td className={tdCls}>
                        <span className={badgeBrass}>{t(postTypeKey(p.contentType))}</span>
                      </td>
                      <td className={tdCls}>
                        {p.published ? (
                          <span className={pubPill(true)}>{t("admin_status_published")}</span>
                        ) : (
                          <span className={draftBadge}>{t("admin_status_draft")}</span>
                        )}
                      </td>
                      <td className={cx(tdCls, tdMuted)}>
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                          {p.views}
                        </span>
                      </td>
                      <td className={cx(tdCls, tdMuted)}>
                        <span className="inline-flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                          {p.likes}
                        </span>
                      </td>
                      <td className={cx(tdCls, tdMuted)}>{formatDate(p.updatedAt, locale)}</td>
                      <td className={tdCls}>
                        <span className={tableActions}>
                          <button type="button" className={rowActionBrass} onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                            {t("admin_edit")}
                          </button>
                          <DeleteButton busy={deletingId === p.id} onConfirm={() => remove(p.id)} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </CollectionManager>
  );
}
