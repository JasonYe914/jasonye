import { HALF_H, HALF_W, project, type Direction } from "./iso";
import { LANDMARKS } from "./landmarks";
import { drawNameFlat } from "./name";
import { PLACES } from "./places";
import { PLANS } from "./villageLayout";
import type { Palette } from "./theme";

/*
 * The minimap is the world from straight above, turned so the W key is
 * north. On screen the grid's axes run diagonally, but here they are the
 * map's own: a column step (D) goes right, and a row step back (W) goes
 * up. So the name, laid out along the columns, reads straight across.
 *
 * It shows what the screen shows, centred where the camera is, and is
 * kept spare: the name, each village's images in its hue, the places as
 * hairline outlines, a small arrow at the rim for each
 * landmark out of view, and the chicken as a dot. No labels; the world
 * has those.
 */

/**
 * Extra room round the screen's footprint, so things at the very edge of
 * the window aren't on the very edge of the map.
 */
const MARGIN = 1.08;
/** How far in from the map's edge off-map landmarks are pointed at from. */
const EDGE_INSET = 8;

/**
 * A colour at zero opacity. Canvas gradients blend through unpremultiplied
 * colour, so fading to plain "transparent" (transparent black) would dirty
 * the fade with grey; fading to the same colour at zero opacity doesn't.
 */
function clear(hex: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? [...value].map((digit) => digit + digit).join("") : value;
  const n = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(n)) return "transparent";
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0)`;
}

export type MapState = {
  /** Centre and size of the main view, in world pixels. */
  cameraX: number;
  cameraY: number;
  viewWidth: number;
  viewHeight: number;
  /** The middle of the chicken, in grid space; fractional mid-step. */
  chickenCol: number;
  chickenRow: number;
  facing: Direction;
  /** Unused by this map, which always shows just what the screen shows. */
  viewAlpha?: number;
};

/**
 * How the map is laid over the world: the grid point at its middle, and
 * how many map pixels one tile takes.
 */
export type MapFrame = { centerCol: number; centerRow: number; tilePx: number };

/** The map's framing for a `w` × `h` map (CSS pixels): centred on the camera, fitting the screen. */
export function mapFrame(
  w: number,
  h: number,
  // Anything else in the state (the chicken) doesn't move the framing.
  state: Pick<MapState, "cameraX" | "cameraY" | "viewWidth" | "viewHeight"> &
    Partial<MapState>,
): MapFrame {
  // The map moves only when the view pans, and the chicken moves about
  // inside it just as it does on screen.
  const centerCol = (state.cameraX / HALF_W + state.cameraY / HALF_H) / 2;
  const centerRow = (state.cameraY / HALF_H - state.cameraX / HALF_W) / 2;
  // The window is a rectangle on screen but a diamond on the grid, reaching
  // this many tiles from its middle along both the columns and the rows.
  // Fitting that in the map means everything on screen is on the map.
  const reach = (state.viewWidth / HALF_W + state.viewHeight / HALF_H) / 4;
  return { centerCol, centerRow, tilePx: Math.min(w, h) / (2 * reach * MARGIN) };
}

/** The world point, in world pixels, under map pixel (x, y). */
export function mapToWorld(frame: MapFrame, w: number, h: number, x: number, y: number) {
  return project(
    frame.centerCol + (x - w / 2) / frame.tilePx,
    frame.centerRow + (y - h / 2) / frame.tilePx,
  );
}

/** Draws the map centred on the camera, sized to the canvas's CSS box. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: MapState,
  colors: Palette,
) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);

  const { centerCol, centerRow, tilePx } = mapFrame(w, h, state);

  /** Grid space to map pixels. */
  const toMap = (col: number, row: number) => ({
    x: w / 2 + (col - centerCol) * tilePx,
    y: h / 2 + (row - centerRow) * tilePx,
  });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.map;
  ctx.fillRect(0, 0, w, h);

  // From here on, in grid space: one unit per tile.
  const origin = toMap(0, 0);
  ctx.setTransform(dpr * tilePx, 0, 0, dpr * tilePx, dpr * origin.x, dpr * origin.y);
  drawNameFlat(ctx, colors);

  // Each village: just its images, as they float over the lot, in its hue.
  for (const plan of PLANS) {
    ctx.fillStyle = plan.village.color;
    for (const solid of plan.solids) {
      const b = solid.box;
      ctx.fillRect(b.c0, b.r0, b.c1 - b.c0, b.r1 - b.r0);
    }
  }

  // Each place: a hairline outline of its card.
  ctx.strokeStyle = colors.mid;
  ctx.lineWidth = 1 / tilePx;
  for (const place of PLACES) {
    ctx.strokeRect(place.col + 0.15, place.row + 0.15, place.w - 0.3, place.d - 0.3);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawLandmarks(ctx, w, h, toMap, colors);
  const chicken = toMap(state.chickenCol, state.chickenRow);
  drawPuck(ctx, chicken.x, chicken.y, state.facing, colors);
}

/** A small arrow on the map's edge for each landmark out of view. */
function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  toMap: (col: number, row: number) => { x: number; y: number },
  colors: Palette,
) {
  const cx = w / 2;
  const cy = h / 2;
  const halfW = w / 2 - EDGE_INSET;
  const halfH = h / 2 - EDGE_INSET;

  ctx.fillStyle = colors.strong;
  ctx.globalAlpha = 0.4;
  for (const landmark of LANDMARKS) {
    const { x, y } = toMap(landmark.col, landmark.row);
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) continue;

    // On the edge, on the line from the middle towards it.
    const reach = Math.min(halfW / Math.abs(dx || 1e-9), halfH / Math.abs(dy || 1e-9));
    ctx.save();
    ctx.translate(cx + dx * reach, cy + dy * reach);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.beginPath();
    ctx.moveTo(5, 0);
    ctx.lineTo(-3, -4);
    ctx.lineTo(-1, 0);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

/** The chicken: a dot with a faint cone showing where it faces. */
function drawPuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  [dc, dr]: Direction,
  colors: Palette,
) {
  // Grid axes are the map's axes, so a step (dc, dr) points along (dc, dr).
  const heading = Math.atan2(dr, dc);
  const spread = 0.62;
  const cone = ctx.createRadialGradient(x, y, 0, x, y, 18);
  cone.addColorStop(0, colors.strong);
  cone.addColorStop(1, clear(colors.strong));
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 18, heading - spread, heading + spread);
  ctx.closePath();
  ctx.fillStyle = cone;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.map;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.strong;
  ctx.fill();
}
