"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Tab / Shift+Tab focus trap for a modal surface (spec §6.4.3).
 *
 * Returns the ref to attach to the CONTAINER and, for as long as `active` is
 * true, installs the wrap-around keydown handler on it. Focus cycling walks the
 * container's focusable descendants, so a Tab that would leave the panel — or a
 * focus that already sits outside it — is redirected back inside.
 *
 * The hook deliberately owns ONLY the trap and the ref. The rest of the
 * §6.3/§6.4 contract stays at the call site because it legitimately differs per
 * surface: `AdminDialog` moves initial focus onto the panel itself, while the
 * ⌘K palette moves it into the combobox field (the hook focusing the panel
 * would fight that). ESC handling also stays with the surface — the palette
 * needs it on the field too, which sits outside a panel-level React handler's
 * default path. Body scroll lock and focus restore are likewise unchanged.
 *
 * The listener is native and scoped to the container, so it observes exactly
 * the events a container-level React `onKeyDown` would (events bubbling out of
 * the container's descendants) without forcing every caller to remember to wire
 * an `onKeyDown` that must not clobber its own keys.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const panelRef = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    // Refs are attached during the commit phase, before passive effects run, so
    // the container is already in the DOM here.
    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !panel.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !panel.contains(activeEl))) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [active]);

  return panelRef;
}
