import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPost } from "@/lib/content";
import { PostView } from "@/components/PostView";

interface Props {
  params: Promise<{ slug: string }>;
}

// Request-scoped dedupe: generateMetadata and the page component both need the
// post, but every backend GET increments the view count. cache() ensures a
// single API call per HTTP request (content.ts itself stays free of React
// imports because the client component HeroSection imports it).
const getPost = cache((slug: string) => fetchPost(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  // Server has no locale context (locale lives in localStorage), so metadata
  // uses the English defaults — the in-page copy is locale-aware.
  if (!post) notFound();
  return {
    title: `${post.titleEn} — Creative Sound Studio`,
    description: post.excerptEn ?? post.titleEn,
    openGraph: {
      title: `${post.titleEn} — Creative Sound Studio`,
      description: post.excerptEn ?? post.titleEn,
      type: "article",
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  return <PostView post={post} />;
}