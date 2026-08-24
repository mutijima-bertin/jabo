"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { adminApi, setToken } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.post<{ token: string }>("/auth/login", "", { email, password });
      setToken(res.token);
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message === "INVALID_CREDENTIALS" ? "Invalid email or password" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-32">
      <h1 className="text-center text-3xl font-bold">{t("admin_login")}</h1>
      <form onSubmit={submit} className="mt-10 space-y-4 rounded-3xl border border-white/5 bg-zinc-900/60 p-8">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">{t("admin_email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm outline-none focus:border-accent/60"
            placeholder="admin@creativesoundstudio.rw"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">{t("admin_password")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm outline-none focus:border-accent/60"
          />
        </div>
        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_signin")}
        </button>
      </form>
    </div>
  );
}
