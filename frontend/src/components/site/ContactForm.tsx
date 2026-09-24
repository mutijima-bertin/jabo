"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useI18n, type DictKey } from "@/lib/i18n";
import { fieldErrorText, inputCls, inputErrorCls, labelCls, textareaCls } from "@/lib/ui";
import { PhoneInput } from "@/components/site/PhoneInput";

/** Basic email shape — enough to catch typos client-side; the backend is the
 *  final authority and its issue fields map back through `fieldErrorKey`. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBJECT_MAX = 200;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 3000;

/** API issue field → localized inline-error key (spec backend validation). */
function fieldErrorKey(field: string): DictKey {
  switch (field) {
    case "name":
      return "contact_err_name";
    case "email":
      return "contact_err_email";
    case "phone":
      return "contact_err_phone";
    case "subject":
      return "contact_err_subject";
    case "message":
      return "contact_err_message";
    default:
      return "contact_error";
  }
}

/**
 * Public contact form — POSTs { name, email, phone?, subject, message,
 * language } to the backend `/contact` endpoint. Mirrors BookingForm's
 * behavior: inline field errors from client validation and from ApiError
 * issues, a generic banner only for non-field errors, and a success panel
 * that replaces the form once the message is sent.
 */
export function ContactForm() {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    language: locale,
  });
  // Inline field errors keyed by API field name (from ApiError.issues) —
  // rendered under the matching input; the generic banner is reserved for
  // non-issue errors only.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors((fe) => ({ ...fe, [k]: "" }));
  };

  /** Client-side validation with localized messages (whole form, once). */
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("contact_err_name");
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) {
      next.email = t("contact_err_email");
    }
    if (!form.subject.trim() || form.subject.length > SUBJECT_MAX) {
      next.subject = t("contact_err_subject");
    }
    if (!form.message.trim() || form.message.length < MESSAGE_MIN) {
      next.message = t("contact_err_message");
    } else if (form.message.length > MESSAGE_MAX) {
      next.message = t("contact_err_message_long");
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.post<{ ok: boolean }>("/contact", { ...form, language: locale });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.issues)) {
        const issues = err.issues as Array<{ field?: string; message?: string }>;
        const next: Record<string, string> = {};
        for (const issue of issues) {
          if (issue.field) next[issue.field] = t(fieldErrorKey(issue.field));
        }
        if (Object.keys(next).length > 0) setFieldErrors(next);
        else setError(t("contact_error"));
      } else {
        setError(err instanceof Error ? err.message : t("contact_error"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  /** Back to a blank form after a successful send. */
  function reset() {
    setForm({ name: "", email: "", phone: "", subject: "", message: "", language: locale });
    setFieldErrors({});
    setError("");
    setSent(false);
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-brass/40 bg-cream-alt p-8 text-center md:p-10">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brass" />
        <h2 className="mt-6 font-serif text-2xl font-semibold">{t("contact_success_title")}</h2>
        <p className="mt-3 text-ink/65">{t("contact_success_body")}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-block rounded-full bg-brass-deep px-7 py-3 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            {t("contact_send_another")}
          </button>
          <Link
            href="/"
            className="inline-block text-sm font-semibold text-ink/50 transition hover:text-brass"
          >
            {t("contact_back_home")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div>
        <label className={labelCls}>{t("contact_field_name")} *</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={fieldErrors.name ? inputErrorCls : inputCls}
          placeholder={t("contact_placeholder_name")}
          autoComplete="name"
          aria-invalid={!!fieldErrors.name || undefined}
        />
        {fieldErrors.name && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label className={labelCls}>{t("contact_field_email")} *</label>
        <input
          type="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className={fieldErrors.email ? inputErrorCls : inputCls}
          placeholder={t("contact_placeholder_email")}
          autoComplete="email"
          aria-invalid={!!fieldErrors.email || undefined}
        />
        {fieldErrors.email && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="contact-phone" className={labelCls}>
          {t("contact_field_phone")}
        </label>
        <PhoneInput
          id="contact-phone"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          error={!!fieldErrors.phone}
        />
        <p className="mt-1.5 text-xs text-ink/45">{t("contact_phone_hint")}</p>
        {fieldErrors.phone && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.phone}
          </p>
        )}
      </div>

      <div>
        <label className={labelCls}>{t("contact_field_subject")} *</label>
        <input
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          className={fieldErrors.subject ? inputErrorCls : inputCls}
          placeholder={t("contact_placeholder_subject")}
          autoComplete="off"
          maxLength={SUBJECT_MAX}
          aria-invalid={!!fieldErrors.subject || undefined}
        />
        {fieldErrors.subject && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.subject}
          </p>
        )}
      </div>

      <div>
        <label className={labelCls}>{t("contact_field_message")} *</label>
        <textarea
          rows={6}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          className={fieldErrors.message ? inputErrorCls : textareaCls}
          placeholder={t("contact_placeholder_message")}
          aria-invalid={!!fieldErrors.message || undefined}
        />
        {fieldErrors.message && (
          <p className={fieldErrorText} role="alert">
            {fieldErrors.message}
          </p>
        )}
      </div>

      {/* Generic banner — only for non-issue errors; field issues render
          inline above (mirrors BookingForm). */}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brass-deep px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? t("contact_sending") : t("contact_submit")}
        </button>
      </div>
    </form>
  );
}