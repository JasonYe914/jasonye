import { NAME_CENTER } from "./name";

/**
 * A place in the world worth finding: each project will be one. The minimap
 * marks every landmark, and points to the ones out of its range from the
 * edge, so the world can be explored by map.
 */
export type Landmark = {
  id: string;
  label: string;
  /** Grid position of its middle. */
  col: number;
  row: number;
  /**
   * "area": already drawn on the map as itself (like the name), so it only
   * needs pointing to once it is out of range.
   * "pin": a marker is drawn for it on the map.
   */
  kind: "area" | "pin";
};

export const LANDMARKS: Landmark[] = [
  { id: "home", label: "Home", ...NAME_CENTER, kind: "area" },
  // Projects go here, e.g.
  // { id: "rover", label: "Mars Rover", col: 24, row: -10, kind: "pin" },
];
