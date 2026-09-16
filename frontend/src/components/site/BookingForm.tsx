"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError, type Service } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import { fieldErrorText, inputCls, inputErrorCls, labelCls } from "@/lib/ui";
import { PhoneInput } from "@/components/site/PhoneInput";
import { useSelectedServiceId } from "@/components/site/BookingServiceContext";

interface Props {
  services: Service[];
  initialServiceId?: string;
}

/**
 * Budget bands — chips send a STABLE short English label to the API
 * (admin panel shows a clean value regardless of locale), while the visible
 * chip label is localized via book_budget_band_0..4.
 */
const BUDGET_BANDS: Array<{ key: DictKey; value: string }> = [
  { key: "book_budget_band_0", value: "Under 300k RWF" },
  { key: "book_budget_band_1", value: "300k–600k RWF" },
  { key: "book_budget_band_2", value: "600k–1.5m RWF" },
  { key: "book_budget_band_3", value: "1.5m+ RWF" },
  { key: "book_budget_band_4", value: "Not sure" },
];

/** API issue field → localized inline-error key (spec backend validation). */
function fieldErrorKey(field: string): DictKey {
  switch (field) {
    case "serviceId":
      return "book_err_service";
    case "contactName":
      return "book_err_name";
    case "contactEmail":
      return "book_err_email";
    case "contactPhone":
      return "book_err_phone";
    case "eventDate":
      return "book_err_date";
    case "location":
      return "book_err_location";
    case "budgetRange":
      return "book_err_budget";
    case "details":
      return "book_err_details";
    default:
      return "book_error";
  }
}

export function BookingForm({ services, initialServiceId }: Props) {
  const { t, locale } = useI18n();
  const { setSelectedServiceId } = useSelectedServiceId();
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
  // Inline field errors keyed by API field name (from ApiError.issues) —
  // rendered under the matching input; the generic banner is reserved for
  // non-issue errors only.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ reference: string; trackUrl: string } | null>(null);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: "" }));
    // Keep context panel in sync when the service changes
    if (k === "serviceId") setSelectedServiceId(v);
  };

  // Pre-fill service from URL search param (?service=...)
  useEffect(() => {
    if (initialServiceId && services.some((s) => s.id === initialServiceId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialServiceId is a URL deep-link (SSR-scoped); apply it once to sync the form select after mount
      set("serviceId", initialServiceId);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await api.post<{ booking: { reference: string }; trackUrl: string }>("/bookings", {
        ...form,
        language: locale,
      });
      setResult({ reference: res.booking.reference, trackUrl: res.trackUrl });
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.issues)) {
        const issues = err.issues as Array<{ field?: string; message?: string }>;
        const next: Record<string, string> = {};
        for (const issue of issues) {
          if (issue.field) next[issue.field] = t(fieldErrorKey(issue.field));
        }
        if (Object.keys(next).length > 0) setFieldErrors(next);
        else setError(err.message || t("book_error"));
      } else {
        setError(err instanceof Error ? err.message : t("book_error"));
      }
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
          {t("book_track_link")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("book_service")} *</label>
        <select
          required
          value={form.serviceId}
          onChange={(e) => set("serviceId", e.target.value)}
          className={fieldErrors.serviceId ? inputErrorCls : inputCls}
        >
          <option value="">—</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {locale === "rw" ? s.nameRw : s.nameEn}
            </option>
          ))}
        </select>
        {fieldErrors.serviceId && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.serviceId}
          </p>
        )}
      </div>

      <div>
        <label className={labelCls}>{t("book_name")} *</label>
        <input
          required
          value={form.contactName}
          onChange={(e) => set("contactName", e.target.value)}
          className={fieldErrors.contactName ? inputErrorCls : inputCls}
          placeholder="Jean Uwimana"
        />
        {fieldErrors.contactName && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.contactName}
          </p>
        )}
      </div>
      <div>
        <label className={labelCls}>{t("book_email")} *</label>
        <input
          required
          type="email"
          value={form.contactEmail}
          onChange={(e) => set("contactEmail", e.target.value)}
          className={fieldErrors.contactEmail ? inputErrorCls : inputCls}
          placeholder="you@example.com"
        />
        {fieldErrors.contactEmail && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.contactEmail}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="booking-phone" className={labelCls}>
          {t("book_phone")}
        </label>
        <PhoneInput
          id="booking-phone"
          value={form.contactPhone}
          onChange={(v) => set("contactPhone", v)}
          error={!!fieldErrors.contactPhone}
        />
        <p className="mt-1.5 text-xs text-ink/45">{t("book_phone_hint")}</p>
        {fieldErrors.contactPhone && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.contactPhone}
          </p>
        )}
      </div>
      <div>
        <label className={labelCls}>{t("book_date")}</label>
        <input
          type="date"
          value={form.eventDate}
          onChange={(e) => set("eventDate", e.target.value)}
          className={fieldErrors.eventDate ? inputErrorCls : inputCls}
        />
        {fieldErrors.eventDate && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.eventDate}
          </p>
        )}
      </div>
      <div>
        <label className={labelCls}>{t("book_location")}</label>
        <input
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          className={fieldErrors.location ? inputErrorCls : inputCls}
          placeholder="Kigali"
        />
        {fieldErrors.location && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.location}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("book_budget")}</label>
        {/* Preset bands as toggle chips — mirror the admin filter-chip
            selected state in the cream theme (PortfolioGrid pattern).
            Full-width row that wraps gracefully; labels cannot break
            mid-value (whitespace-nowrap). */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("book_budget")}>
          {BUDGET_BANDS.map((band) => {
            const active = form.budgetRange === band.value;
            return (
              <button
                key={band.key}
                type="button"
                aria-pressed={active}
                onClick={() => set("budgetRange", active ? "" : band.value)}
                className={
                  active
                    ? "shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-brass-dark bg-brass-deep"
                    : "shrink-0 whitespace-nowrap rounded-full border border-ink/15 px-4 py-2.5 text-sm text-ink/65 transition hover:border-brass/50 hover:text-brass"
                }
              >
                {t(band.key)}
              </button>
            );
          })}
        </div>
        {fieldErrors.budgetRange && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.budgetRange}
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className={labelCls}>{t("book_details")}</label>
        <textarea
          rows={4}
          value={form.details}
          onChange={(e) => set("details", e.target.value)}
          className={fieldErrors.details ? inputErrorCls : inputCls}
          placeholder={locale === "rw" ? "Ubwoko bw'ibirori, umubare w'abantu..." : "Type of event, number of guests..."}
        />
        {fieldErrors.details && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.details}
          </p>
        )}
      </div>

      {/* Generic banner — only for non-issues errors; field issues render
          inline above. */}
      {error && <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">{error}</p>}

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