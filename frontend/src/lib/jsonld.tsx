import { BRAND } from "@/lib/constants";
import { absoluteUrl, SITE_DESCRIPTION } from "@/lib/seo";
import { CONTACT } from "@/lib/site";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import type { PortfolioItem, PostFull, PostSummary, Service } from "@/lib/api";

/**
 * JSON-LD structured data (SEO phase 5) — every value grounded in real site
 * data: CONTACT (lib/site.ts), the exact social hrefs rendered by the
 * Footer/contact page, and the /public/* API rows. Nothing invented — no prices
 * beyond what the services API already displays, no AggregateRating, no Review.
 *
 * LOCALE-AWARE URLs. Every PAGE url here is emitted in the locale of the page
 * being rendered (the `[locale]` segment), so `/rw/services` describes
 * `https://…/rw/services` rather than pointing a Kinyarwanda page at the
 * English URL — which would tell Google the two are the same document.
 *
 * IMAGE urls are deliberately NOT locale-prefixed. `/uploads/...` files are
 * served by the backend from one origin via the `/uploads/:path*` rewrite
 * (next.config.ts); there is no `/en/uploads/...`, so prefixing an image would
 * produce a 404 in every social preview. Those two calls stay single-argument.
 *
 * `inLanguage` uses the SHORT BCP-47 form (`en`/`rw`) — the opposite of
 * `openGraph:locale`, which is Open Graph's `language_TERRITORY` form.
 *
 * Emission pattern (Next 16.3.4 docs, `node_modules/next/dist/docs/01-app/
 * 02-guides/json-ld.md`): a native `<script type="application/ld+json">`
 * rendered inline in the server component. `next/script` is out — it optimizes
 * executable JS, and structured data is inert. React does not escape
 * `dangerouslySetInnerHTML`, so the payload is serialized with every `<`
 * turned into its `\u003c` escape (the docs' suggested hardening): a
 * "…</script>…" sequence inside user content (post markdown) can never
 * terminate the script element, and `JSON.parse` still decodes it losslessly.
 */

/** Studio social profiles — the exact hrefs the site renders (Footer.tsx /
 *  ContactPageContent.tsx render the same four links). */
const SOCIAL_URLS = [
  CONTACT.whatsappUrl,
  "https://www.instagram.com/creativesoundstudiorw/",
  "https://www.instagram.com/jabo_nkurunziza/",
  "https://www.youtube.com/@nkurunzizajabo7867",
] as const;

/** Render one JSON-LD block. Self-closing script + dangerouslySetInnerHTML —
 *  never renders these blocks client-side, they are static structured data. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Parse a service's real EN price line ("From 200,000 RWF" / "from 100 $")
 *  into a schema PriceSpecification body. Null when unparseable — the price
 *  is then omitted rather than guessed. */
function servicePriceSpec(svc: Service): { minPrice: number; priceCurrency: string } | null {
  const match = /^from\s+([\d][\d,]*(?:\.\d+)?)\s*([A-Za-z$€£]*)$/i.exec(svc.priceEn.trim());
  if (!match) return null;
  const minPrice = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(minPrice) || minPrice <= 0) return null;
  const raw = match[2];
  const priceCurrency = raw === "$" ? "USD" : raw ? raw.toUpperCase() : "RWF";
  return { minPrice, priceCurrency };
}

/** LocalBusiness priceRange line — min→max across the real RWF starting prices
 *  only (the lone "$"-denominated row would corrupt a local-currency range).
 *  Omitted entirely when no RWF price exists. */
function priceRangeFromServices(services: Service[]): string | null {
  const rwf = services
    .map(servicePriceSpec)
    .filter((p): p is { minPrice: number; priceCurrency: string } => p !== null && p.priceCurrency === "RWF")
    .map((p) => p.minPrice);
  if (rwf.length === 0) return null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const min = Math.min(...rwf);
  const max = Math.max(...rwf);
  return min === max ? `${fmt(min)} RWF` : `${fmt(min)}–${fmt(max)} RWF`;
}

/** Homepage identity — LocalBusiness (+ ProfessionalService). `image`,
 *  `openingHours` are omitted: no real logo/photo asset exists (the header
 *  logo is a CSS/SVG wordmark) and the site states no opening hours. */
export function localBusinessJsonLd(services: Service[], locale: Locale = DEFAULT_LOCALE) {
  const priceRange = priceRangeFromServices(services);
  const home = absoluteUrl("/", locale);
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ProfessionalService"],
    "@id": home,
    name: BRAND,
    description: SITE_DESCRIPTION,
    url: home,
    telephone: CONTACT.phoneE164,
    email: CONTACT.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kigali",
      addressCountry: "RW",
    },
    areaServed: ["Rwanda", "East Africa"],
    // The business serves both languages, so this is a list — not the single
    // language of whichever URL happened to be crawled.
    inLanguage: ["en", "rw"],
    ...(priceRange ? { priceRange } : {}),
    sameAs: [...SOCIAL_URLS],
  };
}

/** BreadcrumbList — used on /blog and /blog/[slug]. */
export function breadcrumbListJsonLd(items: ReadonlyArray<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** /services — one Service per real /public/services row. No per-service url:
 *  the page renders no id/slug anchors (ServiceBlocks wraps each card in a
 *  /book?service= link), so pointing at a nonexistent fragment would be worse
 *  than omitting it. */
export function servicesItemListJsonLd(services: Service[], locale: Locale = DEFAULT_LOCALE) {
  const home = absoluteUrl("/", locale);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Services — ${BRAND}`,
    inLanguage: locale,
    itemListElement: services.map((svc, i) => {
      const price = servicePriceSpec(svc);
      return {
        "@type": "Service",
        position: i + 1,
        name: svc.nameEn,
        ...(svc.descriptionEn ? { description: svc.descriptionEn } : {}),
        serviceType: svc.category,
        provider: { "@type": "LocalBusiness", name: BRAND, url: home },
        ...(price
          ? { offers: { "@type": "Offer", priceSpecification: { "@type": "PriceSpecification", ...price } } }
          : {}),
      };
    }),
  };
}

/** /blog index — BlogPosting items pointing at each real post URL, in the
 *  locale of the index being rendered. Headlines follow the same locale: an
 *  ItemList of Kinyarwanda posts whose headlines are English would contradict
 *  the page it sits on. */
export function blogItemListJsonLd(posts: PostSummary[], locale: Locale = DEFAULT_LOCALE) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Blog — ${BRAND}`,
    inLanguage: locale,
    itemListElement: posts.map((post, i) => ({
      "@type": "BlogPosting",
      position: i + 1,
      headline: locale === "rw" ? post.titleRw || post.titleEn : post.titleEn,
      url: absoluteUrl(`/blog/${post.slug}`, locale),
      inLanguage: locale,
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    })),
  };
}

/** /blog/[slug] — Article built from the real post row (author/publisher are
 *  the studio Organization; cover art only when the post has one).
 *
 *  The cover image stays a BARE `absoluteUrl(post.coverImageUrl)` — it is a
 *  `/uploads/...` file served by the backend, and no `/rw/uploads/...` route
 *  exists. */
export function articleJsonLd(post: PostFull, locale: Locale = DEFAULT_LOCALE) {
  const title = locale === "rw" ? post.titleRw || post.titleEn : post.titleEn;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    inLanguage: locale,
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
    author: { "@type": "Organization", name: BRAND },
    publisher: { "@type": "Organization", name: BRAND, url: absoluteUrl("/", locale) },
    ...(post.coverImageUrl ? { image: absoluteUrl(post.coverImageUrl) } : {}),
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`, locale),
  };
}

/** /portfolio — CreativeWork items from the real /public/portfolio rows. The
 *  `image` is a bare `/uploads/...` path (no locale segment exists for it). */
export function portfolioItemListJsonLd(items: PortfolioItem[], locale: Locale = DEFAULT_LOCALE) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Portfolio — ${BRAND}`,
    inLanguage: locale,
    itemListElement: items.map((item, i) => ({
      "@type": "CreativeWork",
      position: i + 1,
      name: locale === "rw" ? item.titleRw || item.titleEn : item.titleEn,
      category: item.category,
      image: absoluteUrl(item.coverUrl),
    })),
  };
}