"use client";
import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { embedUrl, mediaKind, safeMediaUrl } from '@/lib/project-media';
import { Media } from './Media';
function Film({ url, poster, title, captions }: { url: string; poster: string; title: string; captions?: string }) {
  const { locale } = useI18n(); const [started, setStarted] = useState(false); const [failed, setFailed] = useState(false); const embed = embedUrl(url);
  return <div className="project-film">{!started ? <div className="film-poster">
    <Media src={poster} alt={title} />
    <button className="solid" onClick={() => setStarted(true)}>{locale === 'en' ? 'Play film' : 'Reba filime'} ▷</button>
  </div> : failed ? <div className="signal-empty" role="status">
    <p>{locale === 'en' ? 'The film could not load. You can still explore the images or contact the studio.' : 'Filime ntiyabashije gufunguka. Ushobora kureba amafoto cyangwa ukavugana na sitidiyo.'}</p>
    <button className="text-link" onClick={() => { setFailed(false); setStarted(false); }}>{locale === 'en' ? 'Try again' : 'Ongera ugerageze'} ↗</button>
  </div> : embed ? <iframe src={embed} title={title} allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <video controls playsInline preload="metadata" poster={poster} aria-label={title} onError={() => setFailed(true)} autoPlay={false}>
    <source src={url} onError={() => setFailed(true)} />{captions && <track kind="captions" src={captions} srcLang={captions.includes(".rw.vtt") ? "rw" : "en"} label={locale === 'en' ? 'Captions' : 'Amagambo'} default />}</video>}<a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{locale === 'en' ? 'Open film directly' : 'Fungura filime ahandi'} ↗</a>
  </div>;
}
export function ProjectMedia({ urls, cover, title }: { urls: string[]; cover: string; title: string }) {
  const { locale } = useI18n(); const safe = [...new Set(urls)].filter(url => safeMediaUrl(url)); const captionFiles = safe.filter(u => mediaKind(u) === 'captions'); const captions = captionFiles.find(u => new URL(u, 'https://local.invalid').pathname.endsWith(`.${locale}.vtt`)) || captionFiles.find(u => new URL(u, 'https://local.invalid').pathname.endsWith('.en.vtt'));
  return <div className="project-gallery">
    <Media src={cover} alt={title} priority />{safe.filter(u => u !== cover && mediaKind(u) !== 'captions').map((url, i) => mediaKind(url) === 'video' ? <Film key={url} url={url} poster={cover} title={title} captions={captions} /> : mediaKind(url) === 'image' ? <Media key={url} src={url} alt={`${title} — ${i + 2}`} /> : <a className="text-link" key={url} href={url} target="_blank" rel="noopener noreferrer">{locale === 'en' ? 'Open project media' : 'Fungura amashusho y’igikorwa'} ↗</a>)}</div>;
}
