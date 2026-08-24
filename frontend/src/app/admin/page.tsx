"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, Images, Settings, LogOut, ChevronRight, Loader2, Newspaper } from "lucide-react";
import { useAdminAuth, clearToken } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminBookings } from "@/components/admin/AdminBookings";
import { AdminServices } from "@/components/admin/AdminServices";
import { AdminPortfolio } from "@/components/admin/AdminPortfolio";
import { AdminBlog } from "@/components/admin/AdminBlog";
import { AdminSettings } from "@/components/admin/AdminSettings";

type Tab = "dashboard" | "bookings" | "services" | "portfolio" | "blog" | "settings";

const tabs: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarCheck },
  { id: "services", label: "Services", icon: ChevronRight },
  { id: "portfolio", label: "Portfolio", icon: Images },
  { id: "blog", label: "Blog", icon: Newspaper },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { token, ready } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!ready) {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-sm px-4 py-40 text-center">
        <h1 className="text-2xl font-bold">Admin area</h1>
        <p className="mt-3 text-zinc-400">Sign in to manage bookings, services and content.</p>
        <button
          onClick={() => router.push("/admin/login")}
          className="mt-8 rounded-full bg-accent px-7 py-3 text-sm font-bold text-zinc-950 transition hover:brightness-110"
        >
          {t("admin_login")}
        </button>
      </div>
    );
  }

  function logout() {
    clearToken();
    router.replace("/");
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 py-10">
      <aside className="hidden w-56 shrink-0 flex-col gap-1 md:flex">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Creative Sound Studio</p>
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                tab === tb.id ? "bg-accent text-zinc-950" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tb.label}
            </button>
          );
        })}
        <button
          onClick={logout}
          className="mt-auto flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          {t("admin_logout")}
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex gap-2 md:hidden">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition ${
                tab === tb.id ? "bg-accent text-zinc-950" : "border border-white/10 text-zinc-400"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        {tab === "dashboard" && <AdminDashboard token={token} onOpenBookings={() => setTab("bookings")} />}
        {tab === "bookings" && <AdminBookings token={token} />}
        {tab === "services" && <AdminServices token={token} />}
        {tab === "portfolio" && <AdminPortfolio token={token} />}
        {tab === "blog" && <AdminBlog token={token} />}
        {tab === "settings" && <AdminSettings token={token} />}
      </div>
    </div>
  );
}
