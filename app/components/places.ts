import { cachedShadows, drawPlate, drawShadows, onPlate, plateBox, type PlateFills } from "./float";
import { TILE_SIDE, project, type Box } from "./iso";
import { stamp } from "./sprite";
import type { Actor, VillageInk } from "./villageDraw";

/*
 * Small places set into the open floor by hand: a beach volleyball court, a
 * basketball court, a library and a ramen shop. There are two of each, one
 * round the name and one out in a gap between villages, so they read as
 * part of the world rather than scattered about.
 *
 * Each is a single card floating over its patch of floor, with a soft
 * shadow beneath and a top-down drawing on its face: a court's lines, a
 * shelf of books, a bowl of ramen, and a small label on the floor in
 * front of it, like a note pinned to a drawing.
 *
 * Each is drawn in its own frame, w tiles along the columns and d along the
 * rows, with (0, 0) at its back corner.
 */

type PlaceKind = "volleyball" | "basketball" | "library" | "restaurant";

/** Paints a card's face, one unit per tile, `w` by `d`. */
type Art = (ctx: CanvasRenderingContext2D, w: number, d: number, ink: VillageInk) => void;

type Design = {
  label: string;
  /** The patch of floor it takes, in tiles. */
  w: number;
  d: number;
  /** How high the card floats. */
  lift: number;
  art: Art;
};

export type Place = Design & {
  id: string;
  kind: PlaceKind;
  /** World grid position of its back corner. */
  col: number;
  row: number;
};

/** How far the card sits in from the edge of its patch. */
const INSET = 0.15;

// ---------------------------------------------------------------------------
// Drawing helpers, in a card's face space.

function line(ctx: CanvasRenderingContext2D, points: [number, number][]) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** Text lying on the card, `size` tiles tall, starting at (x, y). */
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  ink: VillageInk,
  align: CanvasTextAlign = "left",
) {
  // Fonts misbehave at sizes under a pixel, so set large and scale down.
  const k = size / 20;
  ctx.save();
  ctx.scale(k, k);
  ctx.font = `600 20px ${ink.mono}`;
  ctx.textAlign = align;
  ctx.fillText(value, x / k, y / k);
  ctx.restore();
}

/** Line work in ink, with a faint wash of it for anything filled in. */
function pen(ctx: CanvasRenderingContext2D, ink: VillageInk, width: number) {
  ctx.strokeStyle = ink.ink;
  ctx.fillStyle = ink.ink;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function wash(ctx: CanvasRenderingContext2D, alpha: number, paint: () => void) {
  ctx.save();
  ctx.globalAlpha = alpha;
  paint();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The designs.

/** A court roped out on sand, the net across it, and a parasol from above. */
const volleyballArt: Art = (ctx, w, d, ink) => {
  pen(ctx, ink, 0.035);
  ctx.strokeRect(0.25, 0.25, 3.3, d - 0.5);
  // The net: a heavy line with its posts.
  ctx.lineWidth = 0.07;
  line(ctx, [[1.9, 0.1], [1.9, d - 0.1]]);
  circle(ctx, 1.9, 0.1, 0.07);
  ctx.fill();
  circle(ctx, 1.9, d - 0.1, 0.07);
  ctx.fill();
  // The ball, on the near side.
  ctx.lineWidth = 0.03;
  circle(ctx, 0.95, 1.2, 0.14);
  ctx.stroke();
  line(ctx, [[0.83, 1.13], [1.07, 1.27]]);
  // The parasol: eight panels, every other one shaded.
  const cx = w - 0.75;
  const cy = d / 2;
  const R = 0.55;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    const a1 = ((i + 1) / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    if (i % 2 === 0) wash(ctx, 0.85, () => ctx.fill());
    ctx.stroke();
  }
};

/** A hard court: its lines, the keys washed in, a hoop at each end. */
const basketballArt: Art = (ctx, w, d, ink) => {
  const top = 0.2;
  const bottom = d - 0.2;
  const mid = (top + bottom) / 2;
  pen(ctx, ink, 0.035);
  ctx.strokeRect(0.2, top, w - 0.4, bottom - top);
  line(ctx, [[w / 2, top], [w / 2, bottom]]);
  circle(ctx, w / 2, mid, 0.4);
  ctx.stroke();
  for (const [x, dir] of [[0.2, 1], [w - 0.2, -1]] as const) {
    const key = { x: dir > 0 ? x : x - 0.85, y: mid - 0.45, w: 0.85, h: 0.9 };
    wash(ctx, 0.14, () => ctx.fillRect(key.x, key.y, key.w, key.h));
    ctx.strokeRect(key.x, key.y, key.w, key.h);
    ctx.beginPath();
    ctx.arc(x + dir * 0.25, mid, 1.15, dir > 0 ? -1.15 : Math.PI - 1.15, dir > 0 ? 1.15 : Math.PI + 1.15);
    ctx.stroke();
    // The hoop, and its board.
    circle(ctx, x + dir * 0.3, mid, 0.13);
    ctx.stroke();
    ctx.lineWidth = 0.07;
    line(ctx, [[x + dir * 0.08, mid - 0.3], [x + dir * 0.08, mid + 0.3]]);
    ctx.lineWidth = 0.035;
  }
  // A ball left at half court.
  circle(ctx, w / 2 + 0.75, mid - 0.6, 0.13);
  ctx.fill();
};

/** A shelf of books, spines up, with the name across the top. */
const libraryArt: Art = (ctx, w, d, ink) => {
  pen(ctx, ink, 0.03);
  text(ctx, "LIBRARY", w / 2, 0.5, 0.3, ink, "center");
  line(ctx, [[0.25, 0.68], [w - 0.25, 0.68]]);
  // Three shelves, each a row of spines of differing heights and weights.
  const heights = [0.62, 0.5, 0.7, 0.55, 0.66, 0.44, 0.6, 0.52, 0.68, 0.48];
  for (let shelf = 0; shelf < 3; shelf++) {
    const base = 1.45 + shelf * 0.68;
    let x = 0.3;
    let i = shelf * 3;
    while (x < w - 0.4) {
      const width = 0.12 + ((i * 7) % 4) * 0.03;
      const h = heights[i % heights.length] * 0.85;
      if (i % 3 === 1) wash(ctx, 0.85, () => ctx.fillRect(x, base - h, width, h));
      else ctx.strokeRect(x, base - h, width, h);
      x += width + 0.05;
      i++;
    }
    line(ctx, [[0.25, base + 0.02], [w - 0.25, base + 0.02]]);
  }
};

/** A bowl of ramen from above, chopsticks across it, and the shop's name. */
const ramenArt: Art = (ctx, w, d, ink) => {
  const cx = w / 2;
  const cy = d / 2 - 0.25;
  pen(ctx, ink, 0.04);
  circle(ctx, cx, cy, 0.95);
  ctx.stroke();
  circle(ctx, cx, cy, 0.8);
  wash(ctx, 0.12, () => ctx.fill());
  ctx.lineWidth = 0.025;
  // Noodles, as a few loose curves.
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 0.55, cy - 0.3 + i * 0.18);
    ctx.bezierCurveTo(cx - 0.2, cy - 0.5 + i * 0.18, cx + 0.1, cy - 0.05 + i * 0.18, cx + 0.5, cy - 0.25 + i * 0.18);
    ctx.stroke();
  }
  // Half an egg and a sheet of nori.
  circle(ctx, cx + 0.38, cy + 0.38, 0.2);
  ctx.stroke();
  circle(ctx, cx + 0.38, cy + 0.38, 0.09);
  ctx.fill();
  ctx.fillRect(cx - 0.62, cy - 0.15, 0.22, 0.55);
  // Chopsticks, resting across the rim.
  ctx.lineWidth = 0.05;
  line(ctx, [[cx - 1.1, cy - 0.85], [cx + 1.05, cy + 0.2]]);
  line(ctx, [[cx - 1.0, cy - 1.0], [cx + 1.15, cy + 0.05]]);
  text(ctx, "RAMEN", cx, d - 0.35, 0.32, ink, "center");
};

const DESIGNS: Record<PlaceKind, Design> = {
  volleyball: { label: "volleyball", w: 5, d: 3, lift: 0.45, art: volleyballArt },
  basketball: { label: "basketball", w: 5, d: 4, lift: 0.4, art: basketballArt },
  library: { label: "library", w: 3, d: 3, lift: 0.7, art: libraryArt },
  restaurant: { label: "ramen", w: 3, d: 4, lift: 0.6, art: ramenArt },
};

/**
 * Where they stand, by back corner. One of each sits round the name; the
 * other is out in a corner gap between villages, so exploring turns up
 * the same four places again rather than a scatter of things.
 */
const SITES: [PlaceKind, number, number][] = [
  // Taken out of the world for now. Uncomment to bring them back; the
  // designs above are kept as they were.
  // ["library", -26, -12],
  // ["volleyball", -27, 4],
  // ["basketball", 15, -12],
  // ["restaurant", 16, 4],
  // ["basketball", -42, -34],
  // ["restaurant", 34, -30],
  // ["volleyball", 33, 31],
  // ["library", -41, 27],
];

export const PLACES: Place[] = SITES.map(([kind, col, row], index) => ({
  ...DESIGNS[kind],
  id: `${kind}-${index}`,
  kind,
  col,
  row,
}));

/** The card's footprint, in world grid space. */
function cardBox(place: Place): Box {
  return {
    c0: place.col + INSET,
    c1: place.col + place.w - INSET,
    r0: place.row + INSET,
    r1: place.row + place.d - INSET,
    z0: 0,
    z1: 0,
  };
}

// The whole patch is blocked, so the chicken never stands under a card.
const BLOCKED = new Set(
  PLACES.flatMap((place) => {
    const tiles: string[] = [];
    for (let c = 0; c < place.w; c++) {
      for (let r = 0; r < place.d; r++) tiles.push(`${place.col + c},${place.row + r}`);
    }
    return tiles;
  }),
);

/** Whether a place covers tile (col, row). */
export function placeBlocks(col: number, row: number) {
  return BLOCKED.has(`${col},${row}`);
}

/** Whether tile (col, row) is within `margin` tiles of any place. */
export function nearPlace(col: number, row: number, margin: number) {
  return PLACES.some(
    (place) =>
      col >= place.col - margin &&
      col < place.col + place.w + margin &&
      row >= place.row - margin &&
      row < place.row + place.d + margin,
  );
}

/** The tile in the middle of a place, which it pops up with. */
export function placeMiddle(place: Place) {
  return {
    col: place.col + Math.floor(place.w / 2),
    row: place.row + Math.floor(place.d / 2),
  };
}

/** Whether the actor is on or right beside a place. */
export function actorNear(place: Place, actor: Box) {
  return (
    actor.c1 >= place.col - 1.5 &&
    actor.c0 <= place.col + place.w + 1.5 &&
    actor.r1 >= place.row - 1.5 &&
    actor.r0 <= place.row + place.d + 1.5
  );
}

/** Every place overlapping the screen-space area. */
export function placesIn(area: { x0: number; x1: number; y0: number; y1: number }) {
  return PLACES.filter((place) => {
    const corners = [
      project(place.col, place.row),
      project(place.col + place.w, place.row),
      project(place.col + place.w, place.row + place.d),
      project(place.col, place.row + place.d),
    ];
    const x0 = Math.min(...corners.map((p) => p.x));
    const x1 = Math.max(...corners.map((p) => p.x));
    const y0 = Math.min(...corners.map((p) => p.y)) - place.lift * TILE_SIDE;
    const y1 = Math.max(...corners.map((p) => p.y)) + TILE_SIDE;
    return x1 >= area.x0 && x0 <= area.x1 && y1 >= area.y0 && y0 <= area.y1;
  });
}

// ---------------------------------------------------------------------------
// Drawing.

/** Runs `paint` grown to `grow` about the place's middle. */
function grown(ctx: CanvasRenderingContext2D, place: Place, grow: number, paint: () => void) {
  const middle = project(place.col + place.w / 2, place.row + place.d / 2);
  ctx.save();
  if (grow !== 1) {
    ctx.translate(middle.x, middle.y);
    ctx.scale(grow, grow);
    ctx.translate(-middle.x, -middle.y);
  }
  paint();
  ctx.restore();
}

/**
 * What lies on the floor under a place: the card's shadow, and its label.
 */
export function drawPlaceFloor(
  ctx: CanvasRenderingContext2D,
  place: Place,
  grow: number,
  ink: VillageInk,
) {
  if (grow <= 0) return;
  const card = cardBox(place);
  const shadows = cachedShadows(`place-${place.id}`, ink.shadow, () => [
    { box: card, lift: place.lift },
  ]);
  grown(ctx, place, grow, () => {
    drawShadows(ctx, shadows);

    ctx.save();
    ctx.globalAlpha = 0.6;
    // The label lies on the floor just in front of the card.
    onPlate(ctx, { ...card, r0: card.r1 + 0.25 }, 0, () => {
      const label = `/${place.label}`;
      const width = label.length * 0.62 * 0.26 + 0.1;
      stamp(ctx, `plabel|${label}|${ink.ink}|${ink.mono}`, 0, 0, width + 0.1, 0.4, (p) => {
        p.fillStyle = ink.ink;
        text(p, label, 0.1, 0.3, 0.26, ink);
      });
    });
    ctx.restore();
  });
}

/** The card's top, a soft gradient from paper to grey, like a print. */
function cardFills(ctx: CanvasRenderingContext2D, card: Box, lift: number, ink: VillageInk): PlateFills {
  const a = project(card.c0, card.r0, lift);
  const b = project(card.c1, card.r1, lift);
  const top = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  top.addColorStop(0, ink.z1);
  top.addColorStop(1, ink.muted);
  return { top, left: ink.line, right: ink.muted };
}

function drawCard(ctx: CanvasRenderingContext2D, place: Place, grow: number, ink: VillageInk) {
  const card = cardBox(place);
  grown(ctx, place, grow, () => {
    ctx.save();
    ctx.strokeStyle = ink.edge;
    drawPlate(ctx, card, place.lift, cardFills(ctx, card, place.lift, ink));
    // The drawing never changes, so it is made once and stamped.
    onPlate(ctx, card, place.lift, (w, d) =>
      stamp(ctx, `art|${place.kind}|${w}|${d}|${ink.ink}|${ink.mono}`, 0, 0, w, d, (p) =>
        place.art(p, w, d, ink),
      ),
    );
    ctx.restore();
  });
}

/** Whether box a lies wholly behind box b, as seen by the camera. */
function behind(a: Box, b: Box) {
  return a.c1 <= b.c0 + 1e-6 || a.r1 <= b.r0 + 1e-6 || a.z1 <= b.z0 + 1e-6;
}

/**
 * The floating card. With an actor beside it, whichever of the two is
 * further back is drawn first.
 */
export function drawPlaceSolids(
  ctx: CanvasRenderingContext2D,
  place: Place,
  grow: number,
  actor: Actor | null,
  ink: VillageInk,
) {
  if (grow <= 0) return;
  if (!actor) {
    drawCard(ctx, place, grow, ink);
    return;
  }
  const plate = plateBox(cardBox(place), place.lift);
  const actorFirst = behind(actor.box, plate) && !behind(plate, actor.box);
  if (!actorFirst) drawCard(ctx, place, grow, ink);
  ctx.save();
  actor.draw();
  ctx.restore();
  if (actorFirst) drawCard(ctx, place, grow, ink);
}
