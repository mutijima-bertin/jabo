"use client";

import { useState } from "react";
import type { Service } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { BookingForm } from "@/components/site/BookingForm";
import { BookingContextPanel } from "@/components/site/BookingContextPanel";
import { FaqSection } from "@/components/site/FaqSection";
import { BookingServiceCtx } from "@/components/site/BookingServiceContext";

// ---------------------------------------------------------------------------
// Shell — two-column grid (form left, context right) with FAQ below. Holds
// the selected service id and provides it to the form (writer) and the
// context panel (reader) via BookingServiceCtx.
// ---------------------------------------------------------------------------
interface Props {
  services: Service[];
  initialServiceId?: string;
}

export function BookPageShell({ services, initialServiceId }: Props) {
  const { t } = useI18n();
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId ?? "");

  return (
    <BookingServiceCtx.Provider value={{ selectedServiceId, setSelectedServiceId }}>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Form card — on mobile it stacks below the collapsible context panel */}
        <div className="max-lg:order-2 rounded-3xl border border-ink/10 bg-white/70 p-6 shadow-sm md:p-10">
          <BookingForm services={services} initialServiceId={initialServiceId} />
        </div>

        {/* Context panel — stacks above on mobile (details/collapsible), sticky on desktop */}
        <aside className="max-lg:order-1 lg:sticky lg:top-24 lg:self-start">
          {/* Mobile: collapsible */}
          <details className="lg:hidden">
            <summary className="cursor-pointer rounded-2xl border border-ink/10 bg-white/70 px-5 py-3 text-sm font-medium text-ink/70">
              {t("book_service")}
            </summary>
            <div className="mt-3">
              <BookingContextPanel services={services} />
            </div>
          </details>

          {/* Desktop: sticky panel */}
          <div className="hidden lg:block">
            <BookingContextPanel services={services} />
          </div>
        </aside>
      </div>

      {/* FAQ section below the form grid */}
      <div className="mx-auto mt-16 max-w-5xl">
        <FaqSection />
      </div>
    </BookingServiceCtx.Provider>
  );
}