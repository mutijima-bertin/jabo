import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { api, type PostSummary } from "@/lib/api";
import { BlogList } from "@/components/site/BlogList";

export const metadata: Metadata = {
  title: "Blog",
  description: `Notes, highlights and client stories from behind the lens at ${BRAND} — Kigali, Rwanda.`,
};

const PAGE_SIZE = 8;

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
    return <BlogList posts={null} totalCount={0} page={1} pageSize={PAGE_SIZE} />;
  }

  // Clamp to a valid page: hand-typed /blog?page=99 still lands on the last page.
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const page = Math.max(1, Math.min(Number.parseInt(rawPage ?? "", 10) || 1, totalPages));
  const start = (page - 1) * PAGE_SIZE;
  const pagePosts = posts.slice(start, start + PAGE_SIZE);

  return <BlogList posts={pagePosts} totalCount={posts.length} page={page} pageSize={PAGE_SIZE} />;
}