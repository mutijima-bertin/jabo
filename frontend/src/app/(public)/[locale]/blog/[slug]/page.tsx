import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd, articleJsonLd, breadcrumbListJsonLd } from "@/lib/jsonld";
import { fetchPost } from "@/lib/content";
import { PostView } from "@/components/site/PostView";
import { absoluteUrl, postMetadata } from "@/lib/seo";
import { isLocale } from "@/lib/locale";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

// Request-scoped dedupe: generateMetadata and the page component both need the
// post, but every backend GET increments the view count. cache() ensures a
// single API call per HTTP request (content.ts itself stays free of React
// imports because the client component HeroSection imports it).
const getPost = cache((slug: string) => fetchPost(slug));

/**
 * The `*Rw` columns are real: `PostSummary`/`PostFull` carry `titleRw: string`
 * and `excerptRw: string | null` (see lib/api.ts). This file used to ignore
 * them and hardcode `titleEn`/`excerptEn`, with a comment explaining WHY it had
 * to: the server had no locale context while the locale lived only in
 * localStorage. Now the locale is a URL segment, so /rw/blog/<slug> can serve
 * the Kinyarwanda title and excerpt to the crawler — which is the entire point
 * of this refactor, since those columns are filled in by the studio and were
 * previously unreachable by any search engine.
 *
 * `excerptRw` is nullable (the studio may have translated a title before
 * writing the excerpt), so it falls back to the localized title rather than
 * silently dropping the description.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const post = await getPost(slug);
  if (!post) notFound();

  const title = locale === "rw" ? post.titleRw || post.titleEn : post.titleEn;
  const excerpt = locale === "rw" ? post.excerptRw : post.excerptEn;
  return postMetadata(locale, post.slug, { title, description: excerpt ?? title });
}

export default async function PostPage({ params }: Props) {
  const { slug, locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "en";
  const post = await getPost(slug);
  if (!post) notFound();

  // The trail's leaf label must match the document it describes, so it uses the
  // same localized title the <h1>/<title> use.
  const leafTitle = locale === "rw" ? post.titleRw || post.titleEn : post.titleEn;

  return (
    <>
      {/* SEO phase 5 — Article from the real post row + Home → Blog → post trail. */}
      <JsonLd data={articleJsonLd(post, locale)} />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: "Home", url: absoluteUrl("/", locale) },
          { name: "Blog", url: absoluteUrl("/blog", locale) },
          { name: leafTitle, url: absoluteUrl(`/blog/${post.slug}`, locale) },
        ])}
      />
      <PostView post={post} />
    </>
  );
}
