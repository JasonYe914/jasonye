import { PLATE } from "./float";
import { sortBackToFront, type Box } from "./iso";
import { LOT, VILLAGES, lotOrigin, type Board, type Village } from "./villages";

/*
 * Turns each village into a few things on its lot, and no more: one large
 * image floating in the middle, a second smaller one layered over its back
 * corner when there is one, and three lines of text on the floor in front:
 * the name, a line of your own, the dates.
 *
 * Everything else a village knows (numbers, tools, points, links) lives in
 * its sheet, opened with E, rather than being built on the lot.
 */

export type ColorKey =
  | "accent"
  | "accent2"
  | "stone"
  | "roof"
  | "dark"
  | "paper"
  | "road"
  | "line"
  | "muted"
  | "z1"
  | "z2"
  | "z3"
  | "plaza"
  | "stall"
  | "gold"
  | "red"
  | "blue"
  | "glass"
  | "good";

export type InkKey = "ink" | "muted" | "accent";

/** Something floating, drawn in depth order with the chicken. */
export type Solid =
  | { kind: "box"; box: Box; color: ColorKey }
  /** `turned`: the picture is laid a quarter turn round, its top edge to the left. */
  | {
      kind: "board";
      box: Box;
      board: Board;
      turned?: boolean;
      /** Spun round on the floor (radians), so it needn't run with the grid. */
      spin?: number;
    };

/** Something lying on the floor, drawn before anything floats over it. */
export type Flat =
  | { kind: "slab"; box: Box; color: ColorKey }
  | {
      kind: "text";
      col: number;
      row: number;
      z: number;
      size: number;
      text: string;
      color: InkKey;
    };

type Area = { c0: number; c1: number; r0: number; r1: number };

/** A place that shows a fact when the chicken stands beside it. */
export type Spot = {
  id: string;
  type: "intro" | "board";
  title: string;
  text: string;
  /** World grid area, and how far round it still counts as beside it. */
  area: Area;
  reach: number;
};

export type VillagePlan = {
  village: Village;
  /** World grid position of the lot's top-left corner. */
  col: number;
  row: number;
  flats: Flat[];
  /** Back to front, without the chicken. */
  solids: Solid[];
  spots: Spot[];
  /** The open floor in front of the images, where the summary shows. */
  plaza: Area;
  /** Tiles the chicken can't step onto, as "col,row". */
  blocked: Set<string>;
};

/** Mono glyphs are about this wide, as a share of the font size. */
const GLYPH = 0.6;
/** How high the main image floats, and the second one above it. */
/** How much higher the second image floats than the first. */
const SECOND_RISE = 0.6;

/**
 * How each village sets out its main image, so no two lots look alike: its
 * size, whether it is turned a quarter round (so a wide picture runs the
 * other way across the floor), how far it sits off centre, in columns,
 * and how high it floats.
 */
type Variant = {
  scale: number;
  turn: boolean;
  shift: number;
  lift: number;
  /**
   * Set the other images beside the main one, in a staggered column to its
   * right, rather than layering one over its back corner.
   */
  sides?: boolean;
  /** The size of the images beside it, as a share of a main one's. */
  sideScale?: number;
  /**
   * Lay the second image the same way round as the main one, rather than
   * a quarter turn the other way: for a logo, which has to read upright.
   */
  stackParallel?: boolean;
  /**
   * Or place the other images freely, one entry each: where their middle
   * is on the lot, their size as a share of a main one's, how far they
   * are spun on the floor (degrees), and how high they float.
   */
  scatter?: { col: number; row: number; scale: number; spin: number; lift: number }[];
};

const VARIANTS: Record<Village["id"], Variant> = {
  queens: { scale: 1, turn: false, shift: -3, lift: 1.1, sides: true },
  // Not turned: a logo has to read the right way round.
  qadt: { scale: 0.9, turn: false, shift: 1.5, lift: 0.9 },
  playtoon: { scale: 1, turn: false, shift: 0.5, lift: 1.0 },
  // Not turned: an app icon sits upright.
  getinto: { scale: 0.9, turn: false, shift: -1, lift: 1.2 },
  // Not turned: the roadmap reads left to right. The logo sits beside it.
  // Not turned: the roadmap reads left to right. Its logo is stacked over
  // the back corner like GoFleet's second image, but kept upright.
  wayfinder: { scale: 1.65, turn: false, shift: 0, lift: 0.8, stackParallel: true },
  gofleet: { scale: 1.2, turn: false, shift: -0.5, lift: 0.9 },
  zendu: { scale: 0.85, turn: false, shift: 1.5, lift: 1.1 },
  // Not turned: the sign-in form has to read the right way round.
  bankview: { scale: 1.7, turn: false, shift: -1.5, lift: 1.0 },
  // Not turned: the top view's grid has to run with the floor's.
  engine: { scale: 1.1, turn: false, shift: -4, lift: 1.0, sides: true, sideScale: 1.35 },
};
/** The second image's size, as a share of the size it would have as the main one. */
const SECOND_SCALE = 0.55;
/** Images set beside the main one: their size as a share of a main one's,
 *  the gap between them, and how much higher each floats than the last. */
const SIDE_SCALE = 0.72;
const SIDE_GAP = 0.7;
const SIDE_RISE = 0.35;
/** The main image's front edge, in lot rows. The text sits in front of it. */
const HERO_FRONT = 8.5;
/** How far in from the lot's edge anything may reach. */
const MARGIN = 0.5;

/** The size of the village's name on the floor. */
const NAME_SIZE = 0.8;

function textWidth(text: string, size: number) {
  return text.length * GLYPH * size;
}

/**
 * An image's size in tiles: from its own proportions when it gives them,
 * otherwise from its kind. At most 8 across.
 */
function boardSize(board: Board | undefined) {
  if (board?.aspect) {
    const w = Math.min(8, Math.sqrt(30 * board.aspect));
    return { w, d: w / board.aspect };
  }
  switch (board?.kind) {
    case "portrait":
      return { w: 2.8, d: 5 };
    case "form":
      return { w: 5, d: 3.3 };
    case "photo":
      return { w: 6.4, d: 4.8 };
    default:
      return { w: 8, d: 4.5 };
  }
}

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function planVillage(village: Village): VillagePlan {
  const origin = lotOrigin(village);
  const oc = origin.col;
  const or = origin.row;
  const flats: Flat[] = [];
  const solids: Solid[] = [];
  const spots: Spot[] = [];

  /** Moves a lot-space area into the world. */
  const place = (a: Area): Area => ({
    c0: a.c0 + oc,
    c1: a.c1 + oc,
    r0: a.r0 + or,
    r1: a.r1 + or,
  });
  const write = (c: number, r: number, text: string, size: number, color: InkKey) =>
    flats.push({ kind: "text", col: c + oc, row: r + or, z: 0, size, text, color });
  const board = (b: Board, area: Area, lift: number, turned: boolean, spin?: number) =>
    solids.push({
      kind: "board",
      board: b,
      turned,
      spin,
      box: { ...place(area), z0: lift - PLATE, z1: lift },
    });
  const spot = (id: string, type: Spot["type"], title: string, text: string, area: Area, reach = 1) =>
    spots.push({ id, type, title, text, reach, area: place(area) });

  // The main image, set out by the village's variant: about the middle of
  // the lot, with its front edge at HERO_FRONT unless it is too deep to fit.
  const variant = VARIANTS[village.id];
  const [first, ...rest] = village.boards;
  const shape = boardSize(first);
  const heroW = (variant.turn ? shape.d : shape.w) * variant.scale;
  const heroD = (variant.turn ? shape.w : shape.d) * variant.scale;
  const heroC0 = Math.min(
    Math.max(LOT / 2 - heroW / 2 + variant.shift, MARGIN),
    LOT - MARGIN - heroW,
  );
  const heroR0 = Math.max(HERO_FRONT - heroD, MARGIN);
  const hero: Area = { c0: heroC0, c1: heroC0 + heroW, r0: heroR0, r1: heroR0 + heroD };
  const heroLift = variant.lift;
  if (first) {
    board(first, hero, heroLift, variant.turn);
    spot("board-0", "board", sentenceCase(first.caption), first.detail, hero);
  }

  // The second image, smaller and higher, laid over the main one's back
  // corner so the two read as a stack of prints.
  const second = variant.sides || variant.scatter ? undefined : rest[0];
  if (second) {
    const size = boardSize(second);
    // Turned the other way from the main one, for a little contrast,
    // unless it has to stay the same way round.
    const across = variant.stackParallel ? !variant.turn : variant.turn;
    const w = (across ? size.w : size.d) * SECOND_SCALE;
    const d = (across ? size.d : size.w) * SECOND_SCALE;
    const c1 = Math.min(hero.c1 + w - 1.4, LOT - MARGIN);
    const r0 = Math.max(hero.r0 - d + 1.4, MARGIN);
    const area = { c0: c1 - w, c1, r0, r1: r0 + d };
    board(
      second,
      area,
      heroLift + SECOND_RISE,
      variant.stackParallel ? variant.turn : !variant.turn,
    );
    spot("board-1", "board", sentenceCase(second.caption), second.detail, area);
  }

  // Or each set where the variant says, at its own angle.
  variant.scatter?.forEach((at, i) => {
    const b = rest[i];
    if (!b) return;
    const size = boardSize(b);
    const w = size.w * at.scale;
    const d = size.d * at.scale;
    const area = { c0: at.col - w / 2, c1: at.col + w / 2, r0: at.row - d / 2, r1: at.row + d / 2 };
    board(b, area, at.lift, false, (at.spin * Math.PI) / 180);
    spot(`board-${i + 1}`, "board", sentenceCase(b.caption), b.detail, area);
  });

  // Or the rest beside it: a column to its right, centred on it, each one
  // nudged off the line and floating a little higher than the last.
  if (variant.sides && rest.length > 0) {
    const sizes = rest.map((b) => {
      const size = boardSize(b);
      const scale = variant.sideScale ?? SIDE_SCALE;
      return { w: size.w * scale, d: size.d * scale };
    });
    const total = sizes.reduce((sum, size) => sum + size.d, 0) + SIDE_GAP * (sizes.length - 1);
    let r = Math.min(
      Math.max((hero.r0 + hero.r1) / 2 - total / 2, MARGIN),
      LOT - MARGIN - total,
    );
    rest.forEach((b, i) => {
      const { w, d } = sizes[i];
      const c0 = Math.min(hero.c1 + SIDE_GAP + (i % 2) * 0.6, LOT - MARGIN - w);
      const area = { c0, c1: c0 + w, r0: r, r1: r + d };
      board(b, area, heroLift + SIDE_RISE * (i + 1), false);
      spot(`board-${i + 1}`, "board", sentenceCase(b.caption), b.detail, area);
      r += d + SIDE_GAP;
    });
  }

  // Just the name, in front of the main image, lined up under its
  // front-left corner. The rest is in the details (E).
  const lines: [string, number, InkKey][] = [[village.short, NAME_SIZE, "accent"]];
  const widest = Math.max(...lines.map(([text, size]) => textWidth(text, size)));
  const textCol = Math.max(MARGIN, Math.min(hero.c0, LOT - MARGIN - widest));
  let row = hero.r1 + 1.1;
  for (const [text, size, color] of lines) {
    row += size;
    write(textCol, row, text, size, color);
    row += size * 0.9 + 0.3;
  }
  spot(
    "intro",
    "intro",
    village.name,
    `${village.role} · ${village.dates} · ${village.place}`,
    { c0: textCol, c1: textCol + widest, r0: hero.r1 + 1.1, r1: row },
    0.6,
  );

  // The chicken never walks under an image.
  const blocked = new Set<string>();
  for (const solid of solids) {
    const b = solid.box;
    for (let c = Math.floor(b.c0 + 1e-6); c < Math.ceil(b.c1 - 1e-6); c++) {
      for (let r = Math.floor(b.r0 + 1e-6); r < Math.ceil(b.r1 - 1e-6); r++) {
        blocked.add(`${c},${r}`);
      }
    }
  }

  return {
    village,
    col: oc,
    row: or,
    flats,
    solids: sortBackToFront(solids),
    spots,
    plaza: place({ c0: MARGIN, c1: LOT - MARGIN, r0: hero.r1, r1: LOT }),
    blocked,
  };
}

export const PLANS: VillagePlan[] = VILLAGES.map(planVillage);

/** The village whose lot contains the tile (col, row), if any. */
export function planAt(col: number, row: number) {
  return (
    PLANS.find(
      (plan) =>
        col >= plan.col &&
        col < plan.col + LOT &&
        row >= plan.row &&
        row < plan.row + LOT,
    ) ?? null
  );
}

export function isBlocked(col: number, row: number) {
  const plan = planAt(col, row);
  return plan ? plan.blocked.has(`${col},${row}`) : false;
}

/** What the chicken is beside on tile (col, row) of a village, if anything. */
export function spotAt(plan: VillagePlan, col: number, row: number) {
  const x = col + 0.5;
  const y = row + 0.5;
  let best: Spot | null = null;
  let bestDistance = Infinity;
  for (const spot of plan.spots) {
    const dx = Math.max(spot.area.c0 - x, 0, x - spot.area.c1);
    const dy = Math.max(spot.area.r0 - y, 0, y - spot.area.r1);
    const distance = Math.hypot(dx, dy);
    if (distance <= spot.reach && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

export function onPlaza(plan: VillagePlan, col: number, row: number) {
  return (
    col >= plan.plaza.c0 &&
    col < plan.plaza.c1 &&
    row >= plan.plaza.r0 &&
    row < plan.plaza.r1
  );
}
