import {
  cachedShadows,
  type Slope,
  drawPlate,
  drawShadows,
  liftFor,
  onPlate,
  plateBox,
  plateLocal,
  tooSmall,
} from "./float";
import { grayscale } from "./paint";
import { HALF_H, HALF_W, TILE_SIDE, project, sortBackToFront, type Box } from "./iso";
import { SIGNIN_SIZE, drawSignInDemo } from "./signinDemo";
import { stamp } from "./sprite";
import { PLANS, type ColorKey, type Flat, type InkKey, type Solid, type VillagePlan } from "./villageLayout";
import { LOT, type Board } from "./villages";

/** Colours the villages paint with, read from the CSS custom properties. */
export type VillageInk = Record<Exclude<ColorKey, "accent" | "accent2">, string> &
  Record<Exclude<InkKey, "accent">, string> & {
    edge: string;
    /** The friendly rounded face the words on the floor are set in. */
    fun: string;
    /** What a floating plate's shadow is painted with. */
    shadow: string;
    mono: string;
    dark: string;
    night: boolean;
  };

/**
 * Colours that are the same in both themes: they belong to the objects.
 * Drawn as greys, since only the chicken keeps its colour.
 */
const FIXED = {
  gold: grayscale("#e3b23c"),
  red: grayscale("#b62a3e"),
  blue: grayscale("#23408e"),
  glass: grayscale("#a8d1f2"),
  good: grayscale("#2fa65a"),
};

export function readVillageInk(): VillageInk {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const night = document.documentElement.getAttribute("data-theme") === "dark";
  return {
    ...FIXED,
    fun: `${read("--font-fun") || "ui-rounded"}, ui-rounded, system-ui, sans-serif`,
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
    shadow: read("--float-shadow"),
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

/** The village's own hue, a touch lighter at night, and a paler partner. */
function accents(ink: VillageInk, plan: VillagePlan) {
  const color = plan.village.color;
  const accent = ink.night ? mix(color, "#ffffff", 0.15) : color;
  return {
    accent,
    accent2: mix(accent, ink.night ? "#000000" : "#ffffff", ink.night ? 0.3 : 0.45),
  };
}

function fillFor(color: ColorKey, plan: VillagePlan, ink: VillageInk) {
  if (color === "accent" || color === "accent2") return accents(ink, plan)[color];
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
  const size = item.size;
  const fill = item.color === "accent" ? accents(ink, plan).accent : ink[item.color];
  const font = `600 20px ${ink.fun}`;
  // Laid out once into a sprite, then stamped: the words never change.
  const width = (measure(item.text, font) / 20) * size + 0.3 * size;
  ctx.save();
  ctx.translate(0, -item.z * TILE_SIDE);
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  ctx.translate(item.col, item.row);
  stamp(ctx, `vtext|${item.text}|${size}|${fill}|${font}|${fontsReady}`, -0.1 * size, -size, width, 1.45 * size, (p) => {
    // Fonts misbehave at sizes under a pixel, so the text is set large
    // and scaled down to tile units.
    const k = size / 20;
    p.scale(k, k);
    p.font = font;
    p.fillStyle = fill;
    p.fillText(item.text, 0, 0);
  });
  ctx.restore();
}

/** Text widths, measured once each on a scratch canvas. */
const widths = new Map<string, number>();
let measurer: CanvasRenderingContext2D | null = null;

function measure(text: string, font: string) {
  const key = `${font}|${fontsReady}|${text}`;
  let width = widths.get(key);
  if (width === undefined) {
    measurer ??= document.createElement("canvas").getContext("2d");
    if (!measurer) return text.length * 12;
    measurer.font = font;
    width = measurer.measureText(text).width;
    widths.set(key, width);
  }
  return width;
}

/**
 * Bumped when web fonts finish loading. Sprites and widths made before
 * then used a fallback face, so their keys include this and are remade.
 */
let fontsReady = 0;

/** Loads the floor's font, then calls `onReady` so the scene can redraw with it. */
export function whenFontsReady(family: string, onReady: () => void) {
  if (typeof document === "undefined" || !document.fonts) return;
  document.fonts.load(`600 20px ${family}`).then(() => {
    fontsReady++;
    onReady();
  }, () => {});
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

/**
 * The picture on a board, lying face up with its top edge at the back; a
 * sketch of one until it exists. Expects one unit per tile, `w` across
 * and `h` from the top edge down.
 */
function drawBoardFace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  board: Board,
  plan: VillagePlan,
  ink: VillageInk,
) {
  ctx.save();
  const image = board.src ? imageFor(board.src) : null;
  if (image) {
    // Pictures are drained of colour like the rest of the world, unless
    // they ask to keep it. This runs once per sprite, not every frame.
    if (!board.color) ctx.filter = "grayscale(1)";
    // Photos are shrunk a long way into the sprite; the default smoothing
    // leaves them jagged.
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, w, h);
    ctx.restore();
    return;
  }

  const { accent, accent2 } = accents(ink, plan);
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
    ctx.fillStyle = ink.z1;
    ctx.fillRect(0, h * 0.11, w, h * 0.89);
    ctx.fillStyle = ink.paper;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.38, h * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink.muted;
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

/** A plate's three fills, from the colour of its top. */
function plateFills(top: string) {
  return { top, left: shadeAny(top, 0.82), right: shadeAny(top, 0.66) };
}

/** A board is already flat; anything else floats at its lift. */
function liftOf(solid: Solid) {
  return solid.kind === "board" ? solid.box.z1 : liftFor(solid.box);
}

function drawSolid(ctx: CanvasRenderingContext2D, solid: Solid, plan: VillagePlan, ink: VillageInk) {
  const lift = liftOf(solid);
  if (solid.kind === "box") {
    drawPlate(ctx, solid.box, lift, plateFills(fillFor(solid.color, plan, ink)));
    return;
  }
  // A thin frame in the village's hue, with the picture set into it,
  // tipped towards the mouse while it hovers.
  const slope = slopeOf(solid);
  const spin = solid.spin ?? 0;
  drawPlate(ctx, solid.box, lift, plateFills(accents(ink, plan).accent), slope, spin);
  // Just a hairline of frame, so the picture does the talking.
  const inset = 0.035;
  const board = solid.board;
  // The picture is drawn once into a sprite (greyed once, for a real
  // image) and stamped from then on.
  const loaded = board.src ? imageFor(board.src) !== null : false;
  onPlate(ctx, solid.box, lift, (w, d) => {
    // A turned picture runs down the rows: its width along them, its
    // height across the columns, its top edge to the left.
    if (solid.turned) {
      ctx.translate(w, 0);
      ctx.rotate(Math.PI / 2);
      [w, d] = [d, w];
    }
    const fw = w - 2 * inset;
    const fd = d - 2 * inset;
    const key = `board|${board.src ?? board.kind}|${loaded}|${fw}|${fd}|${plan.village.color}|${ink.paper}|${ink.line}|${ink.muted}|${ink.z1}|${ink.night}`;
    // The sprite is laid onto the slanted floor, shrinking it again: keep
    // that smooth too.
    ctx.imageSmoothingQuality = "high";
    stamp(ctx, key, inset, inset, fw, fd, (p) => {
      p.translate(inset, inset);
      drawBoardFace(p, fw, fd, board, plan, ink);
    });
    // A demo plays live over the cached picture, in the picture's pixels.
    // It plays only while the mouse is over the picture, from the start
    // each time, and stops the moment the mouse leaves.
    if (board.demo === "signin" && loaded) {
      const still = stillMotion();
      const now = performance.now();
      if (hovered?.solid === solid && !still) {
        if (!demoStarts.has(solid)) demoStarts.set(solid, now);
      } else {
        demoStarts.delete(solid);
      }
      const start = demoStarts.get(solid);
      if (still || start !== undefined) {
        ctx.translate(inset, inset);
        ctx.scale(fw / SIGNIN_SIZE.w, fd / SIGNIN_SIZE.h);
        drawSignInDemo(ctx, start === undefined ? 0 : now - start, still);
        if (!still) demoPlaying = true;
      }
    }
  }, slope, spin);
}

/** When each playing demo started: only while its picture is hovered. */
const demoStarts = new Map<Solid, number>();

/** Whether a demo was drawn in the last frame, and so wants another. */
let demoPlaying = false;

export function demosPlaying() {
  return demoPlaying;
}

function stillMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ---------------------------------------------------------------------------
// Tilting a picture towards the mouse.

/** How far a picture's edge under the mouse dips, and the far edge rises, in tiles. */
const TILT = 0.22;
/** How quickly a tilt follows the mouse: the time to close most of the gap. */
const TILT_MS = 110;
/** How far outside a picture the mouse still counts as over it, in tiles. */
const TILT_REACH = 0.15;

/** Where the mouse is over a picture, -1 to 1 across each way, and how tipped it is, 0 to 1. */
type Tilt = { u: number; v: number; amount: number };

const tilts = new Map<Solid, Tilt>();
let hovered: { solid: Solid; u: number; v: number } | null = null;
let tiltedAt = 0;

/**
 * Finds the picture under world point (x, y), in world pixels, among
 * `plans`: the front-most one, judged by where it floats. Pass null when
 * the mouse is away from the world.
 */
export function hoverBoards(plans: VillagePlan[], point: { x: number; y: number } | null) {
  hovered = null;
  if (!point) return;
  for (const plan of plans) {
    for (const { solid } of platesOf(plan)) {
      if (solid.kind !== "board") continue;
      const b = solid.box;
      // Lifted back down to the floor, the point is at grid (c, r).
      const y = point.y + liftOf(solid) * TILE_SIDE;
      const c = (point.x / HALF_W + y / HALF_H) / 2;
      const r = (y / HALF_H - point.x / HALF_W) / 2;
      // In the plate's own frame, so a spun one is judged by its own edges.
      const at = plateLocal(b, solid.spin, c, r);
      if (
        Math.abs(at.u) * at.hw > at.hw + TILT_REACH ||
        Math.abs(at.v) * at.hd > at.hd + TILT_REACH
      ) {
        continue;
      }
      // Later plates are drawn over earlier ones, so the last hit is on top.
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));
      hovered = { solid, u: clamp(at.u), v: clamp(at.v) };
    }
  }
}

/** Eases every tilt towards the mouse. Returns whether any is still moving. */
export function stepBoardTilts(now: number) {
  const dt = tiltedAt ? Math.min(64, now - tiltedAt) : 16;
  tiltedAt = now;
  const k = 1 - Math.exp(-dt / TILT_MS);
  if (hovered && !tilts.has(hovered.solid)) {
    tilts.set(hovered.solid, { u: hovered.u, v: hovered.v, amount: 0 });
  }
  let moving = false;
  for (const [solid, tilt] of tilts) {
    const over = hovered?.solid === solid ? hovered : null;
    // Leaving, it settles flat where it was rather than swinging round.
    const to = over ?? { u: tilt.u, v: tilt.v };
    tilt.u += (to.u - tilt.u) * k;
    tilt.v += (to.v - tilt.v) * k;
    tilt.amount += ((over ? 1 : 0) - tilt.amount) * k;
    if (!over && tilt.amount < 0.002) {
      tilts.delete(solid);
      continue;
    }
    if (
      Math.abs(to.u - tilt.u) > 0.002 ||
      Math.abs(to.v - tilt.v) > 0.002 ||
      Math.abs((over ? 1 : 0) - tilt.amount) > 0.002
    ) {
      moving = true;
    }
  }
  if (!moving) tiltedAt = 0;
  return moving;
}

/** The slope a picture is drawn at: the side under the mouse pressed down. */
function slopeOf(solid: Solid): Slope | undefined {
  const tilt = tilts.get(solid);
  if (!tilt) return undefined;
  const b = solid.box;
  // At an edge, that edge sits TILT lower and the far one TILT higher.
  const depth = TILT * tilt.amount;
  return {
    a: (-2 * depth * tilt.u) / (b.c1 - b.c0),
    b: (-2 * depth * tilt.v) / (b.r1 - b.r0),
  };
}

/** Each village's plates, in the order they are drawn, and the boxes they sort by. */
const plateCache = new WeakMap<VillagePlan, { box: Box; solid: Solid }[]>();

function platesOf(plan: VillagePlan) {
  let plates = plateCache.get(plan);
  if (!plates) {
    plates = sortBackToFront(
      plan.solids
        .filter((solid) => solid.kind === "board" || !tooSmall(solid.box))
        .map((solid) => ({
          solid,
          box: solid.kind === "board" ? solid.box : plateBox(solid.box),
        })),
    );
    plateCache.set(plan, plates);
  }
  return plates;
}

/** By day a shadow takes a little of its village's hue; at night it is just dark. */
function shadowColor(plan: VillagePlan, ink: VillageInk) {
  if (ink.night) return ink.shadow;
  const [r, g, b] = rgb(mix(plan.village.color, "#000000", 0.35));
  return `rgba(${r}, ${g}, ${b}, 0.32)`;
}

function shadowsOf(plan: VillagePlan, ink: VillageInk) {
  return cachedShadows(`village-${plan.village.id}`, shadowColor(plan, ink), () =>
    platesOf(plan).map(({ solid }) => ({
      box: solid.box,
      lift: liftOf(solid),
      spin: solid.kind === "board" ? solid.spin : undefined,
    })),
  );
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

/**
 * Everything lying on the floor: plazas, roads, plaques and painted text,
 * then the soft shadows of the plates floating over them.
 */
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
    drawShadows(ctx, shadowsOf(plan, ink));
  }
  ctx.restore();
}

/** The chicken, as something to sort in among a village's buildings. */
export type Actor = { box: Box; draw: () => void };

/**
 * Every plate, back to front and low to high. A village the chicken is in
 * or near is sorted again with the chicken, so plates in front of it or
 * above it hide it and those behind it don't. Returns whether the actor
 * was drawn.
 */
export function drawVillageSolids(
  ctx: CanvasRenderingContext2D,
  plans: VillagePlan[],
  ink: VillageInk,
  actor: Actor | null,
) {
  let drawn = false;
  demoPlaying = false;
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
      for (const { solid } of platesOf(plan)) drawSolid(ctx, solid, plan, ink);
      continue;
    }
    type Item = { box: Box; solid: Solid | null };
    const items: Item[] = [...platesOf(plan)];
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
