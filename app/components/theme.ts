export type Theme = "light" | "dark";

/** Where an explicit choice is remembered. With none, the site is light. */
export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint, so the page never flashes the
 * wrong theme. Kept tiny and dependency-free on purpose.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** The theme on screen now. Light unless dark has been chosen. */
export function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  return set === "dark" ? "dark" : "light";
}

/** The theme the visitor picked, if they have picked one. */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** Everything the canvases paint with, read from the CSS custom properties. */
export type Palette = {
  top: string;
  side: string;
  line: string;
  mark: string;
  /** The minimap's ground. */
  map: string;
  /** The tile the chicken is on: its shade, and the outline round it. */
  here: string;
  hereEdge: string;
  /** The chicken's shadow. */
  shadow: string;
  /** The name's gradient stops, from its first letter to its last. */
  ink: string[];
  /** The three greys of the accent tiles, darkest first in light mode. */
  strong: string;
  mid: string;
  soft: string;
  /** Font family for text painted on canvas. */
  mono: string;
};

export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    top: read("--floor"),
    side: read("--floor-side"),
    line: read("--floor-line"),
    mark: read("--floor-mark"),
    map: read("--map-floor"),
    here: read("--tile-here"),
    hereEdge: read("--tile-here-edge"),
    shadow: read("--shadow"),
    ink: [read("--name-1"), read("--name-2"), read("--name-3"), read("--name-4")],
    strong: read("--accent-strong"),
    mid: read("--accent-mid"),
    soft: read("--accent-soft"),
    mono: `${read("--font-geist-mono") || "ui-monospace"}, monospace`,
  };
}

/**
 * Calls `onChange` whenever the theme attribute changes.
 * The callback runs before the next paint, so a canvas can redraw in time
 * to be part of a view transition's new snapshot.
 */
export function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}
