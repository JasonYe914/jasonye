/*
 * The blocky lettering of the name, as an alphabet. Every letter is one
 * solid block with rounded corners where it curves, and thin cuts taken out
 * of it where a pen letter would have strokes or a counter. A cut that opens
 * onto the letter's edge runs on past it, so the opening is clean.
 *
 * The name (name.ts) is set in these, and so are the villages' headings
 * (villageDraw.ts). Units: a letter is GLYPH_H tall; most are GLYPH_W wide.
 */

/** Most letters fill a box this wide and this tall. */
export const GLYPH_W = 3;
export const GLYPH_H = 4;
/** Empty space between letters, and between lines. */
export const SPACING = 1;
/** Width of the thin cuts that stand in for a letter's counters. */
const SLIT = 0.3;
/** Radius of the big curves: half a letter, so a rounded end is a semicircle. */
const ROUND = GLYPH_W / 2;
/** How far a cut that opens on a letter's edge overshoots that edge. */
const OVERSHOOT = 0.5;

// Where the two horizontal cuts sit so they split a letter into equal thirds.
const ARM = (GLYPH_H - 2 * SLIT) / 3;
const UPPER_CUT = ARM;
const LOWER_CUT = 2 * ARM + SLIT;
/** The top of a cut across the middle of a letter. */
const MID_CUT = (GLYPH_H - SLIT) / 2;
/** A stem as wide as the Y's: half a letter less a cut. */
const STEM = (GLYPH_W - SLIT) / 2;

/**
 * Draws one letter with its top-left corner at (x, y): the shape goes into
 * `solid`, and the cuts taken out of it into `cuts`. Cuts must not touch or
 * overlap one another.
 */
type Draw = (solid: PathSink, cuts: PathSink, x: number, y: number) => void;

/** The few Path2D calls the letters use, so they can be drawn into SVG too. */
export interface PathSink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, start: number, end: number): void;
  closePath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  roundRect(x: number, y: number, w: number, h: number, radii?: number | number[]): void;
}
type Letter = { w: number; draw: Draw };

/** A vertical cut centred on a GLYPH_W-wide letter, from y0 down to y1. */
function slitDown(cuts: PathSink, x: number, y0: number, y1: number) {
  cuts.roundRect(x + (GLYPH_W - SLIT) / 2, y0, SLIT, y1 - y0, SLIT / 2);
}

/** A vertical cut centred on cx, from y0 down to y1. */
function slitAt(cuts: PathSink, cx: number, y0: number, y1: number) {
  cuts.roundRect(cx - SLIT / 2, y0, SLIT, y1 - y0, SLIT / 2);
}

/** A horizontal cut from x0 across to x1, with its top edge at y. */
function slitAcross(cuts: PathSink, x0: number, x1: number, y: number) {
  cuts.roundRect(x0, y, x1 - x0, SLIT, SLIT / 2);
}

/** A closed polygon. Solids are given clockwise, like roundRect, so overlaps add. */
function polygon(path: PathSink, points: [number, number][]) {
  points.forEach(([px, py], i) => (i === 0 ? path.moveTo(px, py) : path.lineTo(px, py)));
  path.closePath();
}

const full = (draw: Draw): Letter => ({ w: GLYPH_W, draw });

const LETTERS: Record<string, Letter> = {
  // ---- The name's own letters, as first drawn for it.

  // A bowl with its left arm cut short.
  J: full((solid, cuts, x, y) => {
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
  }),
  // An arch whose cut is interrupted by the crossbar.
  A: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, ROUND, 0, 0]);
    slitDown(cuts, x, y + 1.4, y + 2.3);
    slitDown(cuts, x, y + 2.9, y + GLYPH_H + OVERSHOOT);
  }),
  S: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    slitAcross(cuts, x + 1, x + GLYPH_W + OVERSHOOT, y + UPPER_CUT);
    slitAcross(cuts, x - OVERSHOOT, x + GLYPH_W - 1, y + LOWER_CUT);
  }),
  O: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    slitDown(cuts, x, y + 1.4, y + GLYPH_H - 1.4);
  }),
  N: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, ROUND, 0, 0]);
    slitDown(cuts, x, y + 1.5, y + GLYPH_H + OVERSHOOT);
  }),
  // A bowl standing on a stem.
  Y: full((solid, cuts, x, y) => {
    const stem = (GLYPH_W - SLIT) / 2;
    solid.roundRect(x, y, GLYPH_W, 2.7, [0, 0, ROUND, ROUND]);
    solid.rect(x + (GLYPH_W - stem) / 2, y + 2, stem, GLYPH_H - 2);
    slitDown(cuts, x, y - OVERSHOOT, y + 1.5);
  }),
  E: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, 0, 0, ROUND]);
    slitAcross(cuts, x + 1.2, x + GLYPH_W + OVERSHOOT, y + UPPER_CUT);
    slitAcross(cuts, x + 1.2, x + GLYPH_W + OVERSHOOT, y + LOWER_CUT);
  }),

  // ---- The rest of the alphabet, in the same manner.

  // Square-backed, with two closed counters and a pinch on the right.
  B: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, 1.3, 1.3, 0]);
    slitAt(cuts, x + GLYPH_W / 2, y + 0.75, y + 1.55);
    slitAt(cuts, x + GLYPH_W / 2, y + 2.45, y + 3.25);
    slitAcross(cuts, x + 2.55, x + GLYPH_W + OVERSHOOT, y + MID_CUT);
  }),
  // A round block with a wide mouth open to the right.
  C: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    cuts.roundRect(x + 1.5, y + 1.45, GLYPH_W - 1.5 + OVERSHOOT, 1.1, [0.55, 0, 0, 0.55]);
  }),
  // An O with a square back.
  D: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, ROUND, ROUND, 0]);
    slitDown(cuts, x, y + 1.3, y + GLYPH_H - 1.3);
  }),
  // An E whose lower arm is taken away.
  F: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, 0, 0, 0]);
    slitAcross(cuts, x + 1.2, x + GLYPH_W + OVERSHOOT, y + UPPER_CUT);
    cuts.roundRect(
      x + 1.2,
      y + LOWER_CUT,
      GLYPH_W - 1.2 + OVERSHOOT,
      GLYPH_H - LOWER_CUT + OVERSHOOT,
      [SLIT / 2, 0, 0, 0],
    );
  }),
  // A C whose mouth sits high, over a closed lower jaw with its spur.
  G: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, ROUND, 0.6, ROUND]);
    cuts.roundRect(x + 1.35, y + 1.2, GLYPH_W - 1.35 + OVERSHOOT, 0.7, [0.35, 0, 0, 0.35]);
    slitAcross(cuts, x + 1.35, x + 2.25, y + 2.45);
  }),
  // Two posts joined across the middle.
  H: full((solid, cuts, x, y) => {
    solid.rect(x, y, GLYPH_W, GLYPH_H);
    slitDown(cuts, x, y - OVERSHOOT, y + 1.5);
    slitDown(cuts, x, y + 2.5, y + GLYPH_H + OVERSHOOT);
  }),
  I: {
    w: 1.2,
    draw(solid, _cuts, x, y) {
      solid.rect(x, y, 1.2, GLYPH_H);
    },
  },
  // A post, cut free of a wedge opening to the right.
  K: full((solid, cuts, x, y) => {
    solid.rect(x, y, GLYPH_W, GLYPH_H);
    slitAt(cuts, x + 1.15, y - OVERSHOOT, y + GLYPH_H + OVERSHOOT);
    polygon(cuts, [
      [x + GLYPH_W + OVERSHOOT, y + 0.9],
      [x + 1.75, y + GLYPH_H / 2],
      [x + GLYPH_W + OVERSHOOT, y + GLYPH_H - 0.9],
    ]);
  }),
  // A post on a rounded foot.
  L: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, 0, 0, ROUND]);
    cuts.roundRect(x + 1.25, y - OVERSHOOT, GLYPH_W - 1.25 + OVERSHOOT, 2.75 + OVERSHOOT, [0, 0, 0, SLIT / 2]);
  }),
  // A wide N with a third leg and a notch between its two humps.
  M: {
    w: 4,
    draw(solid, cuts, x, y) {
      solid.roundRect(x, y, 4, GLYPH_H, [1.3, 1.3, 0, 0]);
      slitAt(cuts, x + 1.3, y + 1.5, y + GLYPH_H + OVERSHOOT);
      slitAt(cuts, x + 2.7, y + 1.5, y + GLYPH_H + OVERSHOOT);
      slitAt(cuts, x + 2, y - OVERSHOOT, y + 1);
    },
  },
  // A rounded bowl on a stem, as the Y stands on one.
  P: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, 2.7, [0, ROUND, ROUND, 0]);
    solid.rect(x, y + 2, STEM, GLYPH_H - 2);
    slitDown(cuts, x, y + 0.95, y + 1.75);
  }),
  // An O whose square corner is notched from the side, so it kicks out
  // as a tail.
  Q: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, ROUND, 0, ROUND]);
    slitDown(cuts, x, y + 1.3, y + 2.5);
    slitAcross(cuts, x + 2.1, x + GLYPH_W + OVERSHOOT, y + 2.95);
  }),
  // A P that keeps its leg.
  R: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, ROUND, 0, 0]);
    slitDown(cuts, x, y + 0.85, y + 1.65);
    slitDown(cuts, x, y + 2.5, y + GLYPH_H + OVERSHOOT);
  }),
  // A bar on a stem.
  T: full((solid, _cuts, x, y) => {
    solid.rect(x, y, GLYPH_W, 1.3);
    solid.rect(x + (GLYPH_W - STEM) / 2, y + 1, STEM, GLYPH_H - 1);
  }),
  // An upturned arch.
  U: full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [0, 0, ROUND, ROUND]);
    slitDown(cuts, x, y - OVERSHOOT, y + 2.6);
  }),
  // A U come to a point.
  V: full((solid, cuts, x, y) => {
    polygon(solid, [
      [x, y],
      [x + GLYPH_W, y],
      [x + GLYPH_W, y + 1.6],
      [x + GLYPH_W / 2, y + GLYPH_H],
      [x, y + 1.6],
    ]);
    slitDown(cuts, x, y - OVERSHOOT, y + 2.2);
  }),
  // An M turned over.
  W: {
    w: 4,
    draw(solid, cuts, x, y) {
      solid.roundRect(x, y, 4, GLYPH_H, [0, 0, 1.3, 1.3]);
      slitAt(cuts, x + 1.3, y - OVERSHOOT, y + 2.5);
      slitAt(cuts, x + 2.7, y - OVERSHOOT, y + 2.5);
      slitAt(cuts, x + 2, y + 3, y + GLYPH_H + OVERSHOOT);
    },
  },
  // A block with a wedge taken from each side.
  X: full((solid, cuts, x, y) => {
    solid.rect(x, y, GLYPH_W, GLYPH_H);
    polygon(cuts, [[x + 0.85, y - OVERSHOOT], [x + 2.15, y - OVERSHOOT], [x + 1.5, y + 1.45]]);
    polygon(cuts, [[x + 0.85, y + GLYPH_H + OVERSHOOT], [x + 2.15, y + GLYPH_H + OVERSHOOT], [x + 1.5, y + 2.55]]);
    polygon(cuts, [[x - OVERSHOOT, y + 0.95], [x + 0.75, y + 2], [x - OVERSHOOT, y + 3.05]]);
    polygon(cuts, [[x + GLYPH_W + OVERSHOOT, y + 0.95], [x + 2.25, y + 2], [x + GLYPH_W + OVERSHOOT, y + 3.05]]);
  }),
  // The S's cuts mirrored, on a square block.
  Z: full((solid, cuts, x, y) => {
    solid.rect(x, y, GLYPH_W, GLYPH_H);
    slitAcross(cuts, x - OVERSHOOT, x + GLYPH_W - 1, y + UPPER_CUT);
    slitAcross(cuts, x + 1, x + GLYPH_W + OVERSHOOT, y + LOWER_CUT);
  }),

  // ---- Figures and marks.

  // Two closed counters, pinched in at the waist from both sides.
  "8": full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, ROUND);
    slitAt(cuts, x + GLYPH_W / 2, y + 0.8, y + 1.5);
    slitAt(cuts, x + GLYPH_W / 2, y + 2.5, y + 3.2);
    slitAcross(cuts, x - OVERSHOOT, x + 0.45, y + MID_CUT);
    slitAcross(cuts, x + GLYPH_W - 0.45, x + GLYPH_W + OVERSHOOT, y + MID_CUT);
  }),
  // A round block with a small ring engraved in it, its tail the square
  // corner. The ring is a cut with a hole in it: under the even-odd clip
  // its middle is filled again.
  "@": full((solid, cuts, x, y) => {
    solid.roundRect(x, y, GLYPH_W, GLYPH_H, [ROUND, ROUND, 0, ROUND]);
    const cx = x + GLYPH_W / 2;
    const cy = y + GLYPH_H / 2;
    cuts.moveTo(cx + 0.85, cy);
    cuts.arc(cx, cy, 0.85, 0, Math.PI * 2);
    cuts.closePath();
    cuts.moveTo(cx + 0.85 - SLIT, cy);
    cuts.arc(cx, cy, 0.85 - SLIT, 0, Math.PI * 2);
    cuts.closePath();
  }),
  "'": {
    w: 0.7,
    draw(solid, _cuts, x, y) {
      solid.roundRect(x, y, 0.7, 1.3, 0.35);
    },
  },
  "-": {
    w: 1.6,
    draw(solid, _cuts, x, y) {
      solid.roundRect(x, y + 1.6, 1.6, 0.8, 0.4);
    },
  },
  // An apostrophe set down on the line.
  ",": {
    w: 0.7,
    draw(solid, _cuts, x, y) {
      solid.roundRect(x, y + GLYPH_H - 1.3, 0.7, 1.3, [0.35, 0.35, 0.35, 0]);
    },
  },
  ".": {
    w: 0.8,
    draw(solid, _cuts, x, y) {
      solid.roundRect(x, y + GLYPH_H - 0.8, 0.8, 0.8, 0.4);
    },
  },
  " ": { w: 1.2, draw() {} },
};

/** The letter for `char`; anything without one is left as a space. */
function letterFor(char: string) {
  return LETTERS[char.toUpperCase()] ?? LETTERS[" "];
}

/** How wide `text` runs, in letter units (a letter is GLYPH_H tall). */
export function blockTextWidth(text: string) {
  const chars = [...text];
  if (chars.length === 0) return 0;
  return chars.reduce((sum, char) => sum + letterFor(char).w, 0) + SPACING * (chars.length - 1);
}

/**
 * Adds `text` to `solid` and `cuts` on one line, its top-left corner at
 * (x, y), in letter units. Returns how wide it ran.
 */
export function addBlockText(solid: PathSink, cuts: PathSink, text: string, x: number, y: number) {
  let at = x;
  [...text].forEach((char, i) => {
    if (i > 0) at += SPACING;
    const letter = letterFor(char);
    letter.draw(solid, cuts, at, y);
    at += letter.w;
  });
  return at - x;
}

/** Whether `text` can be set in these letters, every character of it. */
export function hasBlockLetters(text: string) {
  return [...text].every((char) => char.toUpperCase() in LETTERS);
}

/** Built shapes of a line of text, kept: Path2D only exists in the browser. */
const built = new Map<string, { solid: Path2D; cuts: Path2D; width: number }>();

/**
 * Paints `text` in `fill`, its top-left corner at (0, 0), one letter unit
 * per context unit. The cuts are clipped out with the even-odd rule
 * against a frame round the whole line, as the name's are.
 */
export function paintBlockText(ctx: CanvasRenderingContext2D, text: string, fill: string | CanvasGradient) {
  let shapes = built.get(text);
  if (!shapes) {
    const solid = new Path2D();
    const cuts = new Path2D();
    const width = blockTextWidth(text);
    cuts.rect(-1, -1, width + 2, GLYPH_H + 2);
    addBlockText(solid, cuts, text, 0, 0);
    shapes = { solid, cuts, width };
    built.set(text, shapes);
  }
  ctx.save();
  ctx.clip(shapes.cuts, "evenodd");
  ctx.fillStyle = fill;
  ctx.fill(shapes.solid);
  ctx.restore();
}
