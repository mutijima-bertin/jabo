"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { adminApi } from "@/lib/admin";
import type { PortfolioItem } from "@/lib/api";

const empty = {
  titleEn: "",
  titleRw: "",
  category: "Events",
  clientName: "",
  tags: [],
  coverUrl: "",
  mediaUrls: [],
  mediaType: "image" as const,
  published: true,
  sortOrder: 0,
};

/** The public portfolio taxonomy (backend validates against this exact list). */
const CATEGORIES = ["Weddings", "Events", "Corporate", "Concerts", "Documentaries", "Portraits"] as const;

export function AdminPortfolio({ token }: { token: string }) {
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [editing, setEditing] = useState<Partial<PortfolioItem> | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** Save/validation error shown inline instead of a raw alert. */
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(() => adminApi.get<PortfolioItem[]>("/admin/portfolio", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchItems().then(setItems).catch((e) => alert(e.message));
  }, [fetchItems]);

  const load = useCallback(async () => setItems(await fetchItems()), [fetchItems]);

  async function uploadFile(file: File) {
    setBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { url } = await adminApi.post<{ url: string }>("/admin/uploads", token, { dataUrl });
      setEditing((e) => ({ ...(e ?? empty), coverUrl: url }));
    } catch (err) {
      alert((err as Error).message);
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
        titleEn: editing.titleEn,
        titleRw: editing.titleRw ?? "",
        category: editing.category,
        clientName: editing.clientName ?? "",
        tags: editing.tags ?? [],
        coverUrl: editing.coverUrl,
        mediaUrls: editing.mediaUrls ?? [],
        mediaType: editing.mediaType ?? "image",
        published: editing.published ?? true,
        sortOrder: editing.sortOrder ?? 0,
      };
      if (editing.id) await adminApi.put(`/admin/portfolio/${editing.id}`, token, body);
      else await adminApi.post("/admin/portfolio", token, body);
      setEditing(null);
      await load();
    } catch (e) {
      // Backend rejects non-canonical categories with VALIDATION + message — show it inline.
      setError((e as Error).message || "Could not save this item.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this portfolio item?")) return;
    try {
      await adminApi.del(`/admin/portfolio/${id}`, token);
      await load();
    } catch (e) {
      setError((e as Error).message || "Could not delete this portfolio item.");
    }
  }

  const input = "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-accent/60";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <button
          onClick={() => {
            setError(null);
            setEditing({ ...empty });
          }}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110"
        >
          + Add work
        </button>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
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
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition ${
              dragOver ? "border-accent bg-accent/10" : "border-white/10 hover:border-accent/40"
            }`}
          >
            {editing.coverUrl ? (
              <img src={editing.coverUrl} alt="cover" className="max-h-48 rounded-xl object-contain" />
            ) : (
              <UploadCloud className="h-10 w-10 text-zinc-500" />
            )}
            <p className="text-sm text-zinc-400">{busy ? "Uploading…" : "Drop cover image here or click to choose"}</p>
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

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Title (EN) *</label>
              <input required className={input} value={editing.titleEn ?? ""} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Title (RW)</label>
              <input className={input} value={editing.titleRw ?? ""} onChange={(e) => setEditing({ ...editing, titleRw: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Category *</label>
              <select
                required
                className={input}
                value={editing.category ?? "Events"}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              >
                {/* Keep a legacy value selectable so it displays when editing old rows */}
                {editing.category && !(CATEGORIES as readonly string[]).includes(editing.category) && (
                  <option value={editing.category}>{editing.category} (legacy)</option>
                )}
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Client</label>
              <input className={input} value={editing.clientName ?? ""} onChange={(e) => setEditing({ ...editing, clientName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Media type</label>
              <select className={input} value={editing.mediaType ?? "image"} onChange={(e) => setEditing({ ...editing, mediaType: e.target.value as "image" | "video" })}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Tags (comma separated)</label>
              <input
                className={input}
                defaultValue={(editing.tags ?? []).join(", ")}
                onBlur={(e) =>
                  setEditing({ ...editing, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })
                }
              />
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
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

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items?.map((i) => (
          <div key={i.id} className="group relative overflow-hidden rounded-2xl border border-white/5">
            <img src={i.coverUrl} alt={i.titleEn} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-zinc-950/95 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
              <p className="text-sm font-semibold">{i.titleEn}</p>
              <p className="text-xs text-zinc-400">{i.category}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => { setError(null); setEditing({ ...i }); }} className="rounded-full border border-white/20 px-3 py-1 text-xs hover:text-accent">
                  Edit
                </button>
                <button onClick={() => remove(i.id)} className="rounded-full border border-red-500/40 px-3 py-1 text-xs text-red-400">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
