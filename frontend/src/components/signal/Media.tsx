"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
// CMS uploads can use arbitrary approved hosts. Native responsive images keep their original URLs.
export function Media({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null); const failed = failedSrc === src; const { locale } = useI18n();
  return <div className={`media ${className} ${failed ? 'media-error' : ''}`}>
    {failed ? <p role="status">{locale === 'en' ? 'This image is unavailable.' : 'Iyi foto ntibashije kuboneka.'}</p> :
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={1440} height={960} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} onError={() => setFailedSrc(src)} />}
  </div>;
}
