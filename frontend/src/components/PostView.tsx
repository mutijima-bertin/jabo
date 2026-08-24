"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Eye, Heart } from "lucide-react";
import { useI18n, postTypeKey } from "@/lib/i18n";
import type { PostFull } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PostCover } from "@/components/PostCover";
import { PostBody } from "@/components/PostBody";
import { PostLikeButton } from "@/components/PostLikeButton";
import { WhatsAppIcon } from "@/components/social-icons";

const WHATSAPP_URL = "https://wa.me/250783269951";

/**
 * Single post view. Client component so title/body/meta follow the active
 * locale from useI18n(); the server page fetches the post and passes it in.
 */
export function PostView({ post }: { post: PostFull }) {
  const { locale, t } = useI18n();
  const title = locale === "rw" && post.titleRw ? post.titleRw : post.titleEn;
  const content = locale === "rw" && post.contentRw ? post.contentRw : post.contentEn;
  const excerpt = locale === "rw" ? post.excerptRw || post.excerptEn || "" : post.excerptEn || "";

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 md:py-20">
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink/60 transition hover:text-brass"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("blog_back")}
      </Link>

      <header className="mt-8">
        <span className="inline-flex items-center rounded-full border border-brass/30 bg-brass/10 px-3.5 py-1 text-xs font-medium uppercase tracking-[0.14em] text-brass">
          {t(postTypeKey(post.contentType))}
        </span>
        <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight text-ink md:text-5xl">{title}</h1>
        {excerpt && <p className="mt-5 text-lg leading-relaxed text-ink/60">{excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-ink/10 py-4 text-sm text-ink/55">
          {post.publishedAt && (
            <time className="inline-flex items-center gap-1.5" dateTime={post.publishedAt}>
              <Calendar className="h-4 w-4 text-brass" aria-hidden />
              {formatDate(post.publishedAt, locale)}
            </time>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-brass" aria-hidden />
            {post.views} {t("blog_views")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Heart className="h-4 w-4 text-brass" aria-hidden />
            {post.likes} {t("blog_likes")}
          </span>
          <PostLikeButton postId={post.id} initialLikes={post.likes} />
        </div>
      </header>

      <PostCover
        coverImageUrl={post.coverImageUrl}
        alt={title}
        sizes="(max-width: 768px) 100vw, 768px"
        priority
        className="mt-10 aspect-video rounded-2xl"
      />

      <div className="mt-10">
        <PostBody content={content} />
      </div>

      <section className="mt-16 rounded-3xl bg-green px-6 py-12 text-center md:px-12">
        <h2 className="font-serif text-2xl font-semibold text-cream md:text-3xl">{t("blog_cta_title")}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/70">{t("blog_cta_body")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/book"
            className="inline-block rounded-full bg-brass px-8 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            {t("blog_cta")}
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-8 py-3.5 text-sm font-bold text-cream transition hover:border-brass hover:bg-brass"
          >
            <WhatsAppIcon className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
        </div>
      </section>
    </article>
  );
}