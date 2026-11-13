import { HALF_H, HALF_W, TILE_SIDE, project, sortBackToFront, type Box } from "./iso";
import { PLANS, type ColorKey, type Flat, type InkKey, type Solid, type VillagePlan } from "./villageLayout";
import { LOT, type Board } from "./villages";

/** Colours the villages paint with, read from the CSS custom properties. */
export type VillageInk = Record<Exclude<ColorKey, "accent" | "accent2">, string> &
  Record<Exclude<InkKey, "accent">, string> & {
    edge: string;
    mono: string;
    dark: string;
    night: boolean;
  };

/** Colours that are the same in both themes: they belong to the objects. */
const FIXED = {
  gold: "#e3b23c",
  red: "#b62a3e",
  blue: "#23408e",
  glass: "#a8d1f2",
  good: "#2fa65a",
};

export function readVillageInk(): VillageInk {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const night = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    ...FIXED,
    stone: read("--obj-stone"),
    roof: read("--obj-roof"),
    dark: read("--obj-dark"),
    paper: read("--obj-paper"),
    road: read("--obj-road"),
    line: read("--obj-line"),
    muted: read("--obj-muted"),
    z1: read("--obj-z1"),
    z2: read("--obj-z2"),
    z3: read("--obj-z3"),
    plaza: read("--obj-plaza"),
    stall: read("--obj-stall"),
    ink: read("--foreground"),
    edge: night ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)",
    mono: `${read("--font-geist-mono") || "ui-monospace"}, monospace`,
    night,
  };
}

function rgb(hex: string) {
  let value = hex.replace("#", "").trim();
  if (value.length === 3) value = [...value].map((d) => d + d).join("");
  const n = parseInt(value.slice(0, 6), 16);
  return Number.isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toCss([r, g, b]: number[]) {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

function shade(hex: string, factor: number) {
  return toCss(rgb(hex).map((v) => v * factor));
}

function mix(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  return toCss(A.map((v, i) => v + (B[i] - v) * t));
}

/** Per-village colours: its own accent and a paler partner. */
function accents(plan: VillagePlan, ink: VillageInk) {
  const accent = plan.village.color;
  return {
    accent,
    accent2: mix(accent, ink.night ? "#000000" : "#ffffff", ink.night ? 0.3 : 0.45),
  };
}

function fillFor(color: ColorKey, plan: VillagePlan, ink: VillageInk) {
  if (color === "accent" || color === "accent2") return accents(plan, ink)[color];
  return ink[color];
}

/** Hex for shading: accent2 is computed as rgb(), so shade from its parts. */
function shadeAny(color: string, factor: number) {
  if (color.startsWith("#")) return shade(color, factor);
  const parts = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [128, 128, 128];
  return toCss(parts.slice(0, 3).map((v) => v * factor));
}

function face(ctx: CanvasRenderingContext2D, points: [number, number, number][], fill: string) {
  ctx.beginPath();
  points.forEach(([c, r, z], i) => {
    const p = project(c, r, z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

/** A box's three visible faces: the front-left, the front-right, the top. */
function drawBox(ctx: CanvasRenderingContext2D, b: Box, top: string) {
  face(ctx, [[b.c0, b.r1, b.z1], [b.c1, b.r1, b.z1], [b.c1, b.r1, b.z0], [b.c0, b.r1, b.z0]], shadeAny(top, 0.86));
  face(ctx, [[b.c1, b.r0, b.z1], [b.c1, b.r1, b.z1], [b.c1, b.r1, b.z0], [b.c1, b.r0, b.z0]], shadeAny(top, 0.7));
  face(ctx, [[b.c0, b.r0, b.z1], [b.c1, b.r0, b.z1], [b.c1, b.r1, b.z1], [b.c0, b.r1, b.z1]], top);
}

/** Text painted flat on the floor, reading down-right along the columns. */
function drawFloorText(
  ctx: CanvasRenderingContext2D,
  item: Extract<Flat, { kind: "text" }>,
  plan: VillagePlan,
  ink: VillageInk,
) {
  // Fonts misbehave at sizes under a pixel, so the text is set large and
  // scaled down to tile units.
  const k = item.size / 20;
  ctx.save();
  ctx.translate(0, -item.z * TILE_SIDE);
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  ctx.scale(k, k);
  ctx.font = `600 20px ${ink.mono}`;
  ctx.fillStyle =
    item.color === "accent"
      ? ink.night
        ? mix(plan.village.color, "#ffffff", 0.25)
        : plan.village.color
      : ink[item.color];
  ctx.fillText(item.text, item.col / k, item.row / k);
  ctx.restore();
}

const images = new Map<string, HTMLImageElement>();
let onImageReady: () => void = () => {};

/** Called when a board's image finishes loading, so the scene can redraw. */
export function setImageReadyHandler(handler: () => void) {
  onImageReady = handler;
}

function imageFor(src: string) {
  let image = images.get(src);
  if (!image) {
    image = new Image();
    image.onload = () => onImageReady();
    image.src = src;
    images.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** The picture on a board's front face; a sketch of one until it exists. */
function drawBoardFace(
  ctx: CanvasRenderingContext2D,
  b: Box,
  board: Board,
  plan: VillagePlan,
  ink: VillageInk,
) {
  const inset = 0.08;
  const w = b.c1 - b.c0 - 2 * inset;
  const h = b.z1 - b.z0 - 2 * inset;
  const o = project(b.c0 + inset, b.r1, b.z1 - inset);
  ctx.save();
  // One unit per tile: across the board, then down it.
  ctx.transform(HALF_W, HALF_H, 0, TILE_SIDE, o.x, o.y);

  const image = board.src ? imageFor(board.src) : null;
  if (image) {
    ctx.drawImage(image, 0, 0, w, h);
    ctx.restore();
    return;
  }

  const { accent, accent2 } = accents(plan, ink);
  ctx.fillStyle = ink.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, h * 0.11);
  if (board.kind === "form") {
    ctx.fillStyle = ink.line;
    ctx.fillRect(w * 0.1, h * 0.25, w * 0.8, h * 0.13);
    ctx.fillRect(w * 0.1, h * 0.46, w * 0.8, h * 0.13);
    ctx.fillStyle = ink.good;
    ctx.fillRect(w * 0.1, h * 0.7, w * 0.36, h * 0.15);
    ctx.fillStyle = ink.red;
    ctx.fillRect(w * 0.54, h * 0.7, w * 0.36, h * 0.15);
  } else if (board.kind === "photo") {
    // A landscape: a sun and two hills, the universal "picture goes here".
    ctx.fillStyle = accent2;
    ctx.fillRect(0, h * 0.11, w, h * 0.89);
    ctx.fillStyle = ink.paper;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.38, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w * 0.3, h * 0.5);
    ctx.lineTo(w * 0.55, h * 0.8);
    ctx.lineTo(w * 0.75, h * 0.6);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  } else if (board.kind === "portrait") {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? ink.line : accent2;
      ctx.fillRect(w * (i % 2 ? 0.3 : 0.1), h * (0.2 + i * 0.17), w * 0.6, h * 0.11);
    }
    ctx.fillStyle = accent;
    ctx.fillRect(w * 0.1, h * 0.88, w * 0.8, h * 0.06);
  } else {
    ctx.fillStyle = ink.muted;
    ctx.fillRect(0, h * 0.11, w * 0.15, h * 0.89);
    for (let i = 0; i < 5; i++) {
      const y = h * (0.2 + i * 0.15);
      ctx.fillStyle = ink.line;
      ctx.fillRect(w * 0.2, y, w * 0.74, h * 0.09);
      ctx.fillStyle = i === 2 ? ink.red : ink.good;
      ctx.fillRect(w * 0.21, y + h * 0.015, h * 0.06, h * 0.06);
    }
  }
  ctx.restore();
}

function drawSolid(ctx: CanvasRenderingContext2D, solid: Solid, plan: VillagePlan, ink: VillageInk) {
  if (solid.kind === "box") {
    drawBox(ctx, solid.box, fillFor(solid.color, plan, ink));
  } else {
    drawBox(ctx, solid.box, ink.dark);
    drawBoardFace(ctx, solid.box, solid.board, plan, ink);
  }
}

/** Screen-space extent of each lot, with headroom for its tallest things. */
const EXTENTS = PLANS.map((plan) => {
  const corners = [
    project(plan.col, plan.row),
    project(plan.col + LOT, plan.row),
    project(plan.col + LOT, plan.row + LOT),
    project(plan.col, plan.row + LOT),
  ];
  return {
    plan,
    x0: Math.min(...corners.map((p) => p.x)),
    x1: Math.max(...corners.map((p) => p.x)),
    y0: Math.min(...corners.map((p) => p.y)) - 5 * TILE_SIDE,
    y1: Math.max(...corners.map((p) => p.y)) + TILE_SIDE,
  };
});

export function visiblePlans(view: { x0: number; x1: number; y0: number; y1: number }) {
  return EXTENTS.filter(
    (e) => e.x1 >= view.x0 && e.x0 <= view.x1 && e.y1 >= view.y0 && e.y0 <= view.y1,
  )
    .map((e) => e.plan)
    .sort((a, b) => a.col + a.row - (b.col + b.row));
}

/** Everything lying on the floor: plazas, roads, plaques and painted text. */
export function drawVillageFloors(
  ctx: CanvasRenderingContext2D,
  plans: VillagePlan[],
  ink: VillageInk,
) {
  ctx.save();
  ctx.strokeStyle = ink.edge;
  for (const plan of plans) {
    for (const item of plan.flats) {
      if (item.kind === "slab") drawBox(ctx, item.box, fillFor(item.color, plan, ink));
    }
    for (const item of plan.flats) {
      if (item.kind === "text") drawFloorText(ctx, item, plan, ink);
    }
  }
  ctx.restore();
}

/** The chicken, as something to sort in among a village's buildings. */
export type Actor = { box: Box; draw: () => void };

/**
 * Everything standing, back to front. A village the chicken is in or near
 * is sorted again with the chicken, so buildings in front of it hide it
 * and those behind it don't. Returns whether the actor was drawn.
 */
export function drawVillageSolids(
  ctx: CanvasRenderingContext2D,
  plans: VillagePlan[],
  ink: VillageInk,
  actor: Actor | null,
) {
  let drawn = false;
  ctx.save();
  ctx.strokeStyle = ink.edge;
  for (const plan of plans) {
    const near =
      actor &&
      !drawn &&
      actor.box.c1 >= plan.col - 2 &&
      actor.box.c0 <= plan.col + LOT + 2 &&
      actor.box.r1 >= plan.row - 2 &&
      actor.box.r0 <= plan.row + LOT + 2;
    if (!near) {
      for (const solid of plan.solids) drawSolid(ctx, solid, plan, ink);
      continue;
    }
    type Item = { box: Box; solid: Solid | null };
    const items: Item[] = plan.solids.map((solid) => ({ box: solid.box, solid }));
    items.push({ box: actor.box, solid: null });
    for (const item of sortBackToFront(items)) {
      if (item.solid) {
        drawSolid(ctx, item.solid, plan, ink);
      } else {
        ctx.save();
        actor.draw();
        ctx.restore();
        ctx.strokeStyle = ink.edge;
      }
    }
    drawn = true;
  }
  ctx.restore();
  return drawn;
}
