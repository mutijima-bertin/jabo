"use client";

import { useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { adminApi, adminUpload, useSessionGuard } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import {
  adminFieldError,
  adminFieldHint,
  adminFieldLabel,
  btnDanger,
  btnPrimary,
  btnSecondary,
  btnSm,
  cardBody,
  cardFooter,
  cardHeader,
  cardHeaderTitle,
  confirmBody,
  confirmBox,
  confirmTitle,
  cx,
  dropzoneActive,
  dropzoneCls,
  dropzoneHint,
  dropzoneIcon,
  dropzoneTitle,
  errorBanner,
  pageHeader,
  pageTitle,
  rowActionDanger,
  skeletonCard,
  successBanner,
} from "@/lib/ui";

/** Replace the `{n}` placeholder in a rate-limit template with a count. */
function formatCount(template: string, n: number): string {
  return template.replace("{n}", String(n));
}

/** Shared admin upload: file → data URL → POST /admin/uploads → URL. */
export async function uploadImage(token: string, file: File): Promise<{ url: string; remaining?: number }> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return adminUpload(token, dataUrl);
}

// ---------------------------------------------------------------------------
// putCollectionOrder — Phase E: non-optimistic collection reorder (§11.4)
// ---------------------------------------------------------------------------
// Swaps in a COPY of the collection, PUTs the FULL re-sorted collection (raw
// array body; sortOrder == array index) to /admin/<collection>/order, and
// resolves the canonical re-sorted collection (same shape as the matching GET
// endpoint) so the caller can `setData(response)` directly — no reload, avoids
// the skeleton flash. Backend error codes (STALE_COLLECTION / NOT_AUTHENTICATED
// / VALIDATION / NOT_FOUND …) propagate to the caller for its UX decisions.
export async function putCollectionOrder<T extends { id: string }>(
  path: string,
  token: string,
  items: T[],
  fromIndex: number,
  toIndex: number,
): Promise<T[]> {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return adminApi.put<T[]>(
    path,
    token,
    next.map((it, idx) => ({ id: it.id, sortOrder: idx })),
  );
}

// ---------------------------------------------------------------------------
// CollectionManager — header + loading/error/empty/default states (spec §7.1)
// ---------------------------------------------------------------------------

interface CollectionManagerProps {
  title: string;
  newLabel: string;
  onNew: () => void;
  error: string;
  onRetry: () => void;
  loading: boolean;
  /** Default (loaded) state — list/grid/editor. */
  children: ReactNode;
}

export function CollectionManager({ title, newLabel, onNew, error, onRetry, loading, children }: CollectionManagerProps) {
  const { t } = useI18n();
  return (
    <div>
      <div className={pageHeader}>
        <h1 className={pageTitle}>{title}</h1>
        <button className={btnPrimary} onClick={onNew}>
          <Plus className="h-4 w-4" />
          {newLabel}
        </button>
      </div>

      {error ? (
        <div className="mt-6">
          <div className={errorBanner} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button className={btnSecondary} onClick={onRetry}>
              {t("admin_retry")}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={skeletonCard} />
          ))}
        </div>
      ) : (
        <div className="mt-6">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ManagerEditor — shared editor form chrome (spec §7.2)
// ---------------------------------------------------------------------------

interface ManagerEditorProps {
  title: string;
  /** Real form submit — Enter works everywhere (defect 6). */
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  /** True when the form has unsaved changes (drives the no-console-confirm dirty guard). */
  dirty: boolean;
  busy: boolean;
  /** Success banner persists until the next edit — no timers (defect 6). */
  saved: boolean;
  error: string;
  /** Create (new item) or Save (existing item). */
  saveLabel: string;
  children: ReactNode;
}

export function ManagerEditor({ title, onSubmit, onCancel, dirty, busy, saved, error, saveLabel, children }: ManagerEditorProps) {
  const { t } = useI18n();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleCancel = () => {
    if (dirty && !saved) setConfirmCancel(true);
    else onCancel();
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-admin-border bg-admin-base">
      <div className={cardHeader}>
        <h2 className={cardHeaderTitle}>{title}</h2>
      </div>
      <div className={cx(cardBody, "space-y-5")}>{children}</div>
      <div className={cx(cardFooter, "flex-col items-stretch gap-3")}>
        {saved && (
          <div className={successBanner} role="status">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {t("admin_saved")}
          </div>
        )}
        {error && (
          <div className={errorBanner} role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        )}
        {confirmCancel ? (
          <div className={confirmBox}>
            <p className={confirmTitle}>{t("admin_unsaved_title")}</p>
            <p className={confirmBody}>{t("admin_unsaved_body")}</p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setConfirmCancel(false)}>
                {t("admin_keep_editing")}
              </button>
              <button type="button" className={btnDanger} onClick={onCancel}>
                {t("admin_discard")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={handleCancel}>
              {t("admin_form_cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? t("admin_saving") : saved ? t("admin_saved") : saveLabel}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// DeleteButton — always-visible row action that morphs into an inline confirm
// ---------------------------------------------------------------------------

interface DeleteButtonProps {
  busy: boolean;
  onConfirm: () => void;
  /** Optional collection-specific confirm title (default: admin_delete_title). */
  confirmLabel?: string;
}

export function DeleteButton({ busy, onConfirm, confirmLabel }: DeleteButtonProps) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className={rowActionDanger} disabled={busy} onClick={() => setConfirming(true)}>
        <Trash2 className="h-3.5 w-3.5" />
        {t("admin_form_delete")}
      </button>
    );
  }
  return (
    <div className={confirmBox}>
      <p className={confirmTitle}>{confirmLabel ?? t("admin_delete_title")}</p>
      <p className={confirmBody}>{t("admin_delete_body")}</p>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button type="button" className={cx(btnSecondary, btnSm)} disabled={busy} onClick={() => setConfirming(false)}>
          {t("admin_form_cancel")}
        </button>
        <button
          type="button"
          className={cx(btnDanger, btnSm)}
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {busy ? t("admin_deleting") : t("admin_delete_confirm")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropzone — keyboard-accessible single-image upload (spec §7.2)
// ---------------------------------------------------------------------------

interface DropzoneProps {
  token: string;
  /** Current image URL — previewed when non-empty. */
  value: string;
  onChange: (url: string) => void;
  /** Surfaces upload failures to the parent's error banner (defect 8). */
  onError?: (msg: string) => void;
  title: string;
  hint: string;
}

export function Dropzone({ token, value, onChange, onError, title, hint }: DropzoneProps) {
  const { t } = useI18n();
  const handleSessionExpired = useSessionGuard();
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  /** Live budget left this hour from `RateLimit-Remaining`; only set when ≤ 5. */
  const [remaining, setRemaining] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError("");
    setRemaining(null);
    try {
      const { url, remaining: left } = await uploadImage(token, file);
      if (typeof left === "number" && left <= 5) setRemaining(left);
      onChange(url);
    } catch (e) {
      const raw = (e as Error).message || t("admin_error_generic");
      if (raw === "NOT_AUTHENTICATED") {
        handleSessionExpired();
        return;
      }
      const msg = raw === "RATE_LIMITED" ? t("admin_upload_rate_limited") : raw;
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }

  const openPicker = () => fileRef.current?.click();

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={title}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cx(dropzoneCls, dragOver && dropzoneActive)}
      >
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element -- admin upload preview; dimensions vary per collection */
          <img src={value} alt="" className="max-h-40 rounded-xl object-contain" />
        ) : (
          <UploadCloud className={dropzoneIcon} />
        )}
        <p className={dropzoneTitle}>{busy ? t("admin_logos_uploading") : title}</p>
        <p className={dropzoneHint}>{hint}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      {value && (
        <button type="button" className={cx(btnSecondary, "mt-2")} onClick={() => onChange("")}>
          <Trash2 className="h-3.5 w-3.5" />
          {t("admin_service_remove_image")}
        </button>
      )}
      {remaining !== null && remaining <= 5 && (
        <p className="mt-1.5 text-xs text-admin-faint" role="status">
          {formatCount(t("admin_upload_remaining"), remaining)}
        </p>
      )}
      {error && <p className={adminFieldError}>{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field — standardized label + hint wrapper (spec §7.2: adminFieldLabel).
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={adminFieldLabel}>
        {label}
      </label>
      {children}
      {hint ? <p className={adminFieldHint}>{hint}</p> : null}
    </div>
  );
}
