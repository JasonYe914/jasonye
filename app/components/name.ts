import { GLYPH_H, GLYPH_W, SPACING, addBlockText } from "./blockLetters";
import { HALF_H, HALF_W, project } from "./iso";

/**
 * The name, one string per line. Lines run down-right along the columns.
 * The letters (blockLetters.ts) are set one unit per tile, so each is
 * GLYPH_W tiles wide and GLYPH_H tall, with SPACING tiles between them.
 */
const LINES = ["JASON", "YE"];

/**
 * Grid position of the name's top-left corner. Chosen so the chicken, which
 * starts on tile (0, 0), stands in the open floor to the right of the second
 * line.
 */
const ORIGIN = { col: -13, row: -7 };

/** Grid-space box of each line of the name. */
const LINE_BOXES = LINES.map((text, index) => {
  const r0 = ORIGIN.row + index * (GLYPH_H + SPACING);
  return {
    c0: ORIGIN.col,
    c1: ORIGIN.col + text.length * (GLYPH_W + SPACING) - SPACING,
    r0,
    r1: r0 + GLYPH_H,
  };
});

/**
 * Tiles the name sits on, with a tile to spare all round. World keeps these
 * in place for good, so the letters never hang over the fog.
 */
export const NAME_TILES = {
  c0: Math.min(...LINE_BOXES.map((box) => box.c0)) - 1,
  c1: Math.max(...LINE_BOXES.map((box) => box.c1)) + 1,
  r0: Math.min(...LINE_BOXES.map((box) => box.r0)) - 1,
  r1: Math.max(...LINE_BOXES.map((box) => box.r1)) + 1,
};

const corners = LINE_BOXES.flatMap((box) => [
  project(box.c0, box.r0),
  project(box.c1, box.r0),
  project(box.c1, box.r1),
  project(box.c0, box.r1),
]);
const left = Math.min(...corners.map((point) => point.x));
const right = Math.max(...corners.map((point) => point.x));
const top = Math.min(...corners.map((point) => point.y));
const bottom = Math.max(...corners.map((point) => point.y));

/** Screen point the home view is centred on: the middle of the name. */
export const HOME = { x: (left + right) / 2, y: (top + bottom) / 2 };

// Room left around the name, as a multiple of its size on screen.
const FIT_WIDTH = (right - left) * 1.2;
const FIT_HEIGHT = (bottom - top) * 1.3;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.15;

/** Scale at which the whole name fits a window of this size. */
export function fitZoom(width: number, height: number) {
  const fit = Math.min(width / FIT_WIDTH, height / FIT_HEIGHT);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit));
}

/*
 * Room for the home view once the intro is over: a little wider than the
 * intro's, so the view eases out a touch and hints at the floor beyond
 * the name, without pulling all the way back to take in every village.
 */
const OVERVIEW_WIDTH = (right - left) * 2;
const OVERVIEW_HEIGHT = (bottom - top) * 2.25;

/** Scale at which the name and the villages round it fit the window. */
export function overviewZoom(width: number, height: number) {
  const fit = Math.min(width / OVERVIEW_WIDTH, height / OVERVIEW_HEIGHT);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit));
}

export type NameColors = {
  /** Gradient stops, evenly spaced from the first letter to the last.
   *  One stop paints the letters solid. */
  ink: readonly string[];
  strong: string;
  mid: string;
  soft: string;
};

/** The letters' own extent in grid space, which the gradient spans. */
const TEXT_BOX = {
  c0: Math.min(...LINE_BOXES.map((box) => box.c0)),
  c1: Math.max(...LINE_BOXES.map((box) => box.c1)),
  r0: Math.min(...LINE_BOXES.map((box) => box.r0)),
  r1: Math.max(...LINE_BOXES.map((box) => box.r1)),
};

/** The middle of the lettering, in grid space. */
export const NAME_CENTER = {
  col: (TEXT_BOX.c0 + TEXT_BOX.c1) / 2,
  row: (TEXT_BOX.r0 + TEXT_BOX.r1) / 2,
};

/**
 * Grey floor tiles scattered through the gaps between the letters, as
 * [col, row] from the name's top-left corner.
 */
const ACCENTS: {
  color: "strong" | "mid" | "soft";
  at: [number, number];
}[] = [
  { color: "strong", at: [3, 3] },
  { color: "mid", at: [3, 4] },
  { color: "mid", at: [4, 4] },
  { color: "strong", at: [8, 4] },
  { color: "soft", at: [7, 5] },
  { color: "mid", at: [11, 2] },
  { color: "soft", at: [12, 4] },
  { color: "soft", at: [15, 1] },
];

/** Built on first use: Path2D only exists in the browser. */
let shapes: { solid: Path2D; cuts: Path2D } | null = null;

function buildShapes() {
  const solid = new Path2D();
  const cuts = new Path2D();
  // Filled with the even-odd rule, this is everywhere except the cuts.
  cuts.rect(
    NAME_TILES.c0,
    NAME_TILES.r0,
    NAME_TILES.c1 - NAME_TILES.c0,
    NAME_TILES.r1 - NAME_TILES.r0,
  );
  LINES.forEach((text, line) => {
    addBlockText(solid, cuts, text, ORIGIN.col, LINE_BOXES[line].r0);
  });
  return { solid, cuts };
}

/**
 * Paints the name and its accent tiles flat on the floor. Expects the
 * context to be in world space, as it is for the floor itself.
 */
export function drawName(ctx: CanvasRenderingContext2D, colors: NameColors) {
  ctx.save();
  // From here on, one unit is one tile and the axes are the grid's own, so
  // the letters lie on the floor and their curves foreshorten with it.
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  drawNameFlat(ctx, colors);
  ctx.restore();
}

/**
 * Paints the name and its accent tiles in grid space: one unit per tile,
 * columns to the right and rows downward. Seen this way, as on the
 * minimap, the name reads straight across.
 */
export function drawNameFlat(
  ctx: CanvasRenderingContext2D,
  colors: NameColors,
) {
  shapes ??= buildShapes();
  ctx.save();

  // The tiles between the letters take the name's own colours: its first
  // hue, its last, and a faint wash of the second.
  const tint = { strong: colors.ink[0], mid: colors.ink.at(-1), soft: colors.ink[1] ?? colors.ink[0] };
  for (const { color, at } of ACCENTS) {
    ctx.globalAlpha = color === "soft" ? 0.35 : 1;
    ctx.fillStyle = tint[color] ?? colors[color];
    ctx.fillRect(ORIGIN.col + at[0], ORIGIN.row + at[1], 1, 1);
  }
  ctx.globalAlpha = 1;

  // The gradient lies on the floor with the letters and runs the way they
  // read, from J to N, like the gradient headlines on Apple's pages. The
  // second line picks up the colours of the letters above it.
  const midRow = (TEXT_BOX.r0 + TEXT_BOX.r1) / 2;
  const ink = ctx.createLinearGradient(TEXT_BOX.c0, midRow, TEXT_BOX.c1, midRow);
  const last = Math.max(colors.ink.length - 1, 1);
  colors.ink.forEach((stop, index) => ink.addColorStop(index / last, stop));

  ctx.clip(shapes.cuts, "evenodd");
  ctx.fillStyle = ink;
  ctx.fill(shapes.solid);
  ctx.restore();
}
