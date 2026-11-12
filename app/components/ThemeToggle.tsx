"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  THEME_KEY,
  currentTheme,
  storedTheme,
  watchTheme,
  type Theme,
} from "./theme";

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Switches between light and dark. The first visit follows the system
 * theme; a click pins the choice from then on.
 */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(watchTheme, currentTheme, () => null);

  useLayoutEffect(() => {
    // React's dev remount clears attributes on <html>; put the theme back.
    apply(storedTheme() ?? currentTheme());

    // Until the visitor picks one, keep following the system.
    const system = matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (!storedTheme()) apply(system.matches ? "dark" : "light");
    };
    system.addEventListener("change", follow);
    return () => system.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reducedMotion) {
      apply(next);
      return;
    }
    // A soft crossfade, canvases included: they redraw synchronously when
    // the attribute changes, before the new snapshot is taken.
    document.startViewTransition(() => apply(next));
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Dark mode"
      aria-pressed={theme === null ? undefined : dark}
      className="chrome theme-toggle fixed top-4 right-4 z-40 grid size-11 place-items-center rounded-full"
    >
      {/* Both icons are rendered; CSS shows the one for the current theme,
          so the server HTML is right before React has loaded. */}
      <svg className="icon-moon size-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"
          fill="currentColor"
        />
      </svg>
      <svg className="icon-sun size-5" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.25" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
      </svg>
    </button>
  );
}
