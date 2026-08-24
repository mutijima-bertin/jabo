"use client";

import Link from "next/link";
import { Camera, Video, Radio, Megaphone, Clapperboard, Scissors, Image as ImageIcon, type LucideIcon } from "lucide-react";
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

export function ServiceCard({ service }: { service: Service }) {
  const { locale, t } = useI18n();
  const Icon = icons[service.icon ?? "camera"] ?? Camera;
  const name = locale === "rw" ? service.nameRw : service.nameEn;
  const desc = locale === "rw" ? service.descriptionRw : service.descriptionEn;

  return (
    <Link
      href="/book"
      className="group flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brass/50 hover:bg-white hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brass/15 text-brass transition group-hover:bg-brass group-hover:text-cream">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-serif text-lg font-semibold leading-snug">{name}</h3>
      {desc && <p className="text-sm leading-relaxed text-ink/60">{desc}</p>}
      <div className="mt-auto flex items-center justify-end pt-2">
        <span className="text-xs font-medium text-ink/45 transition group-hover:text-brass">
          {t("book_now")} →
        </span>
      </div>
    </Link>
  );
}