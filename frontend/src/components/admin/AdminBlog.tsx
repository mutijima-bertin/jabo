"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, Eye, Heart } from "lucide-react";
import { adminApi } from "@/lib/admin";
import type { AdminPost, PostContentType } from "@/lib/api";

const empty: Partial<AdminPost> = {
  slug: "",
  titleEn: "",
  titleRw: "",
  excerptEn: "",
  excerptRw: "",
  contentType: "PROJECT_RECAP",
  coverImageUrl: "",
  contentEn: "",
  contentRw: "",
  published: false,
};

const CONTENT_TYPES: Array<{ value: PostContentType; label: string }> = [
  { value: "PROJECT_RECAP", label: "Project recap" },
  { value: "CLIENT_STORY", label: "Client story" },
  { value: "EDUCATIONAL", label: "Educational" },
  { value: "STUDIO_NEWS", label: "Studio news" },
];

function contentTypeLabel(v: string) {
  return CONTENT_TYPES.find((c) => c.value === v)?.label ?? v;
}

export function AdminBlog({ token }: { token: string }) {
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [editing, setEditing] = useState<Partial<AdminPost> | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(() => adminApi.get<AdminPost[]>("/admin/posts", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchPosts().then(setPosts).catch((e) => alert(e.message));
  }, [fetchPosts]);

  const load = useCallback(async () => setPosts(await fetchPosts()), [fetchPosts]);

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
      setEditing((e) => ({ ...(e ?? empty), coverImageUrl: url }));
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
    try {
      // Backend zod: coverImageUrl is z.string().optional() — omit-on-undefined only,
      // so send "" (never null). slug omitted when empty → server derives it from titleEn.
      const body = {
        slug: editing.slug?.trim() || undefined,
        titleEn: editing.titleEn,
        titleRw: editing.titleRw,
        excerptEn: editing.excerptEn ?? "",
        excerptRw: editing.excerptRw ?? "",
        contentType: editing.contentType ?? "PROJECT_RECAP",
        coverImageUrl: editing.coverImageUrl ?? "",
        contentEn: editing.contentEn,
        contentRw: editing.contentRw,
        published: !!editing.published,
      };
      if (editing.id) await adminApi.patch(`/admin/posts/${editing.id}`, token, body);
      else await adminApi.post("/admin/posts", token, body);
      setEditing(null);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    await adminApi.del(`/admin/posts/${id}`, token);
    await load();
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm outline-none focus:border-accent/60";

  if (posts === null) return <p className="py-10 text-center text-zinc-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          Blog posts
          {posts.length > 0 && <span className="text-sm font-normal text-zinc-500">{posts.length}</span>}
        </h1>
        <button
          onClick={() => setEditing({ ...empty })}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110"
        >
          + New post
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
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition ${
              dragOver ? "border-accent bg-accent/10" : "border-white/10 hover:border-accent/40"
            }`}
          >
            {editing.coverImageUrl ? (
              <img src={editing.coverImageUrl} alt="cover" className="h-20 w-32 rounded-lg object-cover" />
            ) : (
              <UploadCloud className="h-8 w-8 shrink-0 text-zinc-500" />
            )}
            <div>
              <p className="text-sm text-zinc-300">Cover image</p>
              <p className="text-xs text-zinc-500">{busy ? "Uploading…" : "Drop here or click to choose"}</p>
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

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">English</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Title (EN) *</label>
                <input required className={input} value={editing.titleEn ?? ""} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Excerpt (EN)</label>
                <input className={input} value={editing.excerptEn ?? ""} onChange={(e) => setEditing({ ...editing, excerptEn: e.target.value })} placeholder="Short summary shown in post cards" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">Content (EN) *</label>
                <textarea
                  required
                  className={input}
                  rows={8}
                  value={editing.contentEn ?? ""}
                  onChange={(e) => setEditing({ ...editing, contentEn: e.target.value })}
                />
                <p className="mt-1 text-xs text-zinc-500">Markdown supported.</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Kinyarwanda</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Title (RW) *</label>
                <input required className={input} value={editing.titleRw ?? ""} onChange={(e) => setEditing({ ...editing, titleRw: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Excerpt (RW)</label>
                <input className={input} value={editing.excerptRw ?? ""} onChange={(e) => setEditing({ ...editing, excerptRw: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">Content (RW) *</label>
                <textarea
                  required
                  className={input}
                  rows={8}
                  value={editing.contentRw ?? ""}
                  onChange={(e) => setEditing({ ...editing, contentRw: e.target.value })}
                />
                <p className="mt-1 text-xs text-zinc-500">Markdown supported.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Type</label>
              <select
                className={input}
                value={editing.contentType ?? "PROJECT_RECAP"}
                onChange={(e) => setEditing({ ...editing, contentType: e.target.value as PostContentType })}
              >
                {CONTENT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Slug</label>
              <input className={input} value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={!!editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} />
                Published
              </label>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button type="submit" disabled={busy} className="rounded-full bg-accent px-6 py-2 text-sm font-bold text-zinc-950 disabled:opacity-50">
              {editing.id ? "Save" : "Create"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-white/10 px-5 py-2 text-sm text-zinc-400">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Likes</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {posts.map((p) => (
              <tr key={p.id} className="bg-zinc-950/40 transition hover:bg-zinc-900/60">
                <td className="px-4 py-3">
                  <p className="font-semibold">{p.titleEn}</p>
                  <p className="text-xs text-zinc-500">/{p.slug}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                    {contentTypeLabel(p.contentType)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-xs">
                    <span className={`h-2 w-2 rounded-full ${p.published ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    {p.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {p.views}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {p.likes}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{new Date(p.updatedAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditing({ ...p })}
                      className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-zinc-300 hover:text-accent"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && <p className="py-16 text-center text-zinc-500">No posts yet.</p>}
      </div>
    </div>
  );
}
