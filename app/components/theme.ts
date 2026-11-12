export type Theme = "light" | "dark";

/** Where an explicit choice is remembered. With none, the system decides. */
export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint, so the page never flashes the
 * wrong theme. Kept tiny and dependency-free on purpose.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

/** The theme on screen now: the attribute if set, otherwise the system's. */
export function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
  /** The tile the chicken is on: its shade, and the outline round it. */
  here: string;
  hereEdge: string;
  /** The chicken's shadow. */
  shadow: string;
  /** The main view's footprint on the minimap. */
  view: string;
  viewEdge: string;
  /** The name's gradient, from the back of the floor to the front. */
  ink: [string, string, string];
  orange: string;
  blue: string;
  sky: string;
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
    here: read("--tile-here"),
    hereEdge: read("--tile-here-edge"),
    shadow: read("--shadow"),
    view: read("--map-view"),
    viewEdge: read("--map-view-edge"),
    ink: [read("--ink-from"), read("--ink-via"), read("--ink-to")],
    orange: read("--accent-orange"),
    blue: read("--accent-blue"),
    sky: read("--accent-sky"),
    mono: `${read("--font-geist-mono") || "ui-monospace"}, monospace`,
  };
}

/**
 * Calls `onChange` whenever the colours may have changed: the theme
 * attribute flipping, or the system theme changing while none is set.
 * The callback runs before the next paint, so a canvas can redraw in time
 * to be part of a view transition's new snapshot.
 */
export function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  const system = matchMedia("(prefers-color-scheme: dark)");
  system.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    system.removeEventListener("change", onChange);
  };
}
