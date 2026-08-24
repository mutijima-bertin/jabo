import { prisma } from "../config/db";

/** Data-access for bilingual site settings (hero copy, contact info). */
export function listAll() {
  return prisma.siteSetting.findMany();
}

/** Upsert a batch of settings in one transaction (admin PUT). */
export function upsertBatch(
  entries: Array<{
    key: string;
    locale: "en" | "rw";
    value: string;
  }>
) {
  return prisma.$transaction(
    entries.map((s) =>
      prisma.siteSetting.upsert({
        where: { key_locale: { key: s.key, locale: s.locale } },
        update: { value: s.value },
        create: s,
      })
    )
  );
}

export type SiteSettingUpsertInput = {
  key: string;
  locale: "en" | "rw";
  value: string;
};
