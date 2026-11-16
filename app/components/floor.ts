/**
 * Draws the floor from a repeating pattern instead of one path per tile.
 * Settled tiles are filled with a tiled picture of the grid lines, and
 * rising tiles are grouped by how far they have risen so each
 * group is one fill. Whole regions are filled as one traced outline,
 * because Skia rasterises a path with thousands of separate shapes on the
 * CPU every frame. The paths leave their loops open, because Chrome's
 * closePath slows down with path length and a fill closes them anyway.
 */

import { GRID_TILES, HALF_H, HALF_W } from "./iso";
import { type Palette } from "./theme";

/** A floor block. */
export type Tile = {
  col: number;
  row: number;
  /** The middle of its top face. */
  x: number;
  y: number;
  /** When it starts rising. */
  born: number;
  /** Kept even when it is out of view. */
  fixed: boolean;
  /** Set once it has finished rising. */
  settled: boolean;
};

/** Everything a floor draw needs to know about this frame. */
export type FloorFrame = {
  now: number;
  riseMs: number;
  risePx: number;
  lip: number;
  /** Device pixels per world pixel. */
  scale: number;
  zoom: number;
  colors: Pick<Palette, "top" | "side" | "line" | "mark">;
};

/**
 * The cached paths of the settled floor, rebuilt when its version moves,
 * and the tiles still rising, kept apart so a frame only looks at those.
 */
export type FloorState = {
  version: number;
  built: number;
  /** When the settled paths were last rebuilt. */
  builtAt: number;
  tops: Path2D | null;
  sides: Path2D | null;
  rising: Set<Tile>;
};

/**
 * Tiles that finish rising join the settled floor in batches at most this
 * often, since rebuilding its paths walks every tile. Until then they are
 * drawn at full height with the rising ones, which looks the same.
 */
const BATCH_MS = 250;

/** How many steps a rising tile's height is rounded to, so they can be grouped. */
export const RISE_LEVELS = 20;
/** The level of a tile that has not started rising yet. */
export const WAITING = -1;
/** The level of a tile that has finished rising. */
export const SETTLED = RISE_LEVELS + 1;

/** A number that identifies a tile, good for |col| and |row| below 2^20. */
export function tileKey(col: number, row: number) {
  return (col + 2 ** 20) * 2 ** 21 + (row + 2 ** 20);
}

/** Eases out, quickly at first and then settling. */
function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** How far a tile has risen, as a level from 0 to RISE_LEVELS, or WAITING or SETTLED. */
export function riseLevel(born: number, now: number, riseMs: number) {
  if (now < born) return WAITING;
  if (riseMs <= 0 || now - born >= riseMs) return SETTLED;
  return Math.round(easeOutCubic((now - born) / riseMs) * RISE_LEVELS);
}

/** Whether a tile's side can be seen: any of the tiles in front is not yet settled. */
export function showsSide(tiles: Map<number, Tile>, col: number, row: number) {
  return (
    !tiles.get(tileKey(col + 1, row))?.settled ||
    !tiles.get(tileKey(col, row + 1))?.settled ||
    !tiles.get(tileKey(col + 1, row + 1))?.settled
  );
}

/**
 * The outline of a set of tiles, as closed loops of tile corners
 * `[col, row, col, row, …]`, with a corner only where the outline turns.
 * Outer loops and holes run opposite ways, so a nonzero fill covers exactly
 * the tiles. `has` must be true exactly for the tiles in `cells`.
 */
export function traceOutline(
  cells: Iterable<{ col: number; row: number }>,
  has: (col: number, row: number) => boolean,
): number[][] {
  const leaving = new Map<number, number[]>();
  const starts: number[] = [];
  const edge = (c0: number, r0: number, c1: number, r1: number) => {
    const key = tileKey(c0, r0);
    let list = leaving.get(key);
    if (!list) {
      list = [];
      leaving.set(key, list);
    }
    list.push(c1, r1);
    starts.push(c0, r0);
  };
  // Each tile contributes an edge on every side that has no neighbour.
  for (const { col: c, row: r } of cells) {
    if (!has(c, r - 1)) edge(c, r, c + 1, r);
    if (!has(c + 1, r)) edge(c + 1, r, c + 1, r + 1);
    if (!has(c, r + 1)) edge(c + 1, r + 1, c, r + 1);
    if (!has(c - 1, r)) edge(c, r + 1, c, r);
  }
  const loops: number[][] = [];
  for (let i = 0; i < starts.length; i += 2) {
    const sc = starts[i];
    const sr = starts[i + 1];
    if (!leaving.get(tileKey(sc, sr))?.length) continue;
    const loop: number[] = [];
    let c = sc;
    let r = sr;
    let dc = 0;
    let dr = 0;
    // Every corner has as many edges in as out, so a walk always comes back
    // to where it started.
    do {
      const list = leaving.get(tileKey(c, r));
      if (!list || list.length < 2) break; // only if `has` disagrees with `cells`
      const nr = list.pop() as number;
      const nc = list.pop() as number;
      if (nc - c !== dc || nr - r !== dr) {
        loop.push(c, r);
        dc = nc - c;
        dr = nr - r;
      }
      c = nc;
      r = nr;
    } while (c !== sc || r !== sr);
    loops.push(loop);
  }
  return loops;
}

/** Makes an empty floor cache. */
export function createFloor(): FloorState {
  return {
    version: 0,
    built: -1,
    builtAt: -Infinity,
    tops: null,
    sides: null,
    rising: new Set(),
  };
}

/** Registers a tile just added to the map; call it for every new tile. */
export function floorAdded(floor: FloorState, tile: Tile) {
  if (!tile.settled) floor.rising.add(tile);
}

/** Tells the cache a tile was dropped from the map. */
export function floorDropped(floor: FloorState, tile: Tile) {
  floor.rising.delete(tile);
}

/** Tells the cache its tiles changed; call it after dropping tiles. */
export function floorChanged(floor: FloorState) {
  floor.version++;
}

/**
 * Adds loops of tile corners to a path, `dy` world pixels lower. Left open:
 * the fill closes them.
 */
function addLoops(path: Path2D, loops: number[][], dy: number) {
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i += 2) {
      const x = (loop[i] - loop[i + 1]) * HALF_W;
      const y = (loop[i] + loop[i + 1]) * HALF_H + dy;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
  }
  return path;
}

/** The width of the repeating floor picture, in world pixels. */
const PERIOD_W = 4 * HALF_W;
/** The height of the repeating floor picture, in world pixels. */
const PERIOD_H = 4 * HALF_H;
/** The pattern made last time, kept while the scale, zoom and colours hold. */
let pattern: { key: string; fill: CanvasPattern } | null = null;

/** Makes, or reuses, the tiled picture of the grid lines. */
function floorPattern(
  ctx: CanvasRenderingContext2D,
  f: FloorFrame,
): CanvasPattern | string {
  const { top, line } = f.colors;
  const key = `${f.scale.toFixed(3)}|${f.zoom.toFixed(4)}|${top}|${line}`;
  if (pattern && pattern.key === key) return pattern.fill;

  const w = Math.max(1, Math.round(PERIOD_W * f.scale));
  const h = Math.max(1, Math.round(PERIOD_H * f.scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const p = canvas.getContext("2d");
  if (!p) return top;

  p.setTransform(w / PERIOD_W, 0, 0, h / PERIOD_H, 0, 0);
  p.fillStyle = top;
  p.fillRect(0, 0, PERIOD_W, PERIOD_H);
  p.lineWidth = 1 / f.zoom;
  p.lineJoin = "round";
  p.lineCap = "round";

  // Each square drawn on the floor is GRID_TILES tiles a side, so the grid
  // reads at the zoomed-out home view. Squares start on even tiles, which
  // the 4-tile period repeats cleanly.
  const lines = new Path2D();
  const n = GRID_TILES;
  for (let col = -4; col <= 6; col += n) {
    for (let row = -4; row <= 6; row += n) {
      const x = (col - row) * HALF_W;
      const y = (col + row) * HALF_H;
      lines.moveTo(x, y);
      lines.lineTo(x + n * HALF_W, y + n * HALF_H);
      lines.lineTo(x, y + 2 * n * HALF_H);
      lines.lineTo(x - n * HALF_W, y + n * HALF_H);
      lines.lineTo(x, y);
    }
  }
  p.strokeStyle = line;
  p.stroke(lines);

  const fill = ctx.createPattern(canvas, "repeat");
  if (!fill) return top;
  fill.setTransform(new DOMMatrix([PERIOD_W / w, 0, 0, PERIOD_H / h, 0, 0]));
  pattern = { key, fill };
  return fill;
}

/**
 * Draws every tile: the rising ones in groups by height, then the settled
 * floor in one go. Returns whether any tile is still rising or waiting.
 */
export function drawFloor(
  ctx: CanvasRenderingContext2D,
  floor: FloorState,
  tiles: Map<number, Tile>,
  f: FloorFrame,
): boolean {
  const fill = floorPattern(ctx, f);
  const groups: Tile[][] = [];
  const landed: Tile[] = [];
  for (const tile of floor.rising) {
    const level = riseLevel(tile.born, f.now, f.riseMs);
    if (level === WAITING) continue;
    if (level === SETTLED) landed.push(tile);
    else (groups[level] ??= []).push(tile);
  }
  // Landed tiles settle together: once enough time has passed since the
  // last rebuild, or straight away when nothing else is still rising.
  if (
    landed.length > 0 &&
    (landed.length === floor.rising.size || f.now - floor.builtAt >= BATCH_MS)
  ) {
    for (const tile of landed) {
      tile.settled = true;
      floor.rising.delete(tile);
    }
    floor.version++;
  } else if (landed.length > 0) {
    (groups[RISE_LEVELS] ??= []).push(...landed);
  }
  const rising = floor.rising.size > 0;

  ctx.save();
  for (let level = 0; level <= RISE_LEVELS; level++) {
    const group = groups[level];
    if (!group) continue;
    const keys = new Set(group.map((t) => tileKey(t.col, t.row)));
    const loops = traceOutline(group, (c, r) => keys.has(tileKey(c, r)));
    const sides = addLoops(new Path2D(), loops, f.lip);
    const tops = addLoops(new Path2D(), loops, 0);
    ctx.save();
    ctx.globalAlpha = level / RISE_LEVELS;
    ctx.translate(0, (1 - level / RISE_LEVELS) * f.risePx);
    ctx.fillStyle = f.colors.side;
    ctx.fill(sides);
    ctx.fillStyle = fill;
    ctx.fill(tops);
    ctx.restore();
  }

  if (floor.built !== floor.version || !floor.tops || !floor.sides) {
    const settled: Tile[] = [];
    for (const tile of tiles.values()) if (tile.settled) settled.push(tile);
    const isSettled = (c: number, r: number) =>
      tiles.get(tileKey(c, r))?.settled === true;
    const edge = settled.filter((t) => showsSide(tiles, t.col, t.row));
    const edgeKeys = new Set(edge.map((t) => tileKey(t.col, t.row)));
    floor.tops = addLoops(new Path2D(), traceOutline(settled, isSettled), 0);
    floor.sides = addLoops(
      new Path2D(),
      traceOutline(edge, (c, r) => edgeKeys.has(tileKey(c, r))),
      f.lip,
    );
    floor.built = floor.version;
    floor.builtAt = f.now;
  }

  ctx.fillStyle = f.colors.side;
  ctx.fill(floor.sides);
  ctx.fillStyle = fill;
  ctx.fill(floor.tops);
  ctx.restore();
  return rising;
}
