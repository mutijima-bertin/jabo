import Image from "next/image";
import { AudioWaveform } from "lucide-react";

interface PostCoverProps {
  coverImageUrl: string | null;
  /** Locale-aware alt text. */
  alt: string;
  /** Aspect/sizing classes for the wrapping box (e.g. "aspect-video rounded-2xl"). */
  className?: string;
  /** next/image sizes hint for srcset generation. */
  sizes: string;
  /** Eager-load for above-the-fold hero covers. */
  priority?: boolean;
}

/**
 * Blog post cover. Real /uploads/... paths render through next/image on the
 * same origin (the /uploads rewrite proxies to the backend); posts without a
 * cover get an elegant brass-on-cream gradient with a soundwave motif.
 */
export function PostCover({ coverImageUrl, alt, className = "", sizes, priority = false }: PostCoverProps) {
  if (coverImageUrl) {
    return (
      <div className={`relative overflow-hidden bg-sand ${className}`}>
        <Image src={coverImageUrl} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brass/20 via-cream-alt to-sand ${className}`}
      role="img"
      aria-label={alt}
    >
      <AudioWaveform className="h-1/4 w-1/4 text-brass/60" strokeWidth={1.25} aria-hidden />
    </div>
  );
}