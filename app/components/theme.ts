export type Theme = "light" | "dark";

/** Where an explicit choice is remembered. With none, the site is light. */
export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint, so the page never flashes the
 * wrong theme. Kept tiny and dependency-free on purpose.
 */
/**
 * The page's background in each theme, for the browser's own toolbar and
 * status bar on phones (the theme-color meta tag), so they run on from
 * the page instead of sitting in a band of another colour.
 */
export const THEME_COLOR: Record<Theme, string> = {
  light: "#f5f5f5",
  dark: "#0a0a0a",
};

/** Points the theme-color meta tag (written by THEME_SCRIPT) at `theme`. */
export function applyThemeColor(theme: Theme) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[theme]);
}

/*
 * Also writes the theme-color tag, already in the right colour, since the
 * theme is only known here.
 */
export const THEME_SCRIPT = `(function(){var t="light";try{t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="light"}catch(e){t="light"}document.documentElement.setAttribute("data-theme",t);var m=document.createElement("meta");m.name="theme-color";m.content=t==="dark"?"${THEME_COLOR.dark}":"${THEME_COLOR.light}";document.head.appendChild(m)})()`;

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
  /** The route's squares: far from the target, and next to it. */
  routeFar: string;
  routeNear: string;
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
    routeFar: read("--route-far"),
    routeNear: read("--route-near"),
    shadow: read("--shadow"),
    ink: [read("--name-1"), read("--name-2"), read("--name-3"), read("--name-4")],
    strong: read("--accent-strong"),
    mid: read("--accent-mid"),
    soft: read("--accent-soft"),
    mono: `${read("--font-fun") || "Arial"}, sans-serif`,
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

/** Blends two #rrggbb colours, `t` of the way from `a` to `b`. */
export function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  if (Number.isNaN(pa) || Number.isNaN(pb)) return t < 0.5 ? a : b;
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  const rgb = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  return `#${rgb.toString(16).padStart(6, "0")}`;
}
