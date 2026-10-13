"use client";
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { localizedPath } from '@/lib/locale';
export default function ErrorPage({ reset }: { reset: () => void }) {  
const { locale } = useI18n(); return <section className="wrap signal-page">
    <h1>{locale === 'en' ? 'This page could not load.' : 'Uru rupapuro ntirwabashije gufunguka.'}</h1>
    <p>{locale === 'en' ? 'Please try again, or contact the studio directly.' : 'Ongera ugerageze cyangwa uvugane na sitidiyo.'}</p>
    <button className="solid" onClick={reset}>{locale === 'en' ? 'Try again' : 'Ongera ugerageze'}</button> <Link className="text-link" href={localizedPath(locale, '/contact')}>{locale === 'en' ? 'Contact' : 'Twandikire'} ↗</Link>
  </section>
}
