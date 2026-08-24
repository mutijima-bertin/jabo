"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { setClientToken } from "@/lib/client";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-brass";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const redeemed = useRef(false);

  // Magic link flow: ?token=... was clicked in the email. Exchange it once,
  // store the client JWT, and go to the account page.
  useEffect(() => {
    if (!token || redeemed.current) return;
    redeemed.current = true;
    setRedeeming(true);
    api
      .post<{ token: string }>(`/clients/login/${token}`, {})
      .then((res) => {
        setClientToken(res.token);
        router.replace("/account");
      })
      .catch((err) => {
        setRedeeming(false);
        setError(
          err instanceof ApiError && err.status === 401 ? t("client_login_link_invalid") : t("book_error"),
        );
      });
  }, [token, router, t]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError(t("client_login_email_invalid"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api.post<{ ok: boolean }>("/clients/login-request", { email: value });
      setSent(true);
    } catch {
      setError(t("book_error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <Logo className="mx-auto h-14 w-auto" />

      {redeeming ? (
        <div className="mt-14 rounded-3xl border border-ink/10 bg-white/70 p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-brass" />
        </div>
      ) : sent ? (
        <div className="mt-14 rounded-3xl border border-brass/40 bg-cream-alt p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-14 w-14 text-brass" />
          <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight">{t("client_login_success_title")}</h1>
          <p className="mt-3 text-ink/65">{t("client_login_success_body")}</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-brass px-7 py-3 text-sm font-bold text-cream transition hover:bg-brass-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("client_login_back_home")}
          </Link>
        </div>
      ) : (
        <>
          <h1 className="mt-10 text-center font-serif text-3xl font-semibold leading-tight">{t("client_login_title")}</h1>
          <p className="mt-3 text-center text-ink/60">{t("client_login_sub")}</p>

          <form onSubmit={submit} className="mt-10 space-y-4 rounded-3xl border border-ink/10 bg-white/70 p-8 shadow-sm">
            {error && (
              <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <p>{error}</p>
                {error === t("client_login_link_invalid") && (
                  <p className="text-xs text-red-500/80">{t("client_login_link_invalid_hint")}</p>
                )}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink/70" htmlFor="login-email">
                {t("client_login_email")}
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-brass px-8 py-3.5 text-sm font-bold text-cream transition hover:bg-brass-dark disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? t("client_login_sending") : t("client_login_submit")}
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-ink/45">
        hello@creativesoundstudio.rw · +250 700 000 000
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-40"><Loader2 className="h-8 w-8 animate-spin text-brass" /></div>}>
      <LoginInner />
    </Suspense>
  );
}
