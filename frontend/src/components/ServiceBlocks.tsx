"use client";

import Link from "next/link";
import {
  Camera,
  Video,
  Radio,
  Megaphone,
  Clapperboard,
  Scissors,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/lib/api";

const icons: Record<string, LucideIcon> = {
  camera: Camera,
  video: Video,
  livestream: Radio,
  broadcast: Radio,
  drone: Clapperboard,
  photo: ImageIcon,
  edit: Scissors,
  ad: Megaphone,
};

/**
 * Itara-style numbered service blocks (01., 02., …) — cream cards with brass
 * Fraunces numerals. Purely API-driven: services come from the backend.
 */
export function ServiceBlocks({ services }: { services: Service[] }) {
  const { locale, t } = useI18n();

  return (
    <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
      {services.map((svc, i) => {
        const Icon = icons[svc.icon ?? "camera"] ?? Camera;
        const name = locale === "rw" ? svc.nameRw : svc.nameEn;
        const desc = locale === "rw" ? svc.descriptionRw : svc.descriptionEn;
        const num = String(i + 1).padStart(2, "0");

        return (
          <li key={svc.id}>
            <Link
              href="/book"
              className="group relative block h-full rounded-2xl border border-ink/10 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brass/50 hover:bg-white hover:shadow-md"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-4 font-serif text-5xl font-semibold leading-none text-ink/10 transition group-hover:text-brass/25"
              >
                {num}
              </span>
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/15 text-brass transition group-hover:bg-brass group-hover:text-cream">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold leading-snug">{name}</h3>
                {desc && <p className="mt-2 text-sm leading-relaxed text-ink/60">{desc}</p>}
                <span className="mt-5 inline-flex items-center text-xs font-semibold text-brass">
                  {t("book_now")} →
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}