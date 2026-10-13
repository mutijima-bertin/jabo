"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { localizedPath } from '@/lib/locale';
import type { PortfolioItem } from '@/lib/api';
import { Media } from './Media';
export function WorkGrid({ items, home = false }: { items: PortfolioItem[]; home?: boolean }) {
  const { locale } = useI18n(); const [category, setCategory] = useState(''); const visible = items.filter(x => x.published && (!category || x.category === category)).slice(0, home ? 3 : items.length); const categories = [...new Set(items.filter(x => x.published).map(x => x.category))].filter(Boolean);
  return <>{!home && categories.length > 0 && <div className="work-filters" role="group" aria-label={locale === 'en' ? 'Filter work' : 'Hitamo icyiciro'}>
    <button aria-pressed={!category} onClick={() => setCategory('')}>{locale === 'en' ? 'All work' : 'Ibikorwa byose'}</button>{categories.map(c =>
      <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div>}
    {visible.length ? <div className="work-grid">{visible.map((item, i) => {      
const title = locale === 'rw' ? (item.titleRw || item.titleEn) : item.titleEn; return <article key={item.id} className={`work-card ${home && i === 0 ? 'feature' : ''} ${home && i === 2 ? 'portrait-card' : ''}`}>
        <Link href={localizedPath(locale, `/portfolio/${encodeURIComponent(item.id)}`)}>
          <Media src={item.coverUrl} alt={title} />
          <div className="work-caption">
            <h3>{title}</h3>
            <span>{item.category} ↗</span>
          </div>
        </Link>
      </article>    
})}</div> : <div className="signal-empty">
      <p>{locale === 'en' ? 'New work is being prepared for the portfolio. Tell us about the story you want to make.' : 'Turimo gutegura ibikorwa bishya. Tubwire inkuru ushaka kugeza ku bandi.'}</p>
      <Link className="text-link" href={localizedPath(locale, '/book')}>{locale === 'en' ? 'Start a conversation' : 'Tuganire'} ↗</Link>
    </div>}</>;
}
