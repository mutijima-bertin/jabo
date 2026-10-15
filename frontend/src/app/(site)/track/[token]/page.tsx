"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Mail, Phone } from "lucide-react";
import { api, type Booking } from "@/lib/api";
import { STATUS_ORDER, statusKey, useI18n } from "@/lib/i18n";
import { localizedPath } from "@/lib/locale";
import { CONTACT } from "@/lib/site";
import { Logo } from "@/components/shared/Logo";
import { WhatsAppIcon } from "@/components/shared/social-icons";

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const { t, locale } = useI18n();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [state, setState] = useState<"loading" | "done" | "invalid">("loading");

  useEffect(() => {
    if (!token) return;
    api
      .get<Booking>(`/bookings/track/${token}`)
      .then((b) => {
        setBooking(b);
        setState("done");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  if (state === "loading") {
    return (
      <div className="flex justify-center py-40">
        <Loader2 className="h-8 w-8 animate-spin text-brass" />
      </div>
    );
  }

  if (state === "invalid" || !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <Logo className="mx-auto h-14 w-auto" />
        <h1 className="mt-10 font-serif text-3xl font-semibold leading-tight">{t("track_link_expired")}</h1>
        <p className="mt-4 text-ink/60">{t("track_request_new")}</p>
        {/* Contact row — actual links, no dead ends. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={CONTACT.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-green-deep"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t("social_whatsapp")}
          </a>
          <a
            href={CONTACT.emailHref}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-brass hover:text-brass"
          >
            <Mail className="h-4 w-4 text-brass" />
            {CONTACT.email}
          </a>
          <a
            href={CONTACT.phoneHref}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-brass hover:text-brass"
          >
            <Phone className="h-4 w-4 text-brass" />
            {CONTACT.phoneDisplay}
          </a>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(booking.status as (typeof STATUS_ORDER)[number]);
  const serviceName = locale === "rw" ? booking.service?.nameRw ?? "" : booking.service?.nameEn ?? "";
  const isCancelled = booking.status === "CANCELLED";
  const nextSteps: Record<string, [string, string]> = {
    PENDING: ["Your request is with the studio. Availability, scope and a quote need to be agreed before the booking is confirmed.", "Sitidiyo yakiriye icyifuzo cyawe. Mukeneye kumvikana ku gihe, ibizakorwa n’igiciro mbere yo kwemeza umurimo."],
    CONFIRMED: ["Your booking is confirmed. Contact the studio if the date, location or brief needs to change.", "Umurimo wawe wemejwe. Menyesha sitidiyo niba igihe, ahantu cyangwa ibizakorwa bihindutse."],
    IN_PRODUCTION: ["The studio is working on your production. Use the contact details below for questions or updates to your brief.", "Sitidiyo irimo gukora umurimo wawe. Koresha imiyoboro iri hasi niba ufite ikibazo cyangwa impinduka."],
    DELIVERED: ["Your production has been marked as delivered. Review the files shared by the studio and discuss any agreed revisions.", "Umusaruro wawe washyizweho ko watanzwe. Reba dosiye wohererejwe, muganire ku byo mwumvikanye gukosora."],
    COMPLETED: ["This production is complete. Contact the studio if you need help with your delivered files or want to plan another project.", "Uyu murimo warangiye. Vugana na sitidiyo niba ukeneye ubufasha kuri dosiye cyangwa ushaka gutegura undi murimo."],
    CANCELLED: ["This booking is cancelled. Contact the studio to discuss any questions or a new project request.", "Uyu murimo wahagaritswe. Vugana na sitidiyo niba ufite ikibazo cyangwa icyifuzo gishya."],
  };


  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <Logo className="h-12 w-auto" />
      <h1 className="mt-8 font-serif text-3xl font-semibold leading-tight md:text-4xl">{t("track_title")}</h1>

      {/* Summary card = cardSurface (lib/ui.ts). */}
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-2xl border border-ink/10 bg-white/70 p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">{t("track_ref")}</p>
          <p className="mt-1 text-lg font-bold text-brass">{booking.reference}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">{t("book_service")}</p>
          <p className="mt-1 font-medium">{serviceName || "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/50">{t("track_status")}</p>
          <p className="mt-1 font-semibold text-brass">{t(statusKey(booking.status))}</p>
        </div>
      </div>

      <section className="mt-8 border-l-4 border-brass bg-cream-alt p-6" aria-labelledby="tracking-next-step">
        <h2 id="tracking-next-step" className="text-lg font-semibold">{locale === "en" ? "What happens next" : "Igikurikiraho"}</h2>
        <p className="mt-3 text-sm leading-relaxed">{nextSteps[booking.status]?.[locale === "en" ? 0 : 1]}</p>
      </section>
      {isCancelled ? (
        <div className="mt-10 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
          {t("track_cancelled")}.
        </div>
      ) : (
        <ol className="mt-10 space-y-0">
          {STATUS_ORDER.slice(0, 5).map((s, i) => {
            const reached = i <= currentIndex;
            return (
              <li key={s} className="relative flex gap-4 pb-8 last:pb-0">
                {i < 4 && <span className={`absolute left-[9px] top-6 h-full w-px ${i < currentIndex ? "bg-brass" : "bg-ink/15"}`} />}
                {reached ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brass" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-ink/25" />
                )}
                <div>
                  <p className={`font-medium ${reached ? "text-ink" : "text-ink/45"}`}>{t(statusKey(s))}</p>
                  {s === booking.status && (
                    <div className="mt-2 space-y-1">
                      {booking.events
                        ?.filter((e) => e.status === s)
                        .map((e) => (
                          <p key={e.id} className="text-xs text-ink/50">
                            {/* Kinyarwanda falls back to French in the CLDR
                                (fr-RW) — matches the day/month order and
                                thousands separators RWF budgets expect. */}
                            {new Date(e.createdAt).toLocaleString(locale === "rw" ? "fr-RW" : "en-GB")}
                            {e.note ? ` — ${e.note}` : ""}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Contact strip — lives inside the section container so every status
          screen keeps a working next action. */}
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white/70 p-5">
        <p className="text-sm font-semibold text-ink/80">{t("track_questions")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={CONTACT.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-green-deep"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t("social_whatsapp")}
          </a>
          <a
            href={CONTACT.emailHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink/70 transition hover:text-brass"
          >
            <Mail className="h-4 w-4 text-brass" />
            {CONTACT.email}
          </a>
          <a
            href={CONTACT.phoneHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink/70 transition hover:text-brass"
          >
            <Phone className="h-4 w-4 text-brass" />
            {CONTACT.phoneDisplay}
          </a>
        </div>
        <Link
          href={localizedPath(locale, "/book")}
          className="mt-4 inline-block text-sm font-semibold text-ink/50 transition hover:text-brass"
        >
          {t("track_book_another")}
        </Link>
      </div>
    </div>
  );
}
