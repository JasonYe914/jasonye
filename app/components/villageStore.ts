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

/** Fired on `window` to send the chicken to a village, or "home". */
export const TRAVEL_EVENT = "world:travel";

export function travelTo(id: string) {
  window.dispatchEvent(new CustomEvent<string>(TRAVEL_EVENT, { detail: id }));
}
