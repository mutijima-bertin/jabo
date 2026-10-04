import type { Metadata } from "next";
import { JsonLd, breadcrumbListJsonLd, blogItemListJsonLd } from "@/lib/jsonld";
import { api, type PostSummary } from "@/lib/api";
import { BlogList } from "@/components/site/BlogList";
import { absoluteUrl, localeMetadata } from "@/lib/seo";
import { isLocale } from "@/lib/locale";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

// Per-locale metadata + self-canonical + hreflang — see `localeMetadata`.
//
// Canonical deliberately ignores `?page=N`: the paginated index is one
// document, and self-canonicalising page 7 to /blog would be fine, but
// canonicalising page 7 to page 1 is not — it drops the deeper pages from the
// index and creates a duplicate-content signal. Each locale self-canonicalises
// to its own un-paginated index.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  return localeMetadata(locale, "/blog", "blog");
}

const PAGE_SIZE = 8;

// Breadcrumb trail shared by both render paths (backend up or down): the index
// has no pagination nuances worth reflecting in the trail. Built per-locale so
// the JSON-LD trail matches the URL the reader is actually on.
function blogCrumbs(locale: "en" | "rw") {
  return [
    { name: "Home", url: absoluteUrl("/", locale) },
    { name: "Blog", url: absoluteUrl("/blog", locale) },
  ] as const;
}

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const sp = await searchParams;
  const rawPage = sp.page;

  // Fetch on the server (no-store, so always fresh); BlogList is a small
  // client component that renders cards with the active locale.
  // Fetch via api.get directly (not content.fetchPosts): that helper swallows
  // failures into [], which would render the "no stories yet" empty state when
  // the backend is down. null = unreachable, so BlogList can say so instead.
  let posts: PostSummary[] | null = null;
  try {
    posts = await api.get<PostSummary[]>("/public/posts");
  } catch {
    // Backend unreachable or error — BlogList shows the "can't reach server" note.
  }

  if (posts === null) {
    return (
      <>
        <JsonLd data={breadcrumbListJsonLd(blogCrumbs(locale))} />
        <BlogList posts={null} totalCount={0} page={1} pageSize={PAGE_SIZE} />
      </>
    );
  }

  // Clamp to a valid page: hand-typed /blog?page=99 still lands on the last page.
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const page = Math.max(1, Math.min(Number.parseInt(rawPage ?? "", 10) || 1, totalPages));
  const start = (page - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);

  return (
    <>
      {/* SEO phase 5 — breadcrumbs + an ItemList of BlogPosting entries for the
          real published posts (all loaded rows; the visible slice is paginated). */}
      <JsonLd data={breadcrumbListJsonLd(blogCrumbs(locale))} />
      <JsonLd data={blogItemListJsonLd(posts, locale)} />
      <BlogList posts={pagePosts} totalCount={posts.length} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
