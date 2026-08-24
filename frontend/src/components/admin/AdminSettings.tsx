"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin";
import type { SiteSetting } from "@/lib/api";

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
    </div>
  );
}
