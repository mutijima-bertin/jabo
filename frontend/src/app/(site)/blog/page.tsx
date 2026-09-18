import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { absoluteUrl, OG_IMAGE } from "@/lib/seo";
import { JsonLd, breadcrumbListJsonLd, blogItemListJsonLd } from "@/lib/jsonld";
import { api, type PostSummary } from "@/lib/api";
import { BlogList } from "@/components/site/BlogList";

export const metadata: Metadata = {
  title: "Blog",
  description: `Notes, highlights and client stories from behind the lens at ${BRAND} — Kigali, Rwanda.`,
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: `Blog — ${BRAND}`,
    description: `Notes, highlights and client stories from behind the lens at ${BRAND} — Kigali, Rwanda.`,
    url: absoluteUrl("/blog"),
    images: [OG_IMAGE],
    siteName: BRAND,
    locale: "en_RW",
    type: "website",
  },
};

const PAGE_SIZE = 8;

// Breadcrumb trail shared by both render paths (backend up or down): the index
// has no pagination nuances worth reflecting in the trail.
const BLOG_CRUMBS = [
  { name: "Home", url: absoluteUrl("/") },
  { name: "Blog", url: absoluteUrl("/blog") },
] as const;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const rawPage = params.page;

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
        <JsonLd data={breadcrumbListJsonLd(BLOG_CRUMBS)} />
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
      <JsonLd data={breadcrumbListJsonLd(BLOG_CRUMBS)} />
      <JsonLd data={blogItemListJsonLd(posts)} />
      <BlogList posts={pagePosts} totalCount={posts.length} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}