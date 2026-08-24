"use client";

import { useDashboard } from "@/lib/admin";

const labels: Record<string, string> = {
  total: "Total bookings",
  pending: "Pending",
  confirmed: "Confirmed",
  inProduction: "In production",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  clients: "Clients",
};

export function AdminDashboard({ token, onOpenBookings }: { token: string; onOpenBookings: () => void }) {
  const { data, error } = useDashboard(token);

  if (error) return <p className="py-10 text-center text-red-400">{error}</p>;
  if (!data) return <p className="py-10 text-center text-zinc-500">Loading…</p>;

  const cards = [
    ["total", data.stats.total],
    ["pending", data.stats.pending],
    ["confirmed", data.stats.confirmed],
    ["inProduction", data.stats.inProduction],
    ["delivered", data.stats.delivered],
    ["completed", data.stats.completed],
    ["cancelled", data.stats.cancelled],
    ["clients", data.stats.clients],
  ] as const;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-white/5 bg-zinc-900/60 p-5">
            <p className="text-3xl font-black text-accent">{value}</p>
            <p className="mt-1 text-sm text-zinc-400">{labels[key]}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 text-lg font-semibold">Recent bookings</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.recent.map((b) => (
              <tr key={b.id} className="bg-zinc-950/40">
                <td className="px-4 py-3 font-semibold text-accent">{b.reference}</td>
                <td className="px-4 py-3 text-zinc-300">{b.service?.nameEn ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{b.status}</span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={onOpenBookings} className="mt-6 text-sm font-semibold text-accent hover:underline">
        View all bookings →
      </button>
    </div>
  );
}
