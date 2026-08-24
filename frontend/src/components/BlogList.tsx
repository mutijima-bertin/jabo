"use client";

import Link from "next/link";
import { Camera } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { PostSummary } from "@/lib/api";
import { BlogCard } from "@/components/BlogCard";

/**
 * Blog index — header, responsive card grid, and a tasteful empty state
 * that reuses the site's existing CTA copy. Client component because all
 * copy (header, pills, dates) comes from the useI18n() locale context.
 */
export function BlogList({ posts }: { posts: PostSummary[] | null }) {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <header className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brass">
          <Camera className="h-3.5 w-3.5" />
          Blog
        </span>
        <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight text-ink md:text-5xl">{t("blog_title")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/60">{t("blog_subtitle")}</p>
      </header>

      {posts && posts.length > 0 ? (
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-ink/10 bg-cream-alt px-6 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {t(posts === null ? "blog_unreachable_title" : "blog_empty_title")}
          </h2>
          <p className="mt-3 leading-relaxed text-ink/60">
            {t(posts === null ? "blog_unreachable_body" : "blog_body")}
          </p>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-brass px-8 py-4 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            {t("blog_cta")}
          </Link>
        </div>
      )}
    </section>
  );
}