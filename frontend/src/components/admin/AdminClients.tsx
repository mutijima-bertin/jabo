"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { adminApi } from "@/lib/admin";
import type { AdminClient } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** Newest booking date across a client's bookings (ISO strings compare lexicographically). */
function lastBookingAt(client: AdminClient): string | null {
  return client.bookings.reduce<string | null>(
    (acc, b) => (acc === null || b.createdAt > acc ? b.createdAt : acc),
    null,
  );
}

/** Read-only directory of portal clients (they are created automatically from bookings). */
export function AdminClients({ token }: { token: string }) {
  const { t } = useI18n();
  const [clients, setClients] = useState<AdminClient[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const fetchClients = useCallback(() => adminApi.get<AdminClient[]>("/admin/clients", token), [token]);

  // Initial load subscribes via .then rather than calling load() directly —
  // react-hooks/set-state-in-effect rejects component-scope calls that setState.
  useEffect(() => {
    fetchClients()
      .then((data) => {
        setClients(data);
        setError("");
      })
      .catch((e) => setError((e as Error).message));
  }, [fetchClients]);

  const filtered = useMemo(() => {
    if (!clients) return null;
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q),
    );
  }, [clients, query]);

  if (error) return <p className="py-10 text-center text-red-400">{error}</p>;
  if (!filtered) return <p className="py-10 text-center text-zinc-500">{t("admin_loading")}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">
        {t("admin_clients_title")}
        {filtered.length > 0 && <span className="ml-3 text-sm font-normal text-zinc-500">{filtered.length}</span>}
      </h1>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin_clients_search")}
          className="w-full rounded-xl border border-white/10 bg-zinc-950/60 py-2 pl-9 pr-3 text-sm outline-none focus:border-accent/60"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">{t("admin_clients_col_name")}</th>
              <th className="px-4 py-3">{t("admin_clients_col_email")}</th>
              <th className="px-4 py-3">{t("admin_clients_col_whatsapp")}</th>
              <th className="px-4 py-3">{t("admin_clients_col_bookings")}</th>
              <th className="px-4 py-3">{t("admin_clients_col_last_booking")}</th>
              <th className="px-4 py-3">{t("admin_clients_col_created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((c) => {
              const last = lastBookingAt(c);
              return (
                <tr key={c.id} className="bg-zinc-950/40 transition hover:bg-zinc-900/60">
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-accent">{c.bookings.length}</td>
                  <td className="px-4 py-3 text-zinc-400">{last ? new Date(last).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(c.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-16 text-center text-zinc-500">
            {(clients?.length ?? 0) === 0 ? t("admin_clients_empty") : t("admin_clients_no_match")}
          </p>
        )}
      </div>
    </div>
  );
}
