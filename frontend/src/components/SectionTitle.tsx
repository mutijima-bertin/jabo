"use client";

import { useI18n } from "@/lib/i18n";

export function SectionTitle({
  k,
}: {
  k:
    | "services_title"
    | "services_sub"
    | "portfolio_title"
    | "portfolio_sub"
    | "about_title"
    | "clients_title"
    | "testimonials_title"
    | "testimonials_sub";
}) {
  const { t } = useI18n();
  if (k === "services_sub" || k === "portfolio_sub" || k === "testimonials_sub") return <p className="mt-3 text-ink/60">{t(k)}</p>;
  return <h2 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">{t(k)}</h2>;
}