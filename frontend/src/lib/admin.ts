"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "css_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAdminAuth() {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR; restore the persisted admin token after mount
    setTokenState(getToken());
    setReady(true);
  }, []);

  const set = (t: string | null) => {
    if (t) setToken(t);
    else clearToken();
    setTokenState(t);
  };

  return { token, ready, setToken: set };
}

/**
 * Raw authenticated fetch: GET/POST/PATCH/PUT/DELETE against the backend.
 * Any HTTP 401 throws `Error("NOT_AUTHENTICATED")` so a single centralized
 * session guard can react to it (never sprinkle status checks at call sites).
 * NOTE: the login endpoint (`/auth/login`, empty token) is intentionally NOT
 * routed through this guard — invalid credentials surface here as
 * `Error("NOT_AUTHENTICATED")` and are mapped to a friendly message by the
 * login page itself.
 */
export async function adminFetch<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* empty */
    }
    if (res.status === 401) throw new Error("NOT_AUTHENTICATED");
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  get: <T>(p: string, token: string) => adminFetch<T>(p, token),
  post: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(p: string, token: string, body: unknown) => adminFetch<T>(p, token, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(p: string, token: string) => adminFetch<T>(p, token, { method: "DELETE" }),
};

/**
 * Upload a raw data URL to POST /api/admin/uploads — the ONLY admin upload
 * path (services, portfolio, blog covers, logos). That endpoint sits behind a
 * 20/hr per-IP rate limiter (express-rate-limit, standardHeaders draft-7) which
 * emits ONE combined `RateLimit: limit=20, remaining=19, reset=3600` header —
 * NOT the legacy `RateLimit-Remaining`. Parse the combined header first, fall
 * back to `RateLimit-Remaining` for older backends, so the UI can tell the
 * founder how many uploads are left this hour.
 * Same error contract as adminFetch: 401 → `Error("NOT_AUTHENTICATED")`, else
 * the API body's `error` code (e.g. `RATE_LIMITED` on 429) or a fallback with
 * the status.
 */
export async function adminUpload(token: string, dataUrl: string): Promise<{ url: string; remaining?: number }> {
  const res = await fetch(`${API_URL}/api/admin/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ dataUrl }),
    cache: "no-store",
  });
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* empty */
    }
    if (res.status === 401) throw new Error("NOT_AUTHENTICATED");
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  let remaining: number | undefined;
  const combined = res.headers.get("RateLimit");
  const combinedMatch = combined ? combined.match(/remaining=(\d+)/) : null;
  if (combinedMatch) {
    const n = Number(combinedMatch[1]);
    if (Number.isFinite(n)) remaining = n;
  }
  if (remaining === undefined) {
    const legacy = res.headers.get("RateLimit-Remaining");
    if (legacy !== null && legacy !== "") {
      const n = Number(legacy);
      if (Number.isFinite(n)) remaining = n;
    }
  }
  const { url } = (await res.json()) as { url: string };
  return { url, remaining };
}

// ---------------------------------------------------------------------------
// Centralized 401 session guard (spec §4.2 defect 1 fix)
// ---------------------------------------------------------------------------
// ONE place owns the "session expired" behavior: any adminApi call that
// surfaces `NOT_AUTHENTICATED` funnels through `handleSessionExpired` (via
// `useSessionGuard`), which clears the token and client-side redirects to
// `/admin/login?expired=1`. A ref keeps the redirect single-fire even when
// several parallel requests 401 at once.

/** Stable callback that clears the token and redirects once to the login page. */
export function useSessionGuard() {
  const router = useRouter();
  const navigated = useRef(false);

  const handleSessionExpired = useCallback(() => {
    if (navigated.current) return;
    navigated.current = true;
    clearToken();
    router.replace("/admin/login?expired=1");
  }, [router]);

  return handleSessionExpired;
}

// ---------------------------------------------------------------------------
// Generic fetch-on-mount hook (spec §4.2 — the "tiny shared useAdminRequest")
// ---------------------------------------------------------------------------
// Every tab component loads its collection through this hook: it fetches on
// mount, exposes { data, error, loading, reload, setData } and auto-handles
// 401 via the session guard — so components never reach for clearToken() or
// router.replace() themselves.

export interface UseAdminFetchOptions {
  /** When false the hook stays idle (e.g. waiting for a parent value). Default: true */
  enabled?: boolean;
}

export interface UseAdminFetchResult<T> {
  data: T | null;
  error: string;
  loading: boolean;
  /**
   * Re-run the GET request. Resolves `true` only when the newest payload
   * landed without an error — so a parent can announce success (e.g. the
   * dashboard's "Updated just now"), and `false` on network error / 401.
   */
  reload: () => Promise<boolean>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useAdminFetch<T>(
  path: string,
  token: string | null,
  opts?: UseAdminFetchOptions,
): UseAdminFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const guard = useSessionGuard();
  const enabled = opts?.enabled !== false;
  // Monotonic id: the newest request wins — stale responses from a previous
  // fetch/reload never overwrite data after a newer one resolved.
  const requestId = useRef(0);

  // Single fetch routine shared by the mount effect and reload() — all setState
  // happens in promise callbacks (never synchronously in an effect body) so
  // react-hooks/set-state-in-effect stays quiet (spec §4.2).
  const run = useCallback(
    (): Promise<boolean> => {
      if (!token || !enabled) {
        setLoading(false);
        return Promise.resolve(false);
      }
      const id = ++requestId.current;
      setLoading(true);
      setError("");
      return adminFetch<T>(path, token)
        .then((result) => {
          if (requestId.current !== id) return false;
          setData(result);
          setError("");
          return true;
        })
        .catch((e) => {
          if (requestId.current !== id) return false;
          const msg = (e as Error).message;
          if (msg === "NOT_AUTHENTICATED") {
            guard();
            return false;
          }
          setError(msg);
          return false;
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false);
        });
    },
    [path, token, enabled, guard],
  );

  useEffect(() => {
    let cancelled = false;
    // Deferred so the no-sync-setState rule stays happy; covers the idle case
    // (!token || !enabled → resolves data=null, loading=false, no request).
    Promise.resolve().then(() => {
      if (!cancelled) return run();
    });
    return () => {
      cancelled = true;
      // Unmount while a request is in flight: drop the result.
      requestId.current += 1;
    };
  }, [run]);

  const reload = useCallback((): Promise<boolean> => run(), [run]);

  return { data, error, loading, reload, setData };
}
