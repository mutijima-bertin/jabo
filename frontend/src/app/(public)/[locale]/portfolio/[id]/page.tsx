import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { api, type PortfolioItem } from '@/lib/api';
import { fetchServices } from '@/lib/content';
import { isLocale, localizedPath, OG_LOCALES } from '@/lib/locale';
import { absoluteUrl, localeAlternates, OG_IMAGE } from '@/lib/seo';
import { confidentServiceForCategory } from '@/lib/services';
import { ProjectMedia } from '@/components/signal/ProjectMedia';
// Failed catalog reads propagate to the retry boundary rather than becoming a false 404.
const readProject = cache(async (id: string) => { const items = await api.get<PortfolioItem[]>('/public/portfolio'); return items.find(item => item.id === id && item.published); });
type Props = { params: Promise<{ locale: string; id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale: raw, id } = await params; const locale = isLocale(raw) ? raw : 'en'; const project = await readProject(id); if (!project) return { title: locale === 'en' ? 'Project not found' : 'Igikorwa ntikibonetse', robots: { index: false } }; const title = locale === 'rw' ? (project.titleRw || project.titleEn) : project.titleEn; const path = `/portfolio/${encodeURIComponent(id)}`; const description = `${title} — ${project.category}. Creative Sound Studio, Kigali, Rwanda.`; return { title, description, alternates: { canonical: absoluteUrl(path, locale), languages: localeAlternates(path) }, openGraph: { title, description, url: absoluteUrl(path, locale), locale: OG_LOCALES[locale], type: 'article', images: [OG_IMAGE] } }; }
export default async function ProjectPage({ params }: Props) {  
const { locale: raw, id } = await params; if (!isLocale(raw)) notFound(); const locale = raw; const [project, services] = await Promise.all([readProject(id), fetchServices()]); if (!project) notFound(); const title = locale === 'rw' ? (project.titleRw || project.titleEn) : project.titleEn; const service = confidentServiceForCategory(project.category, services); return <article className="wrap signal-page project-page">
    <Link className="text-link" href={localizedPath(locale, '/portfolio')}>← {locale === 'en' ? 'All work' : 'Ibikorwa byose'}</Link>
    <header className="project-heading">
      <p className="eyebrow">{project.category}</p>
      <h1>{title}</h1>{project.clientName && <p>{locale === 'en' ? 'Client' : 'Umukiriya'} / {project.clientName}</p>}{project.tags.length > 0 && <ul className="project-tags" aria-label={locale === 'en' ? 'Project tags' : 'Ibiranga igikorwa'}>{project.tags.map(tag =>
        <li key={tag}>{tag}</li>)}</ul>}</header>
    <ProjectMedia cover={project.coverUrl} urls={project.mediaUrls} title={title} />
    <section className="project-next">
      <h2>{locale === 'en' ? 'A story of your own?' : 'Ufite inkuru yawe?'}</h2>
      <Link className="solid" href={localizedPath(locale, service ? `/book?service=${encodeURIComponent(service.id)}` : '/book')}>{locale === 'en' ? 'Discuss your project' : 'Tuganire ku gikorwa cyawe'} ↗</Link>
    </section>
  </article>;
}
