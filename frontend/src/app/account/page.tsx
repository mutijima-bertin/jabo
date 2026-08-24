"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Mail, MapPin, Package, Phone, User } from "lucide-react";
import { clearClientToken, clientFetch, getClientToken, type ClientAccount } from "@/lib/client";
import { statusKey, useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

// Status badge palette adapted from the admin table (dark zinc) to the cream
// theme — PENDING amber, CONFIRMED/DELIVERED/COMPLETED green, IN_PRODUCTION
// brass, CANCELLED red. Text shades are dark enough for the cream background.
const statusCls: Record<string, string> = {
  PENDING: "border-amber-600/40 bg-amber-500/15 text-amber-800",
  CONFIRMED: "border-green/40 bg-green/10 text-green-deep",
  IN_PRODUCTION: "border-brass/40 bg-brass/10 text-brass-dark",
  DELIVERED: "border-green/40 bg-green/10 text-green-deep",
  COMPLETED: "border-green-deep/40 bg-green-deep/10 text-green-deep",
  CANCELLED: "border-red-600/40 bg-red-500/15 text-red-700",
};

const badgeCls = (status: string) =>
  `inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusCls[status] ?? "border-ink/20 bg-ink/5 text-ink/60"}`;

type State = "loading" | "done" | "error";

export default function AccountPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [account, setAccount] = useState<ClientAccount | null>(null);

  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    clientFetch<ClientAccount>("/clients/me", token)
      .then((data) => {
        setAccount(data);
        setState("done");
      })
      .catch((e) => {
        if ((e as Error).message === "NOT_AUTHENTICATED") {
          // Stale/expired session — drop it and send back to the login page.
          clearClientToken();
          router.replace("/login");
        } else {
          setState("error");
        }
      });
  }, [router]);

  function logout() {
    clearClientToken();
    router.push("/login");
  }

  if (state === "loading") {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-brass" />
      </div>
    );
  }

  if (state === "error" || !account) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Logo className="mx-auto h-14 w-auto" />
        <h1 className="mt-10 font-serif text-3xl font-semibold leading-tight">{t("client_account_title")}</h1>
        <p className="mt-4 text-ink/60">{t("client_account_error")}</p>
        <p className="mt-8 text-sm text-ink/45">hello@creativesoundstudio.rw · +250 700 000 000</p>
      </div>
    );
  }

  const { client, bookings } = account;
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GB") : "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Logo className="h-12 w-auto" />
          <h1 className="mt-8 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            {t("client_account_title")}
          </h1>
          <p className="mt-2 text-ink/60">
            {t("client_account_greeting")} <span className="font-semibold text-ink">{client.name}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-brass hover:text-brass"
        >
          <LogOut className="h-4 w-4" />
          {t("client_account_logout")}
        </button>
      </div>

      {/* Profile */}
      <section className="mt-10 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-xs font-semibold uppercase tracking-[0.22em] text-brass">
          {t("client_account_profile")}
        </h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink/50">
              <User className="h-3.5 w-3.5 text-brass" />
              {t("client_account_name")}
            </dt>
            <dd className="mt-1.5 font-medium">{client.name}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink/50">
              <Mail className="h-3.5 w-3.5 text-brass" />
              {t("client_account_email")}
            </dt>
            <dd className="mt-1.5 font-medium">{client.email}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink/50">
              <Phone className="h-3.5 w-3.5 text-brass" />
              {t("client_account_phone")}
            </dt>
            <dd className="mt-1.5 font-medium">{client.phone ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Bookings */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">{t("client_account_bookings")}</h2>

        {bookings.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink/20 bg-cream-alt/60 p-10 text-center">
            <Package className="mx-auto h-10 w-10 text-brass/60" />
            <p className="mt-4 font-medium">{t("client_account_no_bookings")}</p>
            <p className="mt-1 text-sm text-ink/55">{t("client_account_no_bookings_hint")}</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-ink/50">{t("book_reference")}</p>
                    <p className="mt-1 text-lg font-bold text-brass">{b.reference}</p>
                  </div>
                  <span className={badgeCls(b.status)}>{t(statusKey(b.status))}</span>
                </div>
                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink/50">
                      <Package className="h-3.5 w-3.5 text-brass" />
                      {t("book_service")}
                    </dt>
                    <dd className="mt-1 font-medium">{b.serviceName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink/50">
                      <MapPin className="h-3.5 w-3.5 text-brass" />
                      {t("book_location")}
                    </dt>
                    <dd className="mt-1">{b.location ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink/50">{t("client_account_date")}</dt>
                    <dd className="mt-1">{fmtDate(b.eventDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-ink/50">{t("book_budget")}</dt>
                    <dd className="mt-1">{b.budgetRange ?? "—"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
