import { fetchServices } from "./content";
import type { Service } from "./api";

// ---------------------------------------------------------------------------
// Portfolio category ↔ service matching (content journey, Phase 5).
//
// A portfolio lightbox can only pre-select a service when the item's category
// maps CONFIDENTLY to exactly one service name. The rule is deliberately
// conservative: normalize both strings (lowercase, strip non-alphanumerics),
// require a FULL TERM match inside the service name (or the reverse), with
// singular/plural tolerance — and when zero OR multiple services match, the
// caller falls back to the generic /book link. Never guess a service.
// ---------------------------------------------------------------------------

/** Lowercase + strip non-alphanumerics (contract: "normalize both strings"). */
export function normalizeMatchTerm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Split a name into lowercase word tokens (full-term matching needs the
 *  word boundaries that normalization erases). */
function termTokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Naive English singular: "Weddings"→"wedding", "Documentaries"→"documentary". */
function singularize(word: string): string {
  if (word.length > 3 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** True when the pair is the same term up to singular/plural. */
function termsEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const sa = singularize(a);
  const sb = singularize(b);
  return sa === b || a === sb || sa === sb;
}

/**
 * Pure per-pair matcher: does this service's name (EN or RW) confidently
 * contain the category as a full term — or vice versa?
 */
export function categoryMatchesService(category: string, service: Service): boolean {
  const catNorm = normalizeMatchTerm(category);
  if (!catNorm) return false;
  const names = [service.nameEn, service.nameRw].filter((n): n is string => Boolean(n));
  for (const name of names) {
    const nameNorm = normalizeMatchTerm(name);
    if (nameNorm === catNorm) return true; // exact full-name equality
    // Full-term containment: a service-name token equals the category term…
    if (termTokens(name).some((token) => termsEqual(token, catNorm))) return true;
    // …or a category token equals the full service-name term (reverse direction).
    if (termTokens(category).some((token) => termsEqual(token, nameNorm))) return true;
  }
  return false;
}

/**
 * The service a portfolio category can be confidently attributed to — or
 * null when the category is ambiguous (2+ services) or unmatched. Callers
 * use null → generic /book.
 */
export function confidentServiceForCategory(category: string, services: Service[]): Service | null {
  const matches = services.filter((s) => categoryMatchesService(category, s));
  return matches.length === 1 ? matches[0] : null;
}

// ---------------------------------------------------------------------------
// Module-level cached fetch — services are unchanging during a visit, so the
// post CTA band and the lightbox can share ONE promise across locale toggles
// and remounts instead of refetching on every re-render.
// ---------------------------------------------------------------------------
let servicesPromise: Promise<Service[]> | null = null;

export function cachedServices(): Promise<Service[]> {
  servicesPromise ??= fetchServices();
  return servicesPromise;
}