"use client";

import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { useI18n, postTypeKey } from "@/lib/i18n";
import type { PostSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PostCover } from "@/components/PostCover";

/** Blog list card: cover, content-type pill, locale title/excerpt, date + views + likes. */
export function BlogCard({ post }: { post: PostSummary }) {
  const { locale, t } = useI18n();
  const title = locale === "rw" && post.titleRw ? post.titleRw : post.titleEn;
  const excerpt = locale === "rw" ? post.excerptRw || post.excerptEn || "" : post.excerptEn || "";

  return (
    <Link
      href={`/blog/${post.slug}`}
      // Prefetching would run the server page for in-viewport cards and
      // inflate the view counter without a real visit.
      prefetch={false}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white/70 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-md"
    >
      <PostCover coverImageUrl={post.coverImageUrl} alt={title} sizes="(max-width: 768px) 100vw, 50vw" className="aspect-video" />
      <div className="flex flex-1 flex-col p-5">
        <span className="w-fit rounded-full border border-brass/30 bg-brass/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-brass">
          {t(postTypeKey(post.contentType))}
        </span>
        <h2 className="mt-3 font-serif text-xl font-semibold leading-snug text-ink transition-colors group-hover:text-brass-dark">
          {title}
        </h2>
        {excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/55">{excerpt}</p>}
        <div className="mt-auto flex items-center gap-4 border-t border-ink/10 pt-4 text-xs text-ink/50">
          <time dateTime={post.publishedAt ?? undefined}>{formatDate(post.publishedAt, locale)}</time>
          <span className="ml-auto inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 text-brass" aria-hidden />
            {post.views} {t("blog_views")}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-brass" aria-hidden />
            {post.likes} {t("blog_likes")}
          </span>
        </div>
      </div>
    </Link>
  );
}