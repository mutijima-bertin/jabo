"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { adminApi, setToken } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import {
  adminFieldLabel,
  adminInputCls,
  btnPrimary,
  cardCls,
  cx,
  errorBanner,
  infoBanner,
} from "@/lib/ui";

/** Prerender-safe fallback — useSearchParams suspends on the server. */
function LoginFallback() {
  return <Loader2 className="h-8 w-8 animate-spin text-accent" />;
}

export default function AdminLoginPage() {
  return (
    // Root gains admin-shell: dark canvas + brass focus-ring switch (spec §3.4 / §12.3).
    <div className="admin-shell flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense fallback={<LoginFallback />}>
        <LoginInner />
      </Suspense>
    </div>
  );
}

function LoginInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Session-expired flash (spec §9): the info banner, not an error — the user
  // did nothing wrong; the token expired on its own.
  const showExpired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.post<{ token: string }>("/auth/login", "", { email, password });
      setToken(res.token);
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      // Invalid credentials surface as NOT_AUTHENTICATED (adminFetch maps any
      // 401) or INVALID_CREDENTIALS (backend body); the rate limiter sends
      // TOO_MANY_ATTEMPTS on 429. Everything else is a generic friendly
      // message — never a raw server code in the banner.
      const msg = (err as Error).message;
      if (msg === "NOT_AUTHENTICATED" || msg === "INVALID_CREDENTIALS") setError(t("admin_login_invalid"));
      else if (msg === "TOO_MANY_ATTEMPTS") setError(t("admin_login_rate_limited"));
      else setError(t("admin_error_generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand mark header (spec §9) */}
      <div className="text-center">
        <p className="font-serif text-3xl font-semibold text-admin-text">{BRAND}</p>
        <p className="mt-1 text-sm text-admin-muted">{t("admin_area_sub")}</p>
      </div>

      <form className={cx(cardCls, "mt-8 space-y-5 p-8")} onSubmit={submit} noValidate={false}>
        {showExpired && (
          <div className={infoBanner} role="status">
            {t("admin_session_expired")}
          </div>
        )}
        {error && (
          <div className={errorBanner} role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="admin-email" className={adminFieldLabel}>
            {t("admin_email")}
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={adminInputCls}
            placeholder={t("admin_login_email_placeholder")}
          />
        </div>
        <div>
          <label htmlFor="admin-password" className={adminFieldLabel}>
            {t("admin_password")}
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={adminInputCls}
          />
        </div>
        <button type="submit" disabled={busy} className={cx(btnPrimary, "h-11 w-full")}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("admin_signin")}
        </button>
      </form>
    </div>
  );
}
