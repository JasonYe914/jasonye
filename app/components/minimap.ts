import { HALF_H, HALF_W, project, type Direction } from "./iso";
import { LANDMARKS } from "./landmarks";
import { drawName } from "./name";
import type { Palette } from "./theme";

/*
 * The isometric view is the top view turned 45° and squashed vertically by
 * HALF_H / HALF_W. Undoing just the squash gives a true top-down map that
 * keeps the screen's orientation: what is up-right on screen is up-right
 * on the map, so the W key still heads the same way on both.
 */
const UNSQUASH = HALF_W / HALF_H;

/** Map pixels per world pixel, at most and at least. */
const MAX_SCALE = 0.085;
const MIN_SCALE = 0.04;
/** The view's footprint never takes more than this share of the map. */
const VIEW_SHARE = 0.55;
/** How far in from the map's edge off-map landmarks are pointed at from. */
const EDGE_INSET = 12;
/** Tiles between grid lines on the map, doubled until they are this far apart. */
const GRID_STEP = 2;
const MIN_LINE_GAP_PX = 9;

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
  /** The chicken, in world pixels, and which way it faces. */
  chickenX: number;
  chickenY: number;
  chickenCol: number;
  chickenRow: number;
  facing: Direction;
};

/** Draws the map centred on the chicken, sized to the canvas's CSS box. */
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
  if (canvas.height !== Math.round(h * dpr)) {
    canvas.height = Math.round(h * dpr);
  }

  // Zoomed out far enough to show the whole view, but never so far that
  // the name turns to specks; on a phone the view's outline runs off the
  // map instead.
  const k = Math.max(
    MIN_SCALE,
    Math.min(
      MAX_SCALE,
      (VIEW_SHARE * w) / state.viewWidth,
      (VIEW_SHARE * h) / (state.viewHeight * UNSQUASH),
    ),
  );
  /** World pixels to map pixels. */
  const toMap = (x: number, y: number) => ({
    x: w / 2 + (x - state.chickenX) * k,
    y: h / 2 + (y - state.chickenY) * k * UNSQUASH,
  });
  /** How many map pixels one tile edge spans; the same both ways. */
  const tilePx = Math.SQRT2 * HALF_W * k;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = colors.top;
  ctx.fillRect(0, 0, w, h);

  // World space, seen from above.
  ctx.setTransform(
    dpr * k,
    0,
    0,
    dpr * k * UNSQUASH,
    dpr * (w / 2 - state.chickenX * k),
    dpr * (h / 2 - state.chickenY * k * UNSQUASH),
  );

  // The grid, in grid space: one unit per tile.
  ctx.save();
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  const reach = Math.ceil(Math.hypot(w, h) / tilePx / 2) + 2;
  const c0 = state.chickenCol - reach;
  const r0 = state.chickenRow - reach;
  const c1 = state.chickenCol + reach;
  const r1 = state.chickenRow + reach;

  ctx.fillStyle = colors.here;
  ctx.fillRect(state.chickenCol, state.chickenRow, 1, 1);

  // Every tile would be a blur of lines at this size, so the map is ruled
  // through the crosses on the floor, or through every other one, and so
  // on, whatever keeps the lines apart.
  let step = GRID_STEP;
  while (step * tilePx < MIN_LINE_GAP_PX) step *= 2;
  ctx.lineWidth = 1 / tilePx;
  ctx.beginPath();
  const first = (n: number) => n + (((-n % step) + step) % step);
  for (let c = first(c0); c <= c1; c += step) {
    ctx.moveTo(c, r0);
    ctx.lineTo(c, r1);
  }
  for (let r = first(r0); r <= r1; r += step) {
    ctx.moveTo(c0, r);
    ctx.lineTo(c1, r);
  }
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = colors.mark;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  drawName(ctx, colors);

  // Back to map pixels for everything that keeps its size.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Soft fade into the edges.
  const fade = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.42,
    w / 2,
    h / 2,
    Math.hypot(w, h) / 2,
  );
  fade.addColorStop(0, clear(colors.top));
  fade.addColorStop(1, colors.top);
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);

  // What the main view shows: a rectangle on screen is a rectangle here too.
  const a = toMap(
    state.cameraX - state.viewWidth / 2,
    state.cameraY - state.viewHeight / 2,
  );
  const b = toMap(
    state.cameraX + state.viewWidth / 2,
    state.cameraY + state.viewHeight / 2,
  );
  ctx.beginPath();
  ctx.roundRect(a.x, a.y, b.x - a.x, b.y - a.y, 4);
  ctx.fillStyle = colors.view;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = colors.viewEdge;
  ctx.stroke();

  drawLandmarks(ctx, w, h, toMap, colors);
  drawPuck(ctx, w / 2, h / 2, state.facing, colors);
}

function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  toMap: (x: number, y: number) => { x: number; y: number },
  colors: Palette,
) {
  const cx = w / 2;
  const cy = h / 2;
  const halfW = w / 2 - EDGE_INSET;
  const halfH = h / 2 - EDGE_INSET;

  for (const landmark of LANDMARKS) {
    const spot = project(landmark.col, landmark.row);
    const { x, y } = toMap(spot.x, spot.y);
    const dx = x - cx;
    const dy = y - cy;
    const inside = Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;

    if (inside) {
      if (landmark.kind !== "pin") continue;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.orange;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = colors.top;
      ctx.stroke();
      continue;
    }

    // Out of range: an arrowhead on the edge, on the line towards it, with
    // the landmark's name just inside.
    const reach = Math.min(
      halfW / Math.abs(dx || 1e-9),
      halfH / Math.abs(dy || 1e-9),
    );
    const ex = cx + dx * reach;
    const ey = cy + dy * reach;
    const angle = Math.atan2(dy, dx);
    const tint = landmark.kind === "pin" ? colors.orange : colors.ink[1];

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-4, -5.5);
    ctx.lineTo(-1.5, 0);
    ctx.lineTo(-4, 5.5);
    ctx.closePath();
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.restore();

    ctx.font = `600 9px ${colors.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = landmark.label.toUpperCase();
    const labelW = ctx.measureText(label).width + 8;
    const lx = Math.min(
      w - labelW / 2 - 3,
      Math.max(labelW / 2 + 3, ex - Math.cos(angle) * 16),
    );
    const ly = Math.min(h - 10, Math.max(10, ey - Math.sin(angle) * 14));
    ctx.beginPath();
    ctx.roundRect(lx - labelW / 2, ly - 7, labelW, 14, 7);
    ctx.fillStyle = colors.top;
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint;
    ctx.fillText(label, lx, ly + 0.5);
  }
}

/** The chicken, as a location puck with a cone showing where it faces. */
function drawPuck(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  [dc, dr]: Direction,
  colors: Palette,
) {
  // A grid step (dc, dr) points along (dc - dr, dc + dr) on the map.
  const heading = Math.atan2(dc + dr, dc - dr);
  const spread = 0.62;
  const cone = ctx.createRadialGradient(x, y, 0, x, y, 24);
  cone.addColorStop(0, colors.blue);
  cone.addColorStop(1, clear(colors.blue));
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 24, heading - spread, heading + spread);
  ctx.closePath();
  ctx.fillStyle = cone;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.arc(x, y, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.blue;
  ctx.fill();
}
