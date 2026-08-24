"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { adminApi, useBookings } from "@/lib/admin";
import type { Booking } from "@/lib/api";

const NEXT: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function AdminBookings({ token }: { token: string }) {
  const { bookings, error, reload } = useBookings(token);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(booking: Booking, status: string) {
    setBusy(true);
    try {
      await adminApi.patch(`/admin/bookings/${booking.id}/status`, token, { status });
      await reload();
      const fresh = (await adminApi.get<Booking>(`/admin/bookings/${booking.id}`, token));
      setSelected(fresh);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeToken(booking: Booking) {
    setBusy(true);
    try {
      await adminApi.post(`/admin/bookings/${booking.id}/revoke-token`, token, {});
      await reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="py-10 text-center text-red-400">{error}</p>;
  if (!bookings) return <p className="py-10 text-center text-zinc-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Bookings</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/5">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.map((b) => (
              <tr
                key={b.id}
                onClick={() => setSelected(b)}
                className="cursor-pointer bg-zinc-950/40 transition hover:bg-zinc-900/60"
              >
                <td className="px-4 py-3 font-semibold text-accent">{b.reference}</td>
                <td className="px-4 py-3">
                  <p>{b.contactName}</p>
                  <p className="text-xs text-zinc-500">{b.contactEmail}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">{b.service?.nameEn ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      b.status === "PENDING"
                        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                        : b.status === "CANCELLED"
                          ? "border-red-500/40 bg-red-500/10 text-red-400"
                          : "border-accent/40 bg-accent/10 text-accent"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{new Date(b.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <p className="py-16 text-center text-zinc-500">No bookings yet.</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-zinc-950 p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-black text-accent">{selected.reference}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {selected.service?.nameEn} · created {new Date(selected.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 hover:text-zinc-100">
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Client</p>
                <p className="mt-1 font-semibold">{selected.contactName}</p>
                <p className="text-sm text-zinc-400">{selected.contactEmail}</p>
                {selected.contactPhone && <p className="text-sm text-zinc-400">{selected.contactPhone}</p>}
              </div>
              <div className="rounded-xl border border-white/5 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Production</p>
                <p className="mt-1 text-sm text-zinc-300">{selected.eventDate ? `Date: ${new Date(selected.eventDate).toLocaleDateString()}` : "No date"}</p>
                <p className="text-sm text-zinc-300">{selected.location ? `Location: ${selected.location}` : "No location"}</p>
                {selected.budgetRange && <p className="text-sm text-zinc-300">Budget: {selected.budgetRange}</p>}
              </div>
            </div>
            {selected.details && (
              <div className="mt-4 rounded-xl border border-white/5 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500">Details</p>
                <p className="mt-1 text-sm text-zinc-300">{selected.details}</p>
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Update status</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {NEXT[selected.status]?.map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => setStatus(selected, s)}
                    className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-zinc-950 transition hover:brightness-110 disabled:opacity-50"
                  >
                    → {s}
                  </button>
                ))}
                {NEXT[selected.status]?.length === 0 && <p className="text-sm text-zinc-500">No further transitions.</p>}
              </div>
              <button
                disabled={busy}
                onClick={() => revokeToken(selected)}
                className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-red-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revoke tracking link
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Timeline</p>
              <ul className="mt-3 space-y-2">
                {selected.events?.map((e) => (
                  <li key={e.id} className="text-sm text-zinc-400">
                    <span className="font-semibold text-zinc-200">{e.status}</span> · {new Date(e.createdAt).toLocaleString()}
                    {e.note ? <span className="text-zinc-500"> — {e.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Notifications</p>
              <ul className="mt-3 space-y-1">
                {selected.notifications?.map((n) => (
                  <li key={n.id} className="text-xs text-zinc-500">
                    {n.channel} · {n.kind} → {n.recipient}:{" "}
                    <span className={n.status === "SENT" ? "text-emerald-400" : "text-red-400"}>{n.status}</span>
                    {n.error ? <span className="text-zinc-600"> ({n.error})</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
