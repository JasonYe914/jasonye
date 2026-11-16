import { HALF_H, HALF_W, TILE_SIDE, project, type Box } from "./iso";

/*
 * Drawing helpers shared by the props and the places: boxes lit from the
 * top left, and things painted on a box's faces or lying flat. Everything
 * is in a local frame whose (0, 0, 0) is projected to the screen origin.
 */

/**
 * Paints in the prop's own frame: the tile's back corner is at (0, 0) and
 * `project` of a local (col, row, z) gives the screen point.
 */
export type Paint = (ctx: CanvasRenderingContext2D) => void;
/** A box, a painting, or a box with something painted on it. */
export type Part = { box?: Box; color?: string; paint?: Paint };
export const OUTLINE = "rgba(41, 37, 36, 0.4)";

// ---------------------------------------------------------------------------
// Drawing helpers, all in a prop's own frame.

export function box(
  c0: number,
  c1: number,
  r0: number,
  r1: number,
  z0: number,
  z1: number,
  color: string,
  paint?: Paint,
): Part {
  return { box: { c0, c1, r0, r1, z0, z1 }, color, paint };
}

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * The grey a colour turns under CSS `grayscale(1)`, as a hex. The world is
 * black and white apart from the chicken, so every other colour drawn on
 * the canvas goes through this.
 */
export function grayscale(hex: string) {
  let value = hex.replace("#", "").trim();
  if (value.length === 3) value = [...value].map((d) => d + d).join("");
  const n = parseInt(value.slice(0, 6), 16);
  if (Number.isNaN(n)) return hex;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const y = Math.round(Math.min(255, 0.2126 * r + 0.7152 * g + 0.0722 * b));
  return `#${y.toString(16).padStart(2, "0").repeat(3)}`;
}

const shades = new Map<string, string>();
/** The colour darkened by `factor`, for the sides of a box. */
export function shade(hex: string, factor: number) {
  const key = `${hex}${factor}`;
  let value = shades.get(key);
  if (!value) {
    const [r, g, b] = rgb(hex).map((v) => Math.round(v * factor));
    value = `rgb(${r}, ${g}, ${b})`;
    shades.set(key, value);
  }
  return value;
}

function polygon(
  ctx: CanvasRenderingContext2D,
  points: [number, number, number][],
  fill: string,
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

/** A box's three faces that face the camera, lit from the top left. */
export function drawBox(ctx: CanvasRenderingContext2D, b: Box, color: string) {
  const { c0, c1, r0, r1, z0, z1 } = b;
  polygon(ctx, [[c0, r1, z1], [c1, r1, z1], [c1, r1, z0], [c0, r1, z0]], shade(color, 0.86));
  polygon(ctx, [[c1, r0, z1], [c1, r1, z1], [c1, r1, z0], [c1, r0, z0]], shade(color, 0.7));
  polygon(ctx, [[c0, r0, z1], [c1, r0, z1], [c1, r1, z1], [c0, r1, z1]], color);
}

/**
 * Runs `paint` with one unit per tile laid along a face of `b`: the top,
 * the front-left face or the front-right face. (0, 0) is the face's top-left
 * corner as seen on screen, and it is `w` by `h` units.
 */
export function onFace(
  ctx: CanvasRenderingContext2D,
  b: Box,
  face: "top" | "left" | "right",
  paint: (w: number, h: number) => void,
) {
  ctx.save();
  if (face === "top") {
    const o = project(b.c0, b.r0, b.z1);
    ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, o.x, o.y);
    paint(b.c1 - b.c0, b.r1 - b.r0);
  } else if (face === "left") {
    const o = project(b.c0, b.r1, b.z1);
    ctx.transform(HALF_W, HALF_H, 0, TILE_SIDE, o.x, o.y);
    paint(b.c1 - b.c0, b.z1 - b.z0);
  } else {
    const o = project(b.c1, b.r1, b.z1);
    ctx.transform(HALF_W, -HALF_H, 0, TILE_SIDE, o.x, o.y);
    paint(b.r1 - b.r0, b.z1 - b.z0);
  }
  ctx.restore();
}

/** Runs `paint` lying flat at height z, one unit per tile, in local grid space. */
export function flat(ctx: CanvasRenderingContext2D, z: number, paint: () => void) {
  ctx.save();
  ctx.translate(0, -z * TILE_SIDE);
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  paint();
  ctx.restore();
}

export function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A ball resting on the floor at local (c, r), `radius` tiles across. */
export function ball(
  c: number,
  r: number,
  radius: number,
  paint: (ctx: CanvasRenderingContext2D, R: number) => void,
): Part {
  return {
    paint(ctx) {
      const p = project(c, r);
      const R = radius * TILE_SIDE;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R * 0.95, R * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      ctx.fill();
      ctx.save();
      ctx.translate(p.x, p.y - R);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.save();
      ctx.clip();
      paint(ctx, R);
      // A soft shade on the side away from the light.
      ctx.beginPath();
      ctx.arc(R * 0.35, R * 0.35, R * 1.05, 0, Math.PI * 2);
      ctx.arc(-R * 0.2, -R * 0.2, R * 1.05, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fill("evenodd");
      ctx.restore();
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  };
}

