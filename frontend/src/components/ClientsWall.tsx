"use client";

import type { ClientLogo } from "@/lib/api";
import { SectionTitle } from "@/components/SectionTitle";

/**
 * Client-logo wall (blueprint §4.5): server-fed from GET /public/logos via
 * page.tsx (same pattern as testimonials). Logos render monochrome at 60%
 * opacity and come alive on hover; names without an image fall back to
 * quiet serif wordmarks — not pills. Renders nothing when the wall is empty.
 */
export function ClientsWall({ logos }: { logos: ClientLogo[] }) {
  if (logos.length === 0) return null;

  return (
    <section className="border-y border-ink/10 bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
        <SectionTitle k="clients_title" />
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {logos.map((logo) => (
            <li key={logo.id} className="flex h-12 items-center justify-center">
              {logo.imageUrl ? (
                // Raw <img> is intentional here: client logos have arbitrary
                // intrinsic dimensions and must scale h-auto by width —
                // next/image cannot express `h-9 w-auto` without distortion.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.imageUrl}
                  alt={logo.name}
                  loading="lazy"
                  className="h-9 w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
              ) : (
                // Styled wordmark fallback — no border, no pill
                <span className="cursor-default font-serif text-lg tracking-wide text-ink/45 transition hover:text-brass">
                  {logo.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
