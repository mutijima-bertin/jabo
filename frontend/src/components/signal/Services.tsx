"use client";
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { localizedPath } from '@/lib/locale';
import type { Service } from '@/lib/api';
export function Services({ services }: { services: Service[] }) {  
const { locale } = useI18n(); return <div className="service-list">{services.length ? services.filter(s => s.published).map((s, i) =>
    <details key={s.id} open={i === 0}>
      <summary>
        <span className="service-number">{String(i + 1).padStart(2, '0')}</span>
        <h3>{locale === 'rw' ? s.nameRw : s.nameEn}</h3>
        <span className="service-type">{s.category}</span>
        <span className="expand" aria-hidden="true">+</span>
      </summary>
      <div className="service-body">
        <p>{locale === 'rw' ? (s.descriptionRw || s.descriptionEn) : s.descriptionEn}</p>
        <p className="service-tags">{locale === 'rw' ? s.priceRw : s.priceEn}</p>
        <Link className="text-link" href={localizedPath(locale, `/book?service=${encodeURIComponent(s.id)}`)}>{locale === 'en' ? 'Discuss this service' : 'Tuganire kuri iyi serivisi'} ↗</Link>{s.linkedPostSlug && <Link className="text-link service-guide" href={localizedPath(locale, `/blog/${encodeURIComponent(s.linkedPostSlug)}`)}>{locale === 'en' ? 'Read the story' : 'Soma inkuru'} ↗</Link>}</div>
    </details>) : <p className="signal-empty">{locale === 'en' ? 'Contact us to discuss the production you have in mind.' : 'Twandikire tuganire ku gikorwa wifuza.'}</p>}</div>
}
