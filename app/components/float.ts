import { HALF_H, HALF_W, TILE_SIDE, project, type Box } from "./iso";

/*
 * Landmarks are flat: every piece of a village or a place is a thin plate
 * hovering over its footprint, with a soft shadow on the floor beneath, like
 * cards laid out on a drafting table. Height survives only as hover: what
 * used to stand taller floats higher, and its shadow spreads wider and
 * fainter. The chicken is the one solid thing left in the world.
 *
 * The layouts still describe boxes, so collisions, spots and depth sorting
 * keep working; the boxes are flattened only when drawn.
 */

/** How thick a plate is, in tiles. Just enough to catch a crisp edge. */
export const PLATE = 0.06;
/** The chicken's height, which anything overhead must clear. */
const CLEARANCE = 1.1;
/** The highest anything floats. */
const MAX_LIFT = 1.5;
/** Plates smaller than this (posts, legs, poles) are left out. */
const MIN_AREA = 0.05;

/** How high a box's plate floats: taller boxes float higher. */
export function liftFor(b: Box) {
  const lift = Math.min(0.18 + 0.32 * b.z1, MAX_LIFT);
  // Anything that was overhead (a gate's lintel, a stall's awning) floats
  // clear of the chicken, so it can walk beneath.
  return b.z0 >= CLEARANCE ? Math.max(lift, CLEARANCE + 0.2) : lift;
}

/** Whether a box is too slight to show once flattened. */
export function tooSmall(b: Box) {
  return (b.c1 - b.c0) * (b.r1 - b.r0) < MIN_AREA;
}

/** The plate a box flattens to, as a box: its footprint, at its lift. */
export function plateBox(b: Box, lift = liftFor(b)): Box {
  return { c0: b.c0, c1: b.c1, r0: b.r0, r1: b.r1, z0: lift - PLATE, z1: lift };
}

function polygon(
  ctx: CanvasRenderingContext2D,
  points: [number, number, number][],
  fill: string | CanvasGradient,
) {
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

export type PlateFills = {
  top: string | CanvasGradient;
  /** The thin front-left and front-right edges. */
  left: string;
  right: string;
};

/**
 * A tilt for a plate: how much its height changes per tile along its own
 * width (`a`) and depth (`b`), pivoting on its middle. For a plate that
 * isn't spun, those are the columns and the rows.
 */
export type Slope = { a: number; b: number };

/**
 * A plate's own frame: its middle, its half size, and how far it is spun
 * round on the floor (radians, clockwise seen from above), so a plate
 * needn't run with the grid. Local x runs along its width, y its depth.
 */
function frameOf(b: Box, spin = 0) {
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  const cc = (b.c0 + b.c1) / 2;
  const rc = (b.r0 + b.r1) / 2;
  return {
    hw: (b.c1 - b.c0) / 2,
    hd: (b.r1 - b.r0) / 2,
    cos,
    sin,
    /** Local (x, y) from the middle, to the grid. */
    toGrid: (x: number, y: number) => ({ c: cc + x * cos - y * sin, r: rc + x * sin + y * cos }),
    /** Grid (c, r) to local (x, y) from the middle. */
    toLocal: (c: number, r: number) => ({
      x: (c - cc) * cos + (r - rc) * sin,
      y: -(c - cc) * sin + (r - rc) * cos,
    }),
  };
}

/** The four corners of a plate on the floor, spun: back, right, front, left. */
export function plateCorners(b: Box, spin = 0) {
  const f = frameOf(b, spin);
  return [
    f.toGrid(-f.hw, -f.hd),
    f.toGrid(f.hw, -f.hd),
    f.toGrid(f.hw, f.hd),
    f.toGrid(-f.hw, f.hd),
  ];
}

/** Where grid point (c, r) is on a plate, -1 to 1 across each way (beyond 1 outside it). */
export function plateLocal(b: Box, spin: number | undefined, c: number, r: number) {
  const f = frameOf(b, spin);
  const { x, y } = f.toLocal(c, r);
  return { u: x / f.hw, v: y / f.hd, hw: f.hw, hd: f.hd };
}

/**
 * A plate over the footprint of `b`, its top at height `lift`, spun by
 * `spin` and tilted by `slope`.
 */
export function drawPlate(
  ctx: CanvasRenderingContext2D,
  b: Box,
  lift: number,
  fills: PlateFills,
  slope?: Slope,
  spin = 0,
) {
  const f = frameOf(b, spin);
  const corners: [number, number][] = [
    [-f.hw, -f.hd],
    [f.hw, -f.hd],
    [f.hw, f.hd],
    [-f.hw, f.hd],
  ];
  const at = ([x, y]: [number, number], drop: number): [number, number, number] => {
    const { c, r } = f.toGrid(x, y);
    return [c, r, lift + (slope?.a ?? 0) * x + (slope?.b ?? 0) * y - drop];
  };
  // The edges facing the viewer (towards more columns and rows) show
  // their thickness; the ones facing away are hidden behind the top.
  const normals: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  normals.forEach(([nx, ny], i) => {
    const nc = nx * f.cos - ny * f.sin;
    const nr = nx * f.sin + ny * f.cos;
    if (nc + nr <= 1e-6) return;
    const a = corners[i];
    const b2 = corners[(i + 1) % 4];
    polygon(ctx, [at(a, 0), at(b2, 0), at(b2, PLATE), at(a, PLATE)], nc > nr ? fills.right : fills.left);
  });
  polygon(ctx, corners.map((corner) => at(corner, 0)), fills.top);
}

/**
 * Runs `paint` lying on top of a plate, one unit per tile: x along the
 * columns, y along the rows, (0, 0) at the plate's back corner.
 */
export function onPlate(
  ctx: CanvasRenderingContext2D,
  b: Box,
  lift: number,
  paint: (w: number, d: number) => void,
  slope?: Slope,
  spin = 0,
) {
  // A spun or tilted plate is still a flat plane, so seen from the fixed
  // angle it is just a slanted rectangle: a step across it moves along
  // both grid axes, and climbs a little.
  const f = frameOf(b, spin);
  const a = slope?.a ?? 0;
  const s = slope?.b ?? 0;
  const back = f.toGrid(-f.hw, -f.hd);
  const o = project(back.c, back.r, lift - a * f.hw - s * f.hd);
  ctx.save();
  ctx.transform(
    (f.cos - f.sin) * HALF_W,
    (f.cos + f.sin) * HALF_H - a * TILE_SIDE,
    (-f.sin - f.cos) * HALF_W,
    (f.cos - f.sin) * HALF_H - s * TILE_SIDE,
    o.x,
    o.y,
  );
  paint(2 * f.hw, 2 * f.hd);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Shadows.

/** Shadow layers are drawn at this many pixels per world pixel. */
const RES = 0.5;

/** How far a shadow spreads, in world pixels, for a plate at `lift`. */
function blurFor(lift: number) {
  return 6 + lift * TILE_SIDE * 0.4;
}

/** How dark a shadow is, as a share of the shadow colour: higher is fainter. */
function alphaFor(lift: number) {
  return 1 - (0.45 * lift) / MAX_LIFT;
}

export type ShadowLayer = {
  canvas: HTMLCanvasElement;
  /** Where it sits, in world pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * Paints every plate's shadow once, blurred, into its own canvas, so a
 * frame costs one image draw however many plates there are. Each shadow
 * is the plate's footprint on the floor, softened by how high it floats.
 */
export function buildShadows(
  plates: { box: Box; lift: number; spin?: number }[],
  color: string,
): ShadowLayer | null {
  if (plates.length === 0 || typeof document === "undefined") return null;

  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  let spread = 0;
  for (const { box: b, lift, spin } of plates) {
    for (const p of plateCorners(b, spin).map(({ c, r }) => project(c, r))) {
      x0 = Math.min(x0, p.x);
      x1 = Math.max(x1, p.x);
      y0 = Math.min(y0, p.y);
      y1 = Math.max(y1, p.y);
    }
    spread = Math.max(spread, blurFor(lift));
  }
  const pad = spread * 1.5;
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  const w = x1 - x0;
  const h = y1 - y0;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * RES));
  canvas.height = Math.max(1, Math.ceil(h * RES));
  const p = canvas.getContext("2d");
  if (!p) return null;
  p.setTransform(RES, 0, 0, RES, -x0 * RES, -y0 * RES);

  // Each shape is drawn off the canvas and only its shadow is cast back
  // onto it, so the layer holds soft shadows and no hard edges.
  const away = w;
  p.fillStyle = "#000";
  p.shadowColor = color;
  p.shadowOffsetX = -away * RES;
  p.shadowOffsetY = 0;
  for (const { box: b, lift, spin } of plates) {
    p.shadowBlur = blurFor(lift) * RES;
    p.globalAlpha = alphaFor(lift);
    p.beginPath();
    plateCorners(b, spin)
      .map(({ c, r }) => project(c, r))
      .forEach((q, i) => {
      if (i === 0) p.moveTo(q.x + away, q.y);
      else p.lineTo(q.x + away, q.y);
    });
    p.closePath();
    p.fill();
  }
  return { canvas, x: x0, y: y0, w, h };
}

export function drawShadows(ctx: CanvasRenderingContext2D, layer: ShadowLayer | null) {
  if (layer) ctx.drawImage(layer.canvas, layer.x, layer.y, layer.w, layer.h);
}

/** Shadow layers, kept until the shadow colour changes with the theme. */
const layers = new Map<string, ShadowLayer | null>();

export function cachedShadows(
  key: string,
  color: string,
  plates: () => { box: Box; lift: number; spin?: number }[],
) {
  const id = `${key}|${color}`;
  if (!layers.has(id)) layers.set(id, buildShadows(plates(), color));
  return layers.get(id) ?? null;
}
