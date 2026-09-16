"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, LogOut, Mail, MapPin, Package, Phone, User } from "lucide-react";
import type { ClientTestimonial } from "@/lib/api";
import { clearClientToken, clientFetch, getClientToken, type ClientAccount } from "@/lib/client";
import { statusKey, useI18n } from "@/lib/i18n";
import { CONTACT } from "@/lib/site";
import { inputCls, labelCls } from "@/lib/ui";
import { Logo } from "@/components/shared/Logo";

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

// Testimonial moderation pill in the page's status palette: published → green
// (bold), pending review → amber.
const testimonialPill = (published: boolean) =>
  `inline-flex items-center rounded-full border px-3 py-1 text-xs ${
    published
      ? "border-green/40 bg-green/10 font-bold text-green-deep"
      : "border-amber-600/40 bg-amber-500/15 font-semibold text-amber-800"
  }`;

type State = "loading" | "done" | "error";

export default function AccountPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [account, setAccount] = useState<ClientAccount | null>(null);

  // --- Client testimonial section state (one submission per client) ---
  const [testimonial, setTestimonial] = useState<ClientTestimonial | null>(null);
  const [testimonialState, setTestimonialState] = useState<"loading" | "done" | "error">("loading");
  const [tmRole, setTmRole] = useState("");
  const [tmContentEn, setTmContentEn] = useState("");
  const [tmContentRw, setTmContentRw] = useState("");
  const [tmError, setTmError] = useState("");
  const [tmMinError, setTmMinError] = useState(false);
  const [tmSaving, setTmSaving] = useState(false);
  // Per-booking tracking link (mints a fresh magic token on demand).
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [trackError, setTrackError] = useState(false);

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
    // Fetch the client's own testimonial alongside /clients/me — the section
    // below only renders when the account has at least one booking.
    clientFetch<{ testimonial: ClientTestimonial | null }>("/clients/testimonials/me", token)
      .then((data) => {
        setTestimonial(data.testimonial);
        setTestimonialState("done");
      })
      .catch((e) => {
        if ((e as Error).message === "NOT_AUTHENTICATED") {
          clearClientToken();
          router.replace("/login");
        } else {
          setTestimonialState("error");
        }
      });
  }, [router]);

  /** One submission per client: POST, then mirror the API's ALREADY_SUBMITTED
   *  guard by refetching /me so the UI lands on the submitted state. */
  async function submitTestimonial(e: React.FormEvent) {
    e.preventDefault();
    const token = getClientToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const en = tmContentEn.trim();
    const rw = tmContentRw.trim();
    if (en.length < 10) {
      // Mirror the API's 10–1000 char rule client-side before hitting the wire.
      setTmMinError(true);
      setTmError("");
      return;
    }
    setTmMinError(false);
    setTmError("");
    setTmSaving(true);
    try {
      const res = await clientFetch<{ testimonial: ClientTestimonial }>("/clients/testimonials", token, {
        method: "POST",
        body: JSON.stringify({
          role: tmRole.trim() || undefined,
          contentEn: en,
          contentRw: rw || undefined,
        }),
      });
      setTestimonial(res.testimonial);
      setTestimonialState("done");
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "NOT_AUTHENTICATED") {
        clearClientToken();
        router.replace("/login");
        return;
      }
      if (msg === "ALREADY_SUBMITTED") {
        try {
          const data = await clientFetch<{ testimonial: ClientTestimonial | null }>(
            "/clients/testimonials/me",
            token,
          );
          setTestimonial(data.testimonial);
          setTestimonialState("done");
        } catch (err2) {
          if ((err2 as Error).message === "NOT_AUTHENTICATED") {
            clearClientToken();
            router.replace("/login");
            return;
          }
          setTmError(t("client_testimonial_error"));
        }
        return;
      }
      setTmError(t("client_testimonial_error"));
    } finally {
      setTmSaving(false);
    }
  }

  function logout() {
    clearClientToken();
    router.push("/login");
  }

  /** Mint a tracking token for one of the client's own bookings and open its timeline. */
  async function openTracking(bookingId: string) {
    const token = getClientToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setOpeningId(bookingId);
    setTrackError(false);
    try {
      const res = await clientFetch<{ trackUrl: string }>(`/clients/bookings/${bookingId}/track-token`, token, {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(res.trackUrl);
    } catch (err) {
      if ((err as Error).message === "NOT_AUTHENTICATED") {
        clearClientToken();
        router.replace("/login");
        return;
      }
      setTrackError(true);
      setOpeningId(null);
    }
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
        <p className="mt-8 text-sm text-ink/45">{CONTACT.email} · {CONTACT.phoneDisplay}</p>
      </div>
    );
  }

  const { client, bookings } = account;
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale === "rw" ? "fr-RW" : "en-GB") : "—";

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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold">{t("client_account_bookings")}</h2>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full border border-brass/40 bg-cream px-5 py-2 text-sm font-semibold text-brass-dark transition hover:bg-brass/10"
          >
            + {t("client_account_book_another")}
          </Link>
        </div>

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
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                  <p className="text-xs text-ink/45">{t("client_account_track_hint")}</p>
                  <button
                    type="button"
                    onClick={() => openTracking(b.id)}
                    disabled={openingId === b.id}
                    className="inline-flex items-center gap-2 rounded-full bg-brass-deep px-5 py-2 text-sm font-bold text-cream transition hover:bg-brass-dark disabled:opacity-60"
                  >
                    {openingId === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    {t("client_account_view_details")}
                  </button>
                </div>
                {trackError && (
                  <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                    {t("book_error")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Testimonial — only for clients who actually booked with us */}
      {bookings.length > 0 && (
        <section className="mt-12">
          <div className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-8">
            {testimonial ? (
              <>
                <h2 className="font-serif text-2xl font-semibold">{t("client_testimonial_submitted")}</h2>
                <p className="mt-2 text-ink/60">{t("client_testimonial_thanks")}</p>
                <figure className="mt-6 rounded-2xl border border-ink/10 bg-cream-alt/60 p-6">
                  <blockquote className="font-serif text-lg italic leading-relaxed text-ink/75">
                    &ldquo;{locale === "rw" && testimonial.contentRw ? testimonial.contentRw : testimonial.contentEn}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-ink/10 pt-4">
                    <div>
                      <p className="font-semibold text-ink">{testimonial.author}</p>
                      {testimonial.role && <p className="mt-0.5 text-sm text-ink/55">{testimonial.role}</p>}
                    </div>
                    <span className={testimonialPill(testimonial.published)}>
                      {testimonial.published
                        ? t("client_testimonial_published")
                        : t("client_testimonial_pending")}
                    </span>
                  </figcaption>
                </figure>
              </>
            ) : (
              <>
                <h2 className="font-serif text-2xl font-semibold">{t("client_testimonial_title")}</h2>
                <p className="mt-2 text-ink/60">{t("client_testimonial_sub")}</p>

                {testimonialState === "loading" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-brass" />
                  </div>
                ) : testimonialState === "error" ? (
                  <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {t("client_testimonial_error")}
                  </p>
                ) : (
                  <form onSubmit={submitTestimonial} className="mt-6 space-y-5">
                    <div>
                      <label className={labelCls} htmlFor="tm-role">
                        {t("client_testimonial_role")}
                      </label>
                      <input
                        id="tm-role"
                        type="text"
                        maxLength={80}
                        value={tmRole}
                        onChange={(e) => setTmRole(e.target.value)}
                        className={inputCls}
                        placeholder={t("client_testimonial_role_placeholder")}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="tm-quote-en">
                        {t("client_testimonial_quote_en")} <span aria-hidden="true" className="text-brass">*</span>
                      </label>
                      <textarea
                        id="tm-quote-en"
                        required
                        rows={4}
                        maxLength={1000}
                        value={tmContentEn}
                        onChange={(e) => {
                          setTmContentEn(e.target.value);
                          if (tmMinError) setTmMinError(false);
                        }}
                        className={inputCls}
                      />
                      <p
                        className={`mt-1.5 text-xs ${tmMinError ? "text-red-600" : "text-ink/45"}`}
                        role={tmMinError ? "alert" : undefined}
                      >
                        {t("client_testimonial_required_hint")}
                      </p>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="tm-quote-rw">
                        {t("client_testimonial_quote_rw")}
                      </label>
                      <textarea
                        id="tm-quote-rw"
                        rows={3}
                        maxLength={1000}
                        value={tmContentRw}
                        onChange={(e) => setTmContentRw(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    {tmError && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {tmError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={tmSaving}
                      className="inline-flex items-center gap-2 rounded-full bg-brass-deep px-7 py-3 text-sm font-bold text-cream transition hover:bg-brass-dark disabled:opacity-60"
                    >
                      {tmSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("client_testimonial_submit")}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
