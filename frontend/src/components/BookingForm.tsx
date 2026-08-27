"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, type Service } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

interface Props {
  services: Service[];
}

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-brass";

export function BookingForm({ services }: Props) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    serviceId: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventDate: "",
    location: "",
    budgetRange: "",
    details: "",
    language: locale,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reference: string; trackUrl: string } | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post<{ booking: { reference: string }; trackUrl: string }>("/bookings", {
        ...form,
        language: locale,
      });
      setResult({ reference: res.booking.reference, trackUrl: res.trackUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("book_error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-brass/40 bg-cream-alt p-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brass" />
        <h2 className="mt-6 font-serif text-2xl font-semibold">{t("book_success_title")}</h2>
        <p className="mt-3 text-ink/65">{t("book_success_body")}</p>
        <p className="mt-6 text-sm text-ink/55">
          {t("book_reference")}: <span className="font-bold text-brass">{result.reference}</span>
        </p>
        <a
          href={result.trackUrl}
          className="mt-8 inline-block rounded-full bg-brass-deep px-7 py-3 text-sm font-bold text-cream transition hover:bg-brass-dark"
        >
          {locale === "rw" ? "Kurikirana umurimo" : "Track your production"}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_service")} *</label>
        <select required value={form.serviceId} onChange={(e) => set("serviceId", e.target.value)} className={inputCls}>
          <option value="">—</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "rw" ? s.nameRw : s.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_name")} *</label>
        <input
          required
          value={form.contactName}
          onChange={(e) => set("contactName", e.target.value)}
          className={inputCls}
          placeholder="Jean Uwimana"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_email")} *</label>
        <input
          required
          type="email"
          value={form.contactEmail}
          onChange={(e) => set("contactEmail", e.target.value)}
          className={inputCls}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_phone")}</label>
        <input
          value={form.contactPhone}
          onChange={(e) => set("contactPhone", e.target.value)}
          className={inputCls}
          placeholder={t("book_phone_hint")}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_date")}</label>
        <input type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_location")}</label>
        <input value={form.location} onChange={(e) => set("location", e.target.value)} className={inputCls} placeholder="Kigali" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_budget")}</label>
        <input
          value={form.budgetRange}
          onChange={(e) => set("budgetRange", e.target.value)}
          className={inputCls}
          placeholder="300,000 – 500,000 RWF"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-medium text-ink/70">{t("book_details")}</label>
        <textarea
          rows={4}
          value={form.details}
          onChange={(e) => set("details", e.target.value)}
          className={inputCls}
          placeholder={locale === "rw" ? "Ubwoko bw'ibirori, umubare w'abantu..." : "Type of event, number of guests..."}
        />
      </div>

      {error && <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brass-deep px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? t("book_processing") : t("book_submit")}
        </button>
      </div>
    </form>
  );
}
