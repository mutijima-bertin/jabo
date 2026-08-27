"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { adminApi } from "@/lib/admin";
import type { AdminPost, Service } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

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

export function AdminServices({ token }: { token: string }) {
  const { t } = useI18n();
  const [items, setItems] = useState<Service[] | null>(null);
  /** Blog rows feeding the linked-post dropdown (id/title/slug only matter here). */
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [editing, setEditing] = useState<Partial<Service> | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** Upload/save error shown inline instead of a raw alert. */
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(() => adminApi.get<Service[]>("/admin/services", token), [token]);
  const fetchPosts = useCallback(() => adminApi.get<AdminPost[]>("/admin/posts", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchItems().then(setItems).catch((e) => alert(e.message));
  }, [fetchItems]);

  // Blog list is optional chrome for the dropdown — a failed load just leaves it empty.
  useEffect(() => {
    fetchPosts().then(setPosts).catch(() => {});
  }, [fetchPosts]);

  const load = useCallback(async () => setItems(await fetchItems()), [fetchItems]);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi.post<{ url: string }>("/admin/uploads", token, { dataUrl });
      setEditing((e) => ({ ...(e ?? empty), imageUrl: url }));
    } catch (err) {
      setError((err as Error).message || "Could not upload this image.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        nameEn: editing.nameEn,
        nameRw: editing.nameRw,
        descriptionEn: editing.descriptionEn,
        descriptionRw: editing.descriptionRw,
        priceEn: editing.priceEn,
        priceRw: editing.priceRw,
        category: editing.category,
        icon: editing.icon,
        // Backend zod: both are z.string().optional() (null rejected) — send "" to clear.
        imageUrl: editing.imageUrl ?? "",
        linkedPostSlug: editing.linkedPostSlug ?? "",
        featured: editing.featured,
        published: editing.published,
        sortOrder: editing.sortOrder,
      };
      if (editing.id) await adminApi.put(`/admin/services/${editing.id}`, token, body);
      else await adminApi.post("/admin/services", token, body);
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message || "Could not save this service.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    try {
      await adminApi.del(`/admin/services/${id}`, token);
      await load();
    } catch (e) {
      setError((e as Error).message || "Could not delete this service.");
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-accent/60";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <button
          onClick={() => {
            setError(null);
            setEditing({ ...empty });
          }}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110"
        >
          + New service
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name (EN) *</label>
            <input required className={input} value={editing.nameEn ?? ""} onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name (RW) *</label>
            <input required className={input} value={editing.nameRw ?? ""} onChange={(e) => setEditing({ ...editing, nameRw: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Description (EN)</label>
            <textarea className={input} rows={2} value={editing.descriptionEn ?? ""} onChange={(e) => setEditing({ ...editing, descriptionEn: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Description (RW)</label>
            <textarea className={input} rows={2} value={editing.descriptionRw ?? ""} onChange={(e) => setEditing({ ...editing, descriptionRw: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Price (EN) *</label>
            <input required className={input} value={editing.priceEn ?? ""} onChange={(e) => setEditing({ ...editing, priceEn: e.target.value })} placeholder="From 150,000 RWF" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Price (RW) *</label>
            <input required className={input} value={editing.priceRw ?? ""} onChange={(e) => setEditing({ ...editing, priceRw: e.target.value })} placeholder="Uhereye kuri 150,000 RWF" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Category</label>
            <input className={input} value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Icon</label>
            <select className={input} value={editing.icon ?? "camera"} onChange={(e) => setEditing({ ...editing, icon: e.target.value })}>
              {["camera", "video", "broadcast", "drone", "photo", "edit", "ad"].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_service_image")}</label>
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
                if (f) uploadFile(f);
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-3 transition ${
                dragOver ? "border-accent bg-accent/10" : "border-white/10 hover:border-accent/40"
              }`}
            >
              {editing.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-thumbnail dimensions need plain img
                <img src={editing.imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
              ) : (
                <UploadCloud className="h-7 w-7 shrink-0 text-zinc-500" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">{busy ? t("admin_logos_uploading") : t("admin_service_image_hint")}</p>
                {editing.imageUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing({ ...editing, imageUrl: "" });
                    }}
                    className="mt-1 rounded-full border border-red-500/30 px-3 py-0.5 text-xs text-red-400 transition hover:border-red-500/60"
                  >
                    {t("admin_service_remove_image")}
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">{t("admin_service_linked_post")}</label>
            <select
              className={input}
              value={editing.linkedPostSlug ?? ""}
              onChange={(e) => setEditing({ ...editing, linkedPostSlug: e.target.value })}
            >
              <option value="">{t("admin_service_linked_post_none")}</option>
              {/* A stored slug can outlive its post (deletion doesn't clean up links) — keep it visible so editing doesn't silently drop it */}
              {editing.linkedPostSlug && !(posts ?? []).some((p) => p.slug === editing.linkedPostSlug) && (
                <option value={editing.linkedPostSlug}>{editing.linkedPostSlug} (missing)</option>
              )}
              {(posts ?? []).map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.titleEn}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={!!editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
              Featured
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-full bg-accent px-6 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50">
              {editing.id ? "Save" : "Create"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-400">
              Cancel
            </button>
            {error && (
              <p role="alert" className="text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/5 bg-zinc-900/60 p-5">
            <p className="font-semibold">{s.nameEn}</p>
            <p className="mt-1 text-sm text-zinc-400">{s.priceEn}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setError(null);
                  setEditing({ ...s });
                }}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-300 hover:text-accent"
              >
                Edit
              </button>
              <button onClick={() => remove(s.id)} className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
