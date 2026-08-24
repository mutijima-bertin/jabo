"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { api, type Booking } from "@/lib/api";
import { STATUS_ORDER, statusKey, useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

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
        <p className="mt-8 text-sm text-ink/45">
          hello@creativesoundstudio.rw · +250 700 000 000
        </p>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER.indexOf(booking.status as (typeof STATUS_ORDER)[number]);
  const serviceName = locale === "rw" ? booking.service?.nameRw ?? "" : booking.service?.nameEn ?? "";
  const isCancelled = booking.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Logo className="h-12 w-auto" />
      <h1 className="mt-8 font-serif text-3xl font-semibold leading-tight md:text-4xl">{t("track_title")}</h1>

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
                            {new Date(e.createdAt).toLocaleString(locale === "rw" ? "en-GB" : "en-GB")}
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

      <p className="mt-12 text-center text-xs text-ink/50">
        {t("track_request_new")}
      </p>
    </div>
  );
}