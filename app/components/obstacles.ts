import { placeBlocks } from "./places";
import { propAt } from "./props";
import { isBlocked } from "./villageLayout";
import { inWorld } from "./worldEdge";

/**
 * Nothing that blocks ever moves, so each tile's answer is worked out once and
 * kept in typed arrays, filled in lazily as the world is explored.
 */

/** Tiles along one side of a cached block. */
const BLOCK = 64;
/** A cell not yet worked out. */
const UNKNOWN = 0;
/** A cell the chicken can stand on. */
const OPEN = 1;
/** A cell the chicken cannot stand on. */
const SOLID = 2;

/** Cached cells for each block of tiles, keyed by block. */
const blocks = new Map<number, Uint8Array>();

/** One number per block, for Map keys without building strings. */
function blockKey(i: number, j: number) {
  return (i + 32768) * 65536 + (j + 32768);
}

/** The slow answer, asking every source of obstacles in turn. */
function computeBlocked(col: number, row: number) {
  // Off the edge of the world counts as blocked, so walking and routes stop there.
  return !inWorld(col, row) || isBlocked(col, row) || placeBlocks(col, row) || propAt(col, row) !== null;
}

/** Whether the chicken cannot stand on the tile (a building, something standing in a place, or a prop). */
export function blockedAt(col: number, row: number): boolean {
  const i = Math.floor(col / BLOCK);
  const j = Math.floor(row / BLOCK);
  let cells = blocks.get(blockKey(i, j));
  if (!cells) {
    cells = new Uint8Array(BLOCK * BLOCK);
    blocks.set(blockKey(i, j), cells);
  }
  const index = (row - j * BLOCK) * BLOCK + (col - i * BLOCK);
  if (cells[index] === UNKNOWN) cells[index] = computeBlocked(col, row) ? SOLID : OPEN;
  return cells[index] === SOLID;
}
