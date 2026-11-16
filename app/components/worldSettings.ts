/*
 * The visitor's own settings for the world, kept in localStorage so they
 * last between visits. Each one is mirrored onto <html> as a data
 * attribute, so CSS can act on it without the components knowing.
 */

export type WorldSettings = {
  /** The minimap in the bottom-right corner. */
  minimap: boolean;
  /** The chicken's coordinates, in the minimap's corner. */
  coords: boolean;
  /** Sliding the view with the mouse at a window edge. */
  edgePan: boolean;
};

const DEFAULTS: WorldSettings = { minimap: true, coords: true, edgePan: true };
const KEY = "world-settings";

let state: WorldSettings = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function apply() {
  const root = document.documentElement;
  root.dataset.minimap = state.minimap ? "on" : "off";
  root.dataset.coords = state.coords ? "on" : "off";
}

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") state = { ...DEFAULTS, ...saved };
  } catch {
    // Storage blocked or corrupt: the defaults stand.
  }
  apply();
}

export const worldSettings = {
  get() {
    load();
    return state;
  },
  server: () => DEFAULTS,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  set(next: Partial<WorldSettings>) {
    load();
    state = { ...state, ...next };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Not saved, but still applied for this visit.
    }
    apply();
    listeners.forEach((listener) => listener());
  },
};

/** Fired on `window` to show the controls guide again. */
export const GUIDE_EVENT = "world:guide";

export function showGuide() {
  window.dispatchEvent(new Event(GUIDE_EVENT));
}
