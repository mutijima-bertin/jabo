"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { adminApi } from "@/lib/admin";
import type { SiteSetting, AdminLogo, AdminTestimonial } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function AdminSettings({ token }: { token: string }) {
  const [settings, setSettings] = useState<SiteSetting[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminApi.get<SiteSetting[]>("/admin/settings", token).then(setSettings).catch((e) => alert(e.message));
  }, [token]);

  async function save() {
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    try {
      await adminApi.put("/admin/settings", token, { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return <p className="py-10 text-center text-zinc-500">Loading…</p>;

  const keys = Array.from(new Set(settings.map((s) => s.key)));
  const setValue = (key: string, locale: string, value: string) =>
    setSettings((prev) => prev?.map((s) => (s.key === key && s.locale === locale ? { ...s, value } : s)) ?? null);

  const input = "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-accent/60";

  return (
    <div>
      <h1 className="text-2xl font-bold">Site settings</h1>
      <p className="mt-2 text-sm text-zinc-400">These values power the public website hero, about section, and contact details.</p>

      <div className="mt-6 space-y-5">
        {keys.map((key) => (
          <div key={key} className="rounded-2xl border border-white/5 bg-zinc-900/60 p-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-zinc-500">{key}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["en", "rw"] as const).map((loc) => {
                const current = settings.find((s) => s.key === key && s.locale === loc);
                return (
                  <div key={loc}>
                    <label className="mb-1 block text-xs text-zinc-400">{loc === "en" ? "English" : "Kinyarwanda"}</label>
                    <textarea
                      rows={key === "about_story" ? 4 : 2}
                      className={input}
                      value={current?.value ?? ""}
                      onChange={(e) => setValue(key, loc, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="mt-6 rounded-full bg-accent px-7 py-3 text-sm font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-50"
      >
        {saved ? "Saved ✓" : busy ? "Saving…" : "Save settings"}
      </button>

      {/* ---------- Client logos ---------- */}
      <section className="mt-14 border-t border-white/10 pt-10">
        <LogosSection token={token} />
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="mt-14 border-t border-white/10 pt-10">
        <TestimonialsSection token={token} />
      </section>
    </div>
  );
}

const emptyTestimonial = {
  author: "",
  role: "",
  contentEn: "",
  contentRw: "",
  published: true,
};

/** Client-logo wall management: dropzone upload + delete. */
function LogosSection({ token }: { token: string }) {
  const { t } = useI18n();
  const [logos, setLogos] = useState<AdminLogo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchLogos = useCallback(() => adminApi.get<AdminLogo[]>("/admin/logos", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchLogos().then(setLogos).catch((e) => alert(e.message));
  }, [fetchLogos]);

  const load = useCallback(async () => setLogos(await fetchLogos()), [fetchLogos]);

  async function uploadLogo(file: File) {
    setBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi.post<{ url: string }>("/admin/uploads", token, { dataUrl });
      // Backend zod requires a non-empty name; derive it from the filename.
      const name = file.name.replace(/\.[^.]+$/, "").trim() || "Logo";
      await adminApi.post("/admin/logos", token, { name, imageUrl: url });
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin_logos_delete_confirm"))) return;
    try {
      await adminApi.del(`/admin/logos/${id}`, token);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold">{t("admin_logos_title")}</h2>
      <p className="mt-2 text-sm text-zinc-400">{t("admin_logos_sub")}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) uploadLogo(f);
        }}
        onClick={() => fileRef.current?.click()}
        className={`mt-6 flex cursor-pointer items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 transition ${
          dragOver ? "border-accent bg-accent/10" : "border-white/10 hover:border-accent/40"
        }`}
      >
        <UploadCloud className="h-8 w-8 shrink-0 text-zinc-500" />
        <p className="text-sm text-zinc-400">{busy ? t("admin_logos_uploading") : t("admin_logos_drop")}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadLogo(f);
          }}
        />
      </div>

      {logos !== null && logos.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">{t("admin_logos_empty")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {logos?.map((logo) => (
            <div
              key={logo.id}
              className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 px-4 py-6 text-center"
            >
              {logo.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail; matches AdminPortfolio/AdminBlog */
                <img src={logo.imageUrl} alt={logo.name} className="h-14 w-auto max-w-full object-contain" loading="lazy" />
              ) : (
                <span className="rounded-full border border-white/10 px-4 py-2 font-serif text-sm tracking-wide text-zinc-400">
                  {logo.name}
                </span>
              )}
              <p className="truncate text-xs text-zinc-500">{logo.name}</p>
              <button
                onClick={() => remove(logo.id)}
                className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
              >
                {t("admin_form_delete")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Testimonials management: create form + list with publish toggle and delete. */
function TestimonialsSection({ token }: { token: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<AdminTestimonial[] | null>(null);
  const [editing, setEditing] = useState<typeof emptyTestimonial | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchItems = useCallback(() => adminApi.get<AdminTestimonial[]>("/admin/testimonials", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchItems().then(setItems).catch((e) => alert(e.message));
  }, [fetchItems]);

  const load = useCallback(async () => setItems(await fetchItems()), [fetchItems]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await adminApi.post("/admin/testimonials", token, {
        author: editing.author,
        role: editing.role,
        contentEn: editing.contentEn,
        contentRw: editing.contentRw,
        published: editing.published,
      });
      setEditing(null);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item: AdminTestimonial) {
    try {
      await adminApi.patch(`/admin/testimonials/${item.id}`, token, { published: !item.published });
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm(t("admin_testimonials_delete_confirm"))) return;
    try {
      await adminApi.del(`/admin/testimonials/${id}`, token);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-accent/60";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("admin_testimonials_title")}</h2>
        <button
          onClick={() => setEditing({ ...emptyTestimonial })}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110"
        >
          + {t("admin_testimonials_new")}
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{t("admin_testimonials_sub")}</p>

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_testimonials_author")}</label>
            <input required className={input} value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_testimonials_role")}</label>
            <input className={input} value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_testimonials_quote_en")}</label>
            <textarea
              required
              className={input}
              rows={3}
              value={editing.contentEn}
              onChange={(e) => setEditing({ ...editing, contentEn: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_testimonials_quote_rw")}</label>
            <textarea
              className={input}
              rows={3}
              value={editing.contentRw}
              onChange={(e) => setEditing({ ...editing, contentRw: e.target.value })}
            />
          </div>
          <div className="flex items-end justify-between gap-3 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
              {t("admin_testimonials_published")}
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="rounded-full bg-accent px-6 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50">
                {t("admin_form_create")}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-400">
                {t("admin_form_cancel")}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">{t("admin_testimonials_col_quote")}</th>
              <th className="px-4 py-3">{t("admin_testimonials_col_author")}</th>
              <th className="px-4 py-3">{t("admin_testimonials_col_status")}</th>
              <th className="px-4 py-3">{t("admin_testimonials_col_created")}</th>
              <th className="px-4 py-3 text-right">{t("admin_testimonials_col_actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items?.map((item) => (
              <tr key={item.id} className={`bg-zinc-950/40 transition hover:bg-zinc-900/60 ${item.published ? "" : "opacity-60"}`}>
                <td className="max-w-xs px-4 py-3 text-zinc-300">
                  <p className="truncate">{item.contentEn}</p>
                  {item.contentRw && <p className="truncate text-xs text-zinc-600">{item.contentRw}</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{item.author}</p>
                  {item.role && <p className="text-xs text-zinc-500">{item.role}</p>}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      item.published ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 bg-white/5 text-zinc-500"
                    }`}
                  >
                    {item.published ? t("admin_testimonials_published") : t("admin_testimonials_draft")}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => togglePublished(item)}
                      disabled={busy}
                      className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-300 transition hover:text-accent disabled:opacity-50"
                    >
                      {item.published ? t("admin_testimonials_unpublish") : t("admin_testimonials_publish")}
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      disabled={busy}
                      className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-400 disabled:opacity-50"
                    >
                      {t("admin_form_delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items !== null && items.length === 0 && (
          <p className="py-16 text-center text-zinc-500">{t("admin_testimonials_empty")}</p>
        )}
      </div>
    </div>
  );
}
