"use client";

/**
 * Toast primitive (Tier-1 admin) — a tiny global announcer.
 *
 * Lives in `lib/` next to `i18n.tsx` (the other provider module) because it is
 * a cross-cutting provider, not a screen: the shell mounts `<ToastProvider>`
 * once and any admin component can announce an outcome through `useToast()`.
 *
 * Contract:
 *   const { push } = useToast();
 *   push("success", t("toast_status_changed"), { actionLabel: t("toast_undo"), onAction });
 *
 * `push` takes ALREADY-TRANSLATED strings (`t(...)` at the call site) so this
 * module stays free of the dictionary — every visible string is still a
 * `DictKey`, just resolved by the caller that owns the wording.
 *
 * Behaviour (all values are kit constants, class strings come from `ui.ts`):
 *  - fixed bottom-right host, z-[60] — ABOVE dialogs (z-50) so a toast raised
 *    from inside an open dialog is never buried under its own backdrop;
 *  - `role="status"` + `aria-live="polite"` on the host, which is mounted EMPTY
 *    so assistive tech observes a live region before any text arrives;
 *  - auto-dismiss after TOAST_MS (~4s). An action does NOT extend the lifetime:
 *    it disappears with the card (clicked or timed out, never orphaned);
 *  - at most MAX_VISIBLE cards — a 4th push evicts the oldest, so the stack can
 *    never cover the whole viewport;
 *  - motion is `animate-admin-pop`, which globals.css already disables under
 *    `prefers-reduced-motion`.
 *
 * `useToast()` outside a provider returns a NO-OP push instead of throwing, so
 * a component can be rendered in isolation (tests, future routes) safely.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import {
  cx,
  toast,
  toastAction,
  toastDanger,
  toastHost,
  toastIcon,
  toastIconDanger,
  toastIconSuccess,
  toastIconWarning,
  toastMessage,
  toastSuccess,
  toastWarning,
} from "@/lib/ui";

/** Auto-dismiss delay — long enough to read, short enough to stay out of the way. */
const TOAST_MS = 4000;

/** Hard cap on the stack; the oldest card is dropped when a 4th arrives. */
const MAX_VISIBLE = 3;

/** Which of the three kinds (border + icon hue families in `ui.ts`). */
export type ToastKind = "success" | "warning" | "danger";

export interface ToastOptions {
  /** Trailing button label — already translated (`t(...)` at the call site). */
  actionLabel?: string;
  /** Runs when the action is clicked; the card dismisses first. */
  onAction?: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastApi {
  /** Announce `message` for ~4s, optionally with one trailing action. */
  push: (kind: ToastKind, message: string, opts?: ToastOptions) => void;
}

/** Stable no-op so a consumer without a provider never crashes the tree. */
const NOOP_PUSH: ToastApi["push"] = () => {};

const ToastCtx = createContext<ToastApi>({ push: NOOP_PUSH });

const KIND_VARIANTS: Record<ToastKind, string> = {
  success: toastSuccess,
  warning: toastWarning,
  danger: toastDanger,
};

const KIND_ICON_VARIANTS: Record<ToastKind, string> = {
  success: toastIconSuccess,
  warning: toastIconWarning,
  danger: toastIconDanger,
};

const KIND_ICONS: Record<ToastKind, typeof CircleCheck> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  // Monotonic id: a ref (not state) so pushing never waits on a re-render, and
  // two pushes inside one tick can never collide.
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => (prev.some((i) => i.id === id) ? prev.filter((i) => i.id !== id) : prev));
  }, []);

  const push = useCallback<ToastApi["push"]>((kind, message, opts) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message, ...opts }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className={toastHost} role="status" aria-live="polite">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** One card + its own auto-dismiss timer (mount-scoped, so eviction is free). */
function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const handle = window.setTimeout(() => onDismiss(item.id), TOAST_MS);
    return () => window.clearTimeout(handle);
  }, [item.id, onDismiss]);

  const Icon = KIND_ICONS[item.kind];

  // Dismiss first, then run the callback: the card must be gone before a slow
  // undo request starts, so the founder always sees what is happening.
  const runAction = () => {
    onDismiss(item.id);
    item.onAction?.();
  };

  return (
    <div className={cx(toast, KIND_VARIANTS[item.kind])}>
      <Icon className={cx(toastIcon, KIND_ICON_VARIANTS[item.kind])} aria-hidden="true" />
      <p className={toastMessage}>{item.message}</p>
      {item.actionLabel && (
        <button type="button" className={toastAction} onClick={runAction}>
          {item.actionLabel}
        </button>
      )}
    </div>
  );
}

/** Announce outcomes from anywhere under the provider. */
export function useToast(): ToastApi {
  return useContext(ToastCtx);
}
