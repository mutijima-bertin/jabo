"use client";

import { useI18n, type DictKey } from "@/lib/i18n";

interface PageHeadingProps {
  /** i18n dictionary key for the <h1>. */
  title: DictKey;
  /** Optional dictionary key for the lead paragraph under the title. */
  sub?: DictKey;
  titleCls?: string;
  subCls?: string;
}

const defaultTitleCls = "font-serif text-3xl font-semibold leading-tight md:text-5xl";
const defaultSubCls = "mt-4 text-ink/60";

/**
 * Locale-aware page header shared by the static top-level pages (services,
 * portfolio, track, book, about). Server pages render the title through this
 * client component so the h1 follows the active locale from useI18n().
 */
export function PageHeading({ title, sub, titleCls = defaultTitleCls, subCls = defaultSubCls }: PageHeadingProps) {
  const { t } = useI18n();
  return (
    <>
      <h1 className={titleCls}>{t(title)}</h1>
      {sub && <p className={subCls}>{t(sub)}</p>}
    </>
  );
}