import { HALF_H, HALF_W } from "./iso";
import { NAME_TILES } from "./name";
import { LOT } from "./villages";
import { PLANS } from "./villageLayout";

/*
 * The world is finite: just big enough for the name and every village,
 * with a band of open floor round them to wander in. The chicken can't
 * step past its edge.
 *
 * Past that edge the floor carries on for a skirt wide enough that the
 * view, even pulled right back and following the chicken into a corner,
 * never shows the empty space beyond the floor. Nothing is built past
 * the skirt, and the view can't go there.
 *
 * Worked out from where things are, so moving a village moves both.
 */

/** Open floor kept round the outermost things, in tiles. */
const MARGIN = 10;

const cols = [NAME_TILES.c0, NAME_TILES.c1, ...PLANS.flatMap((p) => [p.col, p.col + LOT])];
const rows = [NAME_TILES.r0, NAME_TILES.r1, ...PLANS.flatMap((p) => [p.row, p.row + LOT])];

/** The world's tiles: columns c0 to c1 - 1, rows r0 to r1 - 1. */
export const WORLD = {
  c0: Math.min(...cols) - MARGIN,
  c1: Math.max(...cols) + MARGIN,
  r0: Math.min(...rows) - MARGIN,
  r1: Math.max(...rows) + MARGIN,
};

/**
 * Floor past the world's edge, in tiles. At least as far as the window
 * reaches from its centre at the overview's zoom (about 42 to 47 tiles,
 * depending on the screen's shape), so the view can follow the chicken
 * right to the edge and still be all floor, and the overview isn't held
 * closer than it wants to be.
 */
const SKIRT = 50;

/** All the floor there is: the world, and its skirt. */
export const FLOOR = {
  c0: WORLD.c0 - SKIRT,
  c1: WORLD.c1 + SKIRT,
  r0: WORLD.r0 - SKIRT,
  r1: WORLD.r1 + SKIRT,
};

/** Whether tile (col, row) has floor. */
export function inFloor(col: number, row: number) {
  return col >= FLOOR.c0 && col < FLOOR.c1 && row >= FLOOR.r0 && row < FLOOR.r1;
}

/** Whether tile (col, row) is part of the world. */
export function inWorld(col: number, row: number) {
  return col >= WORLD.c0 && col < WORLD.c1 && row >= WORLD.r0 && row < WORLD.r1;
}

/**
 * Floor kept between the window's corners and the world's edge, in tiles,
 * so even the fogged rim of the window is over blocks.
 */
const RIM = 1.5;

/**
 * How far a window `w` by `h` world pixels reaches from its centre, in
 * tiles along both the columns and the rows. The window is a rectangle on
 * screen but a diamond on the grid, and its corners reach this far.
 */
function reach(w: number, h: number) {
  return w / (4 * HALF_W) + h / (4 * HALF_H) + RIM;
}

/**
 * The least zoom at which a `w` by `h` (CSS pixel) window fits inside the
 * world, so the screen is always covered with floor and never shows the
 * empty space past its edge.
 */
export function minZoomToFill(w: number, h: number) {
  // reach(w / z, h / z) <= SKIRT, solved for z: then a view centred
  // anywhere over the world stays over floor.
  return (w / (4 * HALF_W) + h / (4 * HALF_H)) / (SKIRT - RIM);
}

/**
 * Keeps a view centre where a window `w` by `h` world pixels round it
 * lies wholly over the floor. The world is a diamond on screen, so the
 * centre is clamped in grid space.
 */
export function clampToWorld(x: number, y: number, w: number, h: number) {
  const e = reach(w, h);
  const clamp = (v: number, lo: number, hi: number) =>
    lo > hi ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
  const col = (x / HALF_W + y / HALF_H) / 2;
  const row = (y / HALF_H - x / HALF_W) / 2;
  const c = clamp(col, FLOOR.c0 + e, FLOOR.c1 - e);
  const r = clamp(row, FLOOR.r0 + e, FLOOR.r1 - e);
  return { x: (c - r) * HALF_W, y: (c + r) * HALF_H };
}
