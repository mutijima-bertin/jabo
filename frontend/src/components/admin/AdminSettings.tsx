"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Inbox, Loader2, Pencil, Plus, UploadCloud } from "lucide-react";
import { adminApi, useAdminFetch, useSessionGuard } from "@/lib/admin";
import type { AdminLogo, AdminTestimonial, SiteSetting } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  adminInputCls,
  adminTextareaCls,
  badgeBrass,
  badgeMuted,
  btnPrimary,
  btnSecondary,
  checkboxCls,
  cardHeaderTitle,
  cx,
  dropzoneCls,
  dropzoneHint,
  dropzoneIcon,
  dropzoneTitle,
  emptyState,
  emptyStateIcon,
  emptyStateIconWrap,
  emptyStateTitle,
  errorBanner,
  iconBtnGhostSm,
  loadingState,
  pageHeader,
  pageSub,
  pageTitle,
  pubPill,
  rowActionBrass,
  rowActionDefault,
  skeletonCard,
  skeletonRows,
  successBanner,
  table,
  tableScrollWrap,
  tbodyRow,
  tdCls,
  tdMuted,
  theadRow,
  thCls,
  tbody,
} from "@/lib/ui";
import { DeleteButton, Field, putCollectionOrder, uploadImage } from "@/components/admin/shared/CollectionManager";

/* ---------------------------------------------------------------------------
 * AdminSettings — three independent sections, each a real <form>:
 *   1. Site settings (dynamic key list, en/rw textareas)
 *   2. Client logo wall (upload → POST /admin/logos, delete)
 *   3. Testimonials (create/edit + publish toggle + delete)
 * ------------------------------------------------------------------------- */

export function AdminSettings({ token }: { token: string }) {
  const { t } = useI18n();
  return (
    <div>
      <div className={pageHeader}>
        <div>
          <h1 className={pageTitle}>{t("admin_settings_title")}</h1>
          <p className={pageSub}>{t("admin_settings_sub")}</p>
        </div>
      </div>

      <section className="mt-8">
        <SiteSettingsSection token={token} />
      </section>

      <section className="mt-14 border-t border-admin-line pt-10">
        <LogosSection token={token} />
      </section>

      <section className="mt-14 border-t border-admin-line pt-10">
        <TestimonialsSection token={token} />
      </section>
    </div>
  );
}

/* ----------------------------- Site settings ----------------------------- */

function SiteSettingsSection({ token }: { token: string }) {
  const { t } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: settings, error, loading, reload, setData } = useAdminFetch<SiteSetting[]>("/admin/settings", token);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");

  const setValue = (key: string, locale: string, value: string) => {
    setDirty(true);
    setSaved(false);
    setData(
      (prev) =>
        prev?.map((s) => (s.key === key && s.locale === locale ? { ...s, value } : s)) ?? prev,
    );
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setFormError("");
    try {
      await adminApi.put("/admin/settings", token, { settings });
      setSaved(true);
      setDirty(false);
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setFormError((err as Error).message || t("admin_error_generic"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={loadingState}>{skeletonRows(3).map((c, i) => <div key={i} className={c} />)}</div>;
  }

  if (error) {
    return (
      <div>
        <div className={errorBanner} role="alert">
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" className={btnSecondary} onClick={reload}>{t("admin_retry")}</button>
        </div>
      </div>
    );
  }

  const keys = Array.from(new Set((settings ?? []).map((s) => s.key)));

  return (
    <form onSubmit={save}>
      <div className="space-y-5">
        {keys.map((key) => (
          <div key={key} className={cx("rounded-2xl border border-admin-border bg-admin-panel p-5")}>
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-admin-faint">{key}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["en", "rw"] as const).map((loc) => {
                const current = settings?.find((s) => s.key === key && s.locale === loc);
                return (
                  <div key={loc}>
                    <Field label={t(loc === "en" ? "admin_lang_en" : "admin_lang_rw")}>
                      <textarea
                        rows={key === "about_story" ? 4 : 2}
                        className={adminTextareaCls}
                        value={current?.value ?? ""}
                        onChange={(e) => setValue(key, loc, e.target.value)}
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {saved && (
        <div className="mt-5" role="status">
          <div className={successBanner}>{t("admin_saved")}</div>
        </div>
      )}
      {formError && (
        <div className="mt-5">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{formError}</span>
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={!dirty || saving}
          className={cx(btnPrimary, "disabled:opacity-50")}
        >
          {saving ? t("admin_saving") : t("admin_settings_save")}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------ Client logos ----------------------------- */

function LogosSection({ token }: { token: string }) {
  const { t } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: logos, loading, reload, setData } = useAdminFetch<AdminLogo[]>("/admin/logos", token);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Non-null while a reorder PUT is in flight: all arrows disabled, clicked one spins. */
  const [orderBusy, setOrderBusy] = useState<{ id: string; dir: -1 | 1 } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      // uploadImage (shared) does FileReader → dataUrl → POST /admin/uploads.
      const { url } = await uploadImage(token, file);
      // Backend zod requires a non-empty name; derive it from the filename.
      const name = file.name.replace(/\.[^.]+$/, "").trim() || "Logo";
      await adminApi.post("/admin/logos", token, { name, imageUrl: url });
      reload();
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      const raw = (err as Error).message || t("admin_error_generic");
      setError(raw === "RATE_LIMITED" ? t("admin_upload_rate_limited") : raw);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError("");
    try {
      await adminApi.del(`/admin/logos/${id}`, token);
      reload();
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((err as Error).message || t("admin_error_generic"));
    } finally {
      setDeletingId(null);
    }
  }

  /** Non-optimistic reorder: swap in a copy, PUT the full collection, adopt the canonical 200 as state. */
  async function move(id: string, dir: -1 | 1) {
    if (!logos || orderBusy) return;
    const from = logos.findIndex((l) => l.id === id);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= logos.length) return;
    setOrderBusy({ id, dir });
    setError("");
    try {
      const next = await putCollectionOrder("/admin/logos/order", token, logos, from, to);
      setData(next);
    } catch (err) {
      const msg = (err as Error).message;
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

  const list = logos ?? [];

  return (
    <div>
      <h2 className={cardHeaderTitle}>{t("admin_logos_title")}</h2>
      <p className="mt-1 text-sm text-admin-muted">{t("admin_logos_sub")}</p>

      <div
        role="button"
        tabIndex={0}
        aria-label={t("admin_logos_drop")}
        className={cx(dropzoneCls, "mt-6")}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        <UploadCloud className={dropzoneIcon} />
        <span className={dropzoneTitle}>{busy ? t("admin_logos_uploading") : t("admin_logos_drop")}</span>
        <span className={dropzoneHint}>{t("admin_service_image_hint")}</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
      </div>

      {error && (
        <div className="mt-5">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={skeletonCard} />
          ))}
        </div>
      ) : logos && logos.length === 0 ? (
        <div className={emptyState}>
          <div className={emptyStateIconWrap}>
            <Inbox className={emptyStateIcon} />
          </div>
          <p className={emptyStateTitle}>{t("admin_logos_empty")}</p>
          <button type="button" className={btnPrimary} onClick={() => fileRef.current?.click()}>
            <UploadCloud className="h-4 w-4" />
            {t("admin_logos_add")}
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((logo, idx) => (
            <div
              key={logo.id}
              className="flex flex-col items-center gap-3 rounded-2xl border border-admin-border bg-admin-panel px-4 py-6 text-center"
            >
              {logo.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail */
                <img src={logo.imageUrl} alt={logo.name} className="h-14 w-auto max-w-full object-contain" loading="lazy" />
              ) : (
                <span className="rounded-full border border-admin-line-strong px-4 py-2 font-serif text-sm tracking-wide text-admin-muted">
                  {logo.name}
                </span>
              )}
              <p className="truncate text-xs text-admin-faint">{logo.name}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label={t("admin_reorder_up")}
                  disabled={orderBusy !== null || idx === 0}
                  className={iconBtnGhostSm}
                  onClick={() => move(logo.id, -1)}
                >
                  {orderBusy?.id === logo.id && orderBusy?.dir === -1 ? (
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
                  onClick={() => move(logo.id, 1)}
                >
                  {orderBusy?.id === logo.id && orderBusy?.dir === 1 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                <DeleteButton
                  busy={deletingId === logo.id}
                  onConfirm={() => remove(logo.id)}
                  confirmLabel={t("admin_logos_delete_confirm")}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Testimonials ----------------------------- */

const emptyTestimonial = {
  author: "",
  role: "",
  contentEn: "",
  contentRw: "",
  published: true,
};

type TestimonialForm = typeof emptyTestimonial & { id?: string };

function TestimonialsSection({ token }: { token: string }) {
  const { t, locale } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const { data: items, loading, reload } = useAdminFetch<AdminTestimonial[]>("/admin/testimonials", token);

  const [form, setForm] = useState<TestimonialForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (patch: Partial<TestimonialForm>) => setForm((prev) => ({ ...(prev ?? emptyTestimonial), ...patch }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        author: form.author,
        role: form.role,
        contentEn: form.contentEn,
        contentRw: form.contentRw,
        published: form.published,
      };
      if (form.id) await adminApi.put(`/admin/testimonials/${form.id}`, token, body);
      else await adminApi.post("/admin/testimonials", token, body);
      setForm(null);
      reload();
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((err as Error).message || t("admin_error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item: AdminTestimonial) {
    setRowBusy(item.id);
    setError("");
    try {
      await adminApi.patch(`/admin/testimonials/${item.id}`, token, { published: !item.published });
      reload();
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((err as Error).message || t("admin_error_generic"));
    } finally {
      setRowBusy(null);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError("");
    try {
      await adminApi.del(`/admin/testimonials/${id}`, token);
      reload();
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      setError((err as Error).message || t("admin_error_generic"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={cardHeaderTitle}>{t("admin_testimonials_title")}</h2>
          <p className="mt-1 text-sm text-admin-muted">{t("admin_testimonials_sub")}</p>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...emptyTestimonial })}
          className={btnPrimary}
        >
          <Plus className="h-4 w-4" />
          {t("admin_testimonials_new")}
        </button>
      </div>

      {error && (
        <div className="mt-5">
          <div className={errorBanner} role="alert">
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        </div>
      )}

      {form && (
        <form
          onSubmit={save}
          className="mt-6 grid gap-4 rounded-2xl border border-admin-border bg-admin-panel p-6 sm:grid-cols-2"
        >
          <Field label={t("admin_testimonials_author")} htmlFor="tm-author">
            <input
              id="tm-author"
              required
              className={adminInputCls}
              value={form.author}
              onChange={(e) => set({ author: e.target.value })}
            />
          </Field>
          <Field label={t("admin_testimonials_role")} htmlFor="tm-role">
            <input
              id="tm-role"
              className={adminInputCls}
              value={form.role}
              onChange={(e) => set({ role: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("admin_testimonials_quote_en")} htmlFor="tm-quote-en">
              <textarea
                id="tm-quote-en"
                required
                rows={3}
                className={adminTextareaCls}
                value={form.contentEn}
                onChange={(e) => set({ contentEn: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("admin_testimonials_quote_rw")} htmlFor="tm-quote-rw">
              <textarea
                id="tm-quote-rw"
                rows={3}
                className={adminTextareaCls}
                value={form.contentRw}
                onChange={(e) => set({ contentRw: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-admin-text">
              <input
                type="checkbox"
                className={checkboxCls}
                checked={form.published}
                onChange={(e) => set({ published: e.target.checked })}
              />
              {t("admin_testimonials_published")}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy}
                className={cx(btnPrimary, "disabled:opacity-50")}
              >
                {busy ? t("admin_saving") : form.id ? t("admin_save") : t("admin_form_create")}
              </button>
              <button
                type="button"
                onClick={() => setForm(null)}
                className={btnSecondary}
              >
                {t("admin_form_cancel")}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className={cx(loadingState, "mt-0")}>
          {skeletonRows(3).map((c, i) => (
            <div key={i} className={c} />
          ))}
        </div>
      ) : items && items.length === 0 ? (
        <div className={emptyState}>
          <div className={emptyStateIconWrap}>
            <Inbox className={emptyStateIcon} />
          </div>
          <p className={emptyStateTitle}>{t("admin_testimonials_empty")}</p>
          <button type="button" className={btnPrimary} onClick={() => setForm({ ...emptyTestimonial })}>
            <Plus className="h-4 w-4" />
            {t("admin_testimonials_new")}
          </button>
        </div>
      ) : (
        <div className={cx(tableScrollWrap, "mt-6")}>
          <table className={table}>
            <thead className={theadRow}>
              <tr>
                <th scope="col" className={thCls}>{t("admin_testimonials_col_quote")}</th>
                <th scope="col" className={thCls}>{t("admin_testimonials_col_author")}</th>
                <th scope="col" className={thCls}>{t("admin_testimonials_col_status")}</th>
                <th scope="col" className={thCls}>{t("admin_testimonials_col_source")}</th>
                <th scope="col" className={thCls}>{t("admin_testimonials_col_created")}</th>
                <th scope="col" className={thCls} aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody className={tbody}>
              {(items ?? []).map((item) => (
                <tr key={item.id} className={tbodyRow}>
                  <td className={cx(tdCls, "max-w-xs")}>
                    <p className="truncate">{item.contentEn}</p>
                    {item.contentRw && <p className={cx(tdMuted, "mt-0.5 truncate text-xs")}>{item.contentRw}</p>}
                  </td>
                  <td className={tdCls}>
                    <p className="font-medium">{item.author}</p>
                    {item.role && <p className={cx(tdMuted, "text-xs")}>{item.role}</p>}
                  </td>
                  <td className={tdCls}>
                    <span className={pubPill(item.published)}>
                      {item.published ? t("admin_testimonials_published") : t("admin_testimonials_draft")}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={item.source === "CLIENT" ? badgeBrass : badgeMuted}>
                      {item.source === "CLIENT"
                        ? t("client_testimonials_source_client")
                        : t("client_testimonials_source_admin")}
                    </span>
                    {item.source === "CLIENT" && item.client && (
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p className="font-medium text-admin-text">{item.client.name}</p>
                        <p className={tdMuted}>{item.client.email}</p>
                      </div>
                    )}
                  </td>
                  <td className={cx(tdCls, tdMuted)}>{formatDate(item.createdAt, locale)}</td>
                  <td className={tdCls}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={rowBusy === item.id}
                        className={item.published ? rowActionDefault : rowActionBrass}
                        onClick={() => togglePublished(item)}
                      >
                        {rowBusy === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {item.published ? t("admin_testimonials_unpublish") : t("admin_testimonials_publish")}
                      </button>
                      <button
                        type="button"
                        className={rowActionBrass}
                        onClick={() =>
                          setForm({
                            id: item.id,
                            author: item.author,
                            role: item.role ?? "",
                            contentEn: item.contentEn,
                            contentRw: item.contentRw ?? "",
                            published: item.published,
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {t("admin_testimonials_edit")}
                      </button>
                      <DeleteButton
                        busy={deletingId === item.id}
                        onConfirm={() => remove(item.id)}
                        confirmLabel={t("admin_testimonials_delete_confirm")}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
