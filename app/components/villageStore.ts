import type { Spot } from "./villageLayout";

/*
 * What the chicken is near, shared between the canvas and the cards drawn
 * over it. The world writes; the cards read with useSyncExternalStore.
 */

export type Focus = {
  villageId: string;
  /** The building it is beside, if any. */
  spot: Spot | null;
  onPlaza: boolean;
  visited: number;
  total: number;
};

export type VillageState = {
  focus: Focus | null;
  /** The village whose full sheet is open. */
  sheet: string | null;
};

const EMPTY: VillageState = { focus: null, sheet: null };
let state: VillageState = EMPTY;
const listeners = new Set<() => void>();

function set(next: Partial<VillageState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const villageStore = {
  get: () => state,
  server: () => EMPTY,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setFocus(focus: Focus | null) {
    const now = state.focus;
    const same =
      now === focus ||
      (now &&
        focus &&
        now.villageId === focus.villageId &&
        now.spot?.id === focus.spot?.id &&
        now.onPlaza === focus.onPlaza &&
        now.visited === focus.visited);
    if (!same) set({ focus });
  },
  openSheet(id: string) {
    if (state.sheet !== id) set({ sheet: id });
  },
  closeSheet() {
    if (state.sheet !== null) set({ sheet: null });
  },
};

/**
 * Fired on `window` when the projects gallery closes onto the world. A
 * visit that opened on the gallery (a project page's back link) holds the
 * intro until then, so it plays only on the way into the world.
 */
export const GALLERY_CLOSED_EVENT = "world:gallery-closed";

/**
 * Set by a project page's back link as it is clicked. In a client-side
 * navigation the home page renders before the address changes to
 * /?projects, so without this its first frame would show the world, not
 * the gallery. Dropped once the address itself says so, or the gallery
 * closes.
 */
let galleryRequested = false;

export function requestGallery() {
  galleryRequested = true;
}

export function forgetGalleryRequest() {
  galleryRequested = false;
}

/** Whether the address asks for the projects gallery, as /?projects does,
 *  or a back link has just asked for it on the way there. */
export function projectsInUrl() {
  const inUrl = new URLSearchParams(location.search).has("projects");
  if (inUrl) galleryRequested = false;
  return inUrl || galleryRequested;
}

/**
 * Fired on `window` when a full-page panel (the gallery or About) opens over
 * the world or closes: the detail is whether the world is now covered. The
 * world stops drawing while nothing of it shows. Kept here too, so a world
 * that mounts under an open panel starts out paused.
 */
export const WORLD_COVER_EVENT = "world:cover";

let worldCovered = false;

export function isWorldCovered() {
  return worldCovered;
}

export function setWorldCovered(covered: boolean) {
  if (covered === worldCovered) return;
  worldCovered = covered;
  window.dispatchEvent(new CustomEvent<boolean>(WORLD_COVER_EVENT, { detail: covered }));
}

/** Fired on `window` to send the chicken to a village, or "home". */
export const TRAVEL_EVENT = "world:travel";

export function travelTo(id: string) {
  window.dispatchEvent(new CustomEvent<string>(TRAVEL_EVENT, { detail: id }));
}

/**
 * Fired on `window` to zoom the world view: a factor (above 1 zooms in),
 * or 0 to go back to the settled zoom.
 */
export const ZOOM_EVENT = "world:zoom";

export function zoomWorld(factor: number) {
  window.dispatchEvent(new CustomEvent<number>(ZOOM_EVENT, { detail: factor }));
}
