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
 * The current theme and a function to flip it. The site starts light; a
 * flip is remembered from then on.
 */
export function useThemeToggle() {
  const theme = useSyncExternalStore(watchTheme, currentTheme, () => null);

  // React's dev remount clears attributes on <html>; put the theme back.
  useLayoutEffect(() => {
    apply(storedTheme() ?? "light");
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

  return { theme, toggle };
}

/**
 * The moon offers dark mode; the sun offers light mode back. Both are
 * rendered and CSS shows the right one, so the server HTML is correct
 * before React has loaded.
 */
export function ThemeIcon() {
  return (
    <>
      <svg className="icon-moon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"
          fill="currentColor"
        />
      </svg>
      <svg className="icon-sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.25" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
      </svg>
    </>
  );
}
