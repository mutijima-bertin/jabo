import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";
import { api, type PostSummary } from "@/lib/api";
import { BlogList } from "@/components/site/BlogList";

export const metadata: Metadata = {
  title: `Blog — ${BRAND}`,
  description: `Notes, highlights and client stories from behind the lens at ${BRAND} — Kigali, Rwanda.`,
};

export default async function BlogPage() {
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
  return <BlogList posts={posts} />;
}