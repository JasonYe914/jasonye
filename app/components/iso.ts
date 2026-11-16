/** Length of a tile edge in CSS pixels. */
export const TILE_SIDE = 66;

// True isometric projection: grid axes are drawn 30° off the horizontal.
export const HALF_W = TILE_SIDE * Math.cos(Math.PI / 6);
export const HALF_H = TILE_SIDE * Math.sin(Math.PI / 6);

/** Unit step in grid space: [col, row]. Columns run down-right, rows down-left. */
export type Direction = readonly [number, number];

/**
 * Projects a point in grid space onto the screen. `col` and `row` are in
 * tiles, `z` is height in tiles above the floor surface (z = 0).
 */
export function project(col: number, row: number, z = 0) {
  return {
    x: (col - row) * HALF_W,
    y: (col + row) * HALF_H - z * TILE_SIDE,
  };
}

/** Screen position of the middle of a tile's top face. */
export function tileCenter(col: number, row: number) {
  return project(col + 0.5, row + 0.5);
}

/** Axis-aligned box in grid space. */
export type Box = {
  c0: number;
  c1: number;
  r0: number;
  r1: number;
  z0: number;
  z1: number;
};

/** Fill for each of the three faces visible from the camera. */
export type FaceFills = { top: string; left: string; right: string };

const EPSILON = 1e-9;

function isBehind(a: Box, b: Box) {
  return (
    a.c1 <= b.c0 + EPSILON || a.r1 <= b.r0 + EPSILON || a.z1 <= b.z0 + EPSILON
  );
}

/** Orders non-overlapping boxes back to front so nearer ones paint last. */
export function sortBackToFront<T extends { box: Box }>(items: T[]): T[] {
  const remaining = [...items];
  const sorted: T[] = [];

  while (remaining.length > 0) {
    let next = remaining.findIndex((candidate) =>
      remaining.every(
        (other) =>
          other === candidate ||
          !(
            isBehind(other.box, candidate.box) &&
            !isBehind(candidate.box, other.box)
          ),
      ),
    );
    if (next === -1) next = 0;
    sorted.push(remaining.splice(next, 1)[0]);
  }

  return sorted;
}

/**
 * How many tiles each square ruled on the floor spans, along each side.
 * Squares start on even tiles. The chicken still steps one tile at a time;
 * the squares are only what the floor, and anything marking a spot on it,
 * is drawn in.
 */
export const GRID_TILES = 2;

/** Screen position of the middle of the floor square holding tile (col, row). */
export function squareCenter(col: number, row: number) {
  const c0 = Math.floor(col / GRID_TILES) * GRID_TILES;
  const r0 = Math.floor(row / GRID_TILES) * GRID_TILES;
  return project(c0 + GRID_TILES / 2, r0 + GRID_TILES / 2);
}

/** Whether two tiles lie in the same floor square. */
export function sameSquare(c0: number, r0: number, c1: number, r1: number) {
  return (
    Math.floor(c0 / GRID_TILES) === Math.floor(c1 / GRID_TILES) &&
    Math.floor(r0 / GRID_TILES) === Math.floor(r1 / GRID_TILES)
  );
}
