import { NAME_CENTER } from "./name";
import { VILLAGES } from "./villages";

/**
 * A place in the world worth finding. The minimap points to the ones out of
 * its range from the edge, so the world can be explored by map.
 */
export type Landmark = {
  id: string;
  label: string;
  /** Grid position of its middle. */
  col: number;
  row: number;
  /**
   * "area": already drawn on the map as itself (like the name, or a
   * village's lot), so it only needs pointing to once it is out of range.
   * "pin": a marker is drawn for it on the map.
   */
  kind: "area" | "pin";
  /** The arrow and label colour, if not the default. */
  color?: string;
};

export const LANDMARKS: Landmark[] = [
  { id: "home", label: "Home", ...NAME_CENTER, kind: "area" },
  ...VILLAGES.map((village) => ({
    id: village.id,
    label: village.short,
    col: village.col,
    row: village.row,
    kind: "area" as const,
    color: village.color,
  })),
];
