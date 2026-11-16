/**
 * Clicking a Claude sends little ones hopping out; they wander round it a
 * while and pop away. Nothing bumps into them.
 */

import { drawProp, type Prop } from "./props";

/** One little hopper, mid-wander around its home prop. */
export type Mini = {
  kind: Prop["kind"];
  homeCol: number;
  homeRow: number;
  fromCol: number;
  fromRow: number;
  col: number;
  row: number;
  hopStart: number;
  nextHop: number;
  born: number;
  dies: number;
  /** Share of the big one's size. */
  size: number;
  /** Hop height in pixels. */
  jump: number;
};

/** The most minis alive at once; the oldest go first. */
export const MAX_MINIS = 12;
/** How many minis one click sends out. */
export const PER_CLICK = 3;
/** Delay between each mini of one click appearing, in milliseconds. */
export const STAGGER_MS = 140;
/** How long one hop takes, in milliseconds. */
export const HOP_MS = 280;
/** Shortest rest between hops, in milliseconds. */
export const REST_MIN_MS = 250;
/** Longest rest between hops, in milliseconds. */
export const REST_MAX_MS = 1100;
/** Shortest life of a mini, in milliseconds. */
export const LIFE_MIN_MS = 9000;
/** Longest life of a mini, in milliseconds. */
export const LIFE_MAX_MS = 14000;
/** How long the pop-in grow takes, in milliseconds. */
export const POP_MS = 320;
/** How long the shrink away at the end takes, in milliseconds. */
export const VANISH_MS = 380;
/** How far, in tiles, a mini may stray from home along each axis. */
export const RANGE = 3;
/** Smallest size of a mini, as a share of the big one. */
export const SIZE_MIN = 0.36;
/** Largest size of a mini, as a share of the big one. */
export const SIZE_MAX = 0.5;
/** Lowest hop height, in pixels. */
export const JUMP_MIN = 6;
/** Highest hop height, in pixels. */
export const JUMP_MAX = 11;

/** A random number from min up to max. */
function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Holds a number within 0 to 1. */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Eases from 0 to 1 with a small overshoot, for the pop-in. */
function easeOutBack(t: number): number {
  return 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
}

/** How far through its current hop a mini is, from 0 to 1. */
function hop(m: Mini, now: number): number {
  return clamp01((now - m.hopStart) / HOP_MS);
}

/** Sends a few minis out of a prop, dropping the oldest past the cap. */
export function spawnMinis(minis: Mini[], prop: Prop, now: number): void {
  for (let i = 0; i < PER_CLICK; i++) {
    const start = now + i * STAGGER_MS;
    minis.push({
      kind: prop.kind,
      homeCol: prop.col,
      homeRow: prop.row,
      fromCol: prop.col,
      fromRow: prop.row,
      col: prop.col,
      row: prop.row,
      hopStart: -Infinity,
      nextHop: start,
      born: start,
      dies: start + between(LIFE_MIN_MS, LIFE_MAX_MS),
      size: between(SIZE_MIN, SIZE_MAX),
      jump: between(JUMP_MIN, JUMP_MAX),
    });
  }
  if (minis.length > MAX_MINIS) minis.splice(0, minis.length - MAX_MINIS);
}

/** Moves each mini on by a hop when due, and removes the vanished ones. */
export function updateMinis(
  minis: Mini[],
  now: number,
  blocked: (col: number, row: number) => boolean,
): void {
  for (let i = minis.length - 1; i >= 0; i--) {
    const m = minis[i];
    if (now >= m.dies + VANISH_MS) {
      minis.splice(i, 1);
      continue;
    }
    if (now < m.nextHop || now >= m.dies) continue;
    const options = [
      [m.col + 1, m.row],
      [m.col - 1, m.row],
      [m.col, m.row + 1],
      [m.col, m.row - 1],
    ].filter(
      ([c, r]) =>
        Math.abs(c - m.homeCol) <= RANGE &&
        Math.abs(r - m.homeRow) <= RANGE &&
        !blocked(c, r),
    );
    m.fromCol = m.col;
    m.fromRow = m.row;
    if (options.length > 0) {
      const [c, r] = options[Math.floor(Math.random() * options.length)];
      m.col = c;
      m.row = r;
    }
    m.hopStart = now;
    m.nextHop = now + HOP_MS + between(REST_MIN_MS, REST_MAX_MS);
  }
}

/** Where a mini stands now, as the centre of its tile in fractional tiles. */
export function miniSpot(
  m: Mini,
  now: number,
): { col: number; row: number } {
  const t = hop(m, now);
  return {
    col: m.fromCol + (m.col - m.fromCol) * t + 0.5,
    row: m.fromRow + (m.row - m.fromRow) * t + 0.5,
  };
}

/** Draws a mini, popping in, hopping, and shrinking away at the end. */
export function drawMini(
  ctx: CanvasRenderingContext2D,
  m: Mini,
  now: number,
  shadow: string,
  scale: number,
): void {
  if (now < m.born) return;
  const grow =
    m.size *
    easeOutBack(clamp01((now - m.born) / POP_MS)) *
    (1 - clamp01((now - m.dies) / VANISH_MS));
  if (grow <= 0) return;
  const spot = miniSpot(m, now);
  const lift = Math.sin(Math.PI * hop(m, now)) * m.jump;
  ctx.save();
  ctx.translate(0, -lift);
  drawProp(
    ctx,
    { col: spot.col - 0.5, row: spot.row - 0.5, kind: m.kind },
    grow,
    shadow,
    scale,
  );
  ctx.restore();
}
