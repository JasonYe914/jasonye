import { HALF_H, HALF_W, project } from "./iso";

/** The name, one string per line. Lines run down-right along the columns. */
const LINES = ["JASON", "YE"];

/** Every letter fills a box this many tiles wide and tall. */
const GLYPH_W = 3;
const GLYPH_H = 4;
/** Empty tiles between letters, and between lines. */
const SPACING = 1;
/** Width of the thin cuts that stand in for a letter's counters, in tiles. */
const SLIT = 0.3;
/** Radius of the big curves: half a letter, so a rounded end is a semicircle. */
const ROUND = GLYPH_W / 2;
/** How far a cut that opens on a letter's edge overshoots that edge. */
const OVERSHOOT = 0.5;

/**
 * Grid position of the name's top-left corner. Chosen so the chicken, which
 * starts on tile (0, 0), stands in the open floor to the right of the second
 * line.
 */
const ORIGIN = { col: -13, row: -7 };

/**
 * Draws one letter with its top-left corner at (x, y) in grid space: the
 * black shape goes into `solid`, and the cuts taken out of it into `cuts`.
 * Cuts must not touch or overlap one another.
 */
type Glyph = (solid: Path2D, cuts: Path2D, x: number, y: number) => void;

/** A vertical cut centred on the letter, from y0 down to y1. */
function slitDown(cuts: Path2D, x: number, y0: number, y1: number) {
  cuts.roundRect(x + (GLYPH_W - SLIT) / 2, y0, SLIT, y1 - y0, SLIT / 2);
}

/** A horizontal cut from x0 across to x1, with its top edge at y. */
function slitAcross(cuts: Path2D, x0: number, x1: number, y: number) {
  cuts.roundRect(x0, y, x1 - x0, SLIT, SLIT / 2);
}

// Where the two horizontal cuts sit so they split a letter into equal thirds.
const ARM = (GLYPH_H - 2 * SLIT) / 3;
const UPPER_CUT = ARM;
const LOWER_CUT = 2 * ARM + SLIT;

const GLYPHS: Record<string, Glyph> = {
  // A bowl with its left arm cut short.
  J(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, 0, ROUND, ROUND]);
    const slitLeft = x + (GLYPH_W - SLIT) / 2;
    const slitRight = slitLeft + SLIT;
    const armTop = y + 2;
    const slitEnd = y + 2.7;
    cuts.moveTo(x - OVERSHOOT, y - OVERSHOOT);
    cuts.lineTo(slitRight, y - OVERSHOOT);
    cuts.lineTo(slitRight, slitEnd - SLIT / 2);
    cuts.arc(x + GLYPH_W / 2, slitEnd - SLIT / 2, SLIT / 2, 0, Math.PI);
    cuts.lineTo(slitLeft, armTop);
    cuts.lineTo(x - OVERSHOOT, armTop);
    cuts.closePath();
  },
  // An arch whose cut is interrupted by the crossbar.
  A(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, ROUND, 0, 0]);
    slitDown(cuts, x, y + 1.4, y + 2.3);
    slitDown(cuts, x, y + 2.9, y + GLYPH_H + OVERSHOOT);
  },
  S(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    slitAcross(cuts, x + 1, x + GLYPH_W + OVERSHOOT, y + UPPER_CUT);
    slitAcross(cuts, x - OVERSHOOT, x + GLYPH_W - 1, y + LOWER_CUT);
  },
  O(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    slitDown(cuts, x, y + 1.4, y + GLYPH_H - 1.4);
  },
  N(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, ROUND, 0, 0]);
    slitDown(cuts, x, y + 1.5, y + GLYPH_H + OVERSHOOT);
  },
  // A bowl standing on a stem.
  Y(solid, cuts, x, y) {
    const stem = (GLYPH_W - SLIT) / 2;
    solid.roundRect(x, y, GLYPH_W, 2.7, [0, 0, ROUND, ROUND]);
    solid.rect(x + (GLYPH_W - stem) / 2, y + 2, stem, GLYPH_H - 2);
    slitDown(cuts, x, y - OVERSHOOT, y + 1.5);
  },
  E(solid, cuts, x, y) {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, 0, 0, ROUND]);
    slitAcross(cuts, x + 1.2, x + GLYPH_W + OVERSHOOT, y + UPPER_CUT);
    slitAcross(cuts, x + 1.2, x + GLYPH_W + OVERSHOOT, y + LOWER_CUT);
  },
};

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

export type NameColors = {
  /** Gradient stops, evenly spaced from the first letter to the last. */
  ink: readonly string[];
  orange: string;
  blue: string;
  sky: string;
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
 * Coloured floor tiles scattered through the gaps between the letters, as
 * [col, row] from the name's top-left corner.
 */
const ACCENTS: {
  color: "orange" | "blue" | "sky";
  at: [number, number];
}[] = [
  { color: "blue", at: [3, 3] },
  { color: "orange", at: [3, 4] },
  { color: "orange", at: [4, 4] },
  { color: "blue", at: [8, 4] },
  { color: "sky", at: [7, 5] },
  { color: "orange", at: [11, 2] },
  { color: "sky", at: [12, 4] },
  { color: "sky", at: [15, 1] },
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
    [...text].forEach((letter, index) => {
      GLYPHS[letter](
        solid,
        cuts,
        ORIGIN.col + index * (GLYPH_W + SPACING),
        LINE_BOXES[line].r0,
      );
    });
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

  for (const { color, at } of ACCENTS) {
    ctx.fillStyle = colors[color];
    ctx.fillRect(ORIGIN.col + at[0], ORIGIN.row + at[1], 1, 1);
  }

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
