"use client";

import { createElement } from "react";
import { useI18n } from "@/lib/i18n";
import { serviceIcon } from "@/components/shared/service-icons";
import { WhatsAppIcon } from "@/components/shared/social-icons";
import { CONTACT } from "@/lib/site";
import { useSelectedServiceId } from "@/components/site/BookingServiceContext";
import type { Service } from "@/lib/api";

// ---------------------------------------------------------------------------
// Booking context panel — shows selected service details + trust signals +
// "how it works" mini-flow. Lives in the right column of the /book grid.
// ---------------------------------------------------------------------------

interface Props {
  services: Service[];
}

export function BookingContextPanel({ services }: Props) {
  const { t, locale } = useI18n();
  const { selectedServiceId } = useSelectedServiceId();

  const service = services.find((s) => s.id === selectedServiceId) ?? null;

  return (
    <div className="rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm">
      {/* Service details or placeholder */}
      {service ? (
        <ServiceDetails service={service} locale={locale} />
      ) : (
        <p className="text-sm text-ink/45">{t("book_context_choose")}</p>
      )}

      {/* Divider */}
      <hr className="my-5 border-ink/10" />

      {/* Trust signals */}
      <div className="space-y-4">
        {/* SLA */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-brass">
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink/70">{t("book_reply_sla")}</p>
        </div>

        {/* WhatsApp */}
        <a
          href={CONTACT.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-ink/10 px-4 py-3 transition hover:border-brass/40 hover:bg-brass/5"
        >
          <WhatsAppIcon className="h-5 w-5 shrink-0 text-green-600" />
          <span className="text-sm font-medium text-ink/70">{t("book_whatsapp_cta")}</span>
        </a>

        {/* Email */}
        <a
          href={`mailto:${CONTACT.email}`}
          className="flex items-center gap-3 rounded-xl border border-ink/10 px-4 py-3 transition hover:border-brass/40 hover:bg-brass/5"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5 shrink-0 text-ink/40">
            <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
            <path d="M19 8.839l-7.5 3.75a2.75 2.75 0 01-3 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
          </svg>
          <span className="text-sm text-ink/60">{CONTACT.email}</span>
        </a>
      </div>

      {/* Divider */}
      <hr className="my-5 border-ink/10" />

      {/* How it works */}
      <h3 className="mb-4 text-sm font-semibold text-ink/70">{t("book_how_title")}</h3>
      <ol className="space-y-3">
        {(["book_how_step_1", "book_how_step_2", "book_how_step_3"] as const).map((key, i) => (
          <li key={key} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/15 text-[11px] font-bold text-brass-dark">
              {i + 1}
            </span>
            <p className="text-sm text-ink/60">{t(key)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner: renders the selected service icon, name, price, description.
// ---------------------------------------------------------------------------
function ServiceDetails({ service, locale }: { service: Service; locale: string }) {
  const name = locale === "rw" ? service.nameRw : service.nameEn;
  const desc = locale === "rw" ? service.descriptionRw : service.descriptionEn;
  const price = locale === "rw" ? service.priceRw : service.priceEn;

  return (
    <div className="space-y-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/15 text-brass">
        {createElement(serviceIcon(service.icon), { className: "h-6 w-6" })}
      </div>
      <div>
        <h3 className="font-serif text-lg font-semibold leading-snug">{name}</h3>
        {price && <p className="mt-1 text-sm font-semibold text-brass-deep">{price}</p>}
      </div>
      {desc && <p className="text-sm leading-relaxed text-ink/55">{desc}</p>}
    </div>
  );
}
