"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx, dialogBackdrop, dialogFooter, dialogPanel, dialogPanelLg, dialogPanelSm, iconBtnGhost } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

/**
 * Accessible dialog primitive — spec §6.3/§6.4 full a11y contract:
 * role="dialog" + aria-modal, ESC closes (stopped from bubbling), focus trap
 * (Tab/Shift+Tab wrap), programmatic initial focus on open, focus restore on
 * close, body scroll lock. Callers render header/body/footer via `children`.
 */
export function AdminDialog({
  labelledBy,
  describedBy,
  size = "md",
  onClose,
  children,
}: {
  labelledBy: string;
  describedBy?: string;
  size?: "sm" | "md" | "lg";
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Remember what had focus so we can restore it on close (§6.4.5).
    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Body scroll lock while open (§6.4.8).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Initial focus onto the panel (§6.4.4 — tabIndex={-1}).
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      // Must not bubble to the page (§6.4.2).
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    // Focus trap (§6.4.3): wrap when focus leaves the panel bounds.
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  const panelClass = cx(
    dialogPanel,
    size === "sm" && dialogPanelSm,
    size === "lg" && dialogPanelLg,
  );

  return (
    <div className={dialogBackdrop} role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className={panelClass}
      >
        <button
          type="button"
          className={cx(iconBtnGhost, "absolute right-4 top-4 z-10")}
          aria-label={t("admin_close")}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Convenience dialog footer wrapper for consistent button rows. */
export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className={dialogFooter}>{children}</div>;
}
