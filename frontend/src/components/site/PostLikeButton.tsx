"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/**
 * Public like button (no token). Optimistic: heart fills and count
 * increments immediately, then the server response reconciles the count;
 * on failure the optimistic change is reverted.
 */
export function PostLikeButton({ postId, initialLikes }: { postId: string; initialLikes: number }) {
  const { t } = useI18n();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function like() {
    if (liked || pending) return;
    setPending(true);
    setError("");
    setLiked(true);
    setLikes((n) => n + 1);
    try {
      const res = await api.post<{ ok: true; likes: number }>(`/public/posts/${postId}/like`, {});
      setLikes(res.likes);
    } catch {
      setLiked(false);
      setLikes((n) => Math.max(0, n - 1));
      setError(t("blog_like_error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={like}
        disabled={pending}
        aria-pressed={liked}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
          liked
            ? "border-brass-dark bg-brass-dark text-cream"
            : "border-ink/15 bg-white/70 text-ink/70 hover:border-brass hover:text-brass"
        } disabled:opacity-60`}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />}
        {likes} {t("blog_like")}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}