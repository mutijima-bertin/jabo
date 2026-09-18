"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Eye, Heart } from "lucide-react";
import { useI18n, postTypeKey, type DictKey } from "@/lib/i18n";
import type { PostFull, PostSummary, Service } from "@/lib/api";
import { formatDate, readingMinutes } from "@/lib/format";
import { CONTACT } from "@/lib/site";
import { cachedServices } from "@/lib/services";
import { fetchPosts } from "@/lib/content";
import { PostCover } from "@/components/site/PostCover";
import { PostBody } from "@/components/site/PostBody";
import { PostLikeButton } from "@/components/site/PostLikeButton";
import { BlogCard } from "@/components/site/BlogCard";
import { WhatsAppIcon } from "@/components/shared/social-icons";

/** Primary CTA label per post type (book_cta_* keys), fallback for anything else. */
function bookCtaKey(contentType: string): DictKey {
  switch (contentType) {
    case "PROJECT_RECAP":
      return "book_cta_recap";
    case "CLIENT_STORY":
      return "book_cta_story";
    case "EDUCATIONAL":
      return "book_cta_educational";
    case "STUDIO_NEWS":
      return "book_cta_news";
    default:
      return "book_a_production";
  }
}

/**
 * Per-type booking CTA band. Href rules: fetch services ONCE (module-level
 * cached promise) and pick the service whose linkedPostSlug is this post's
 * slug — only then pre-select it via /book?service=<id>; otherwise the bare
 * /book link. Never guess a service.
 */
function PostCta({ post }: { post: PostFull }) {
  const { t } = useI18n();
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    cachedServices().then(setServices);
  }, []);

  const linked = services.find((s) => s.linkedPostSlug === post.slug);
  const href = linked ? `/book?service=${linked.id}` : "/book";
  const label = t(bookCtaKey(post.contentType));

  return (
    <section aria-labelledby="post-cta-title" className="mt-16 rounded-3xl bg-ink px-6 py-16 text-center md:px-12">
      <h2 id="post-cta-title" className="font-serif text-2xl font-semibold text-cream md:text-3xl">
        {label}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream/70">{t("cta_support_line")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={href}
          className="inline-block rounded-full bg-brass-deep px-8 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark"
        >
          {label}
        </Link>
        <a
          href={CONTACT.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-8 py-3.5 text-sm font-bold text-cream transition hover:border-brass hover:bg-brass"
        >
          <WhatsAppIcon className="h-4 w-4" aria-hidden />
          {t("social_whatsapp")}
        </a>
      </div>
    </section>
  );
}

// Posts are immutable during a visit — cache the list promise so a locale
// toggle re-renders the related grid from memory instead of refetching.
let postsPromise: Promise<PostSummary[]> | null = null;
function cachedPosts(): Promise<PostSummary[]> {
  postsPromise ??= fetchPosts();
  return postsPromise;
}

/**
 * "More stories" — up to 3 related posts below the CTA band. Prefers posts
 * of the SAME content type, fills with the newest others, and hides itself
 * entirely when fewer than one other post exists.
 */
function PostMoreStories({ post }: { post: PostFull }) {
  const { t } = useI18n();
  const [related, setRelated] = useState<PostSummary[] | null>(null);

  useEffect(() => {
    cachedPosts().then((all) => {
      const others = all.filter((p) => p.slug !== post.slug);
      const same = others.filter((p) => p.contentType === post.contentType);
      const rest = others.filter((p) => p.contentType !== post.contentType);
      setRelated([...same, ...rest].slice(0, 3));
    });
  }, [post.slug, post.contentType]);

  if (!related || related.length === 0) return null;

  return (
    <section aria-labelledby="more-stories-title" className="mt-16">
      <h2 id="more-stories-title" className="font-serif text-2xl font-semibold text-ink">
        {t("more_stories")}
      </h2>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {related.map((p) => (
          <BlogCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

/**
 * Single post view. Client component so title/body/meta follow the active
 * locale from useI18n(); the server page fetches the post and passes it in.
 */
export function PostView({ post }: { post: PostFull }) {
  const { locale, t } = useI18n();
  const title = locale === "rw" && post.titleRw ? post.titleRw : post.titleEn;
  const content = locale === "rw" && post.contentRw ? post.contentRw : post.contentEn;
  const excerpt = locale === "rw" ? post.excerptRw || post.excerptEn || "" : post.excerptEn || "";
  const minutes = readingMinutes(content);

  return (
    <article className="mx-auto max-w-4xl px-4 py-16 md:py-20">
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
            <span className="sr-only">{t("read_time")}: </span>
            <Clock className="h-4 w-4 text-brass" aria-hidden />
            {minutes} {t("min_read")}
          </span>
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
        alt={post.titleEn}
        sizes="(max-width: 768px) 100vw, 768px"
        priority
        className="mt-10 aspect-video rounded-2xl"
      />

      <div className="mt-10">
        <PostBody content={content} />
      </div>

      <PostCta post={post} />
      <PostMoreStories post={post} />
    </article>
  );
}