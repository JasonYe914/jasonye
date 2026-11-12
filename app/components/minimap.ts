import { HALF_H, HALF_W, type Direction } from "./iso";
import { LANDMARKS } from "./landmarks";
import { drawNameFlat } from "./name";
import type { Palette } from "./theme";

/*
 * The minimap is the world from straight above, turned so the W key is
 * north. On screen the grid's axes run diagonally, but here they are the
 * map's own: a column step (D) goes right, and a row step back (W) goes
 * up. So the name, laid out along the columns, reads straight across.
 */

/**
 * Extra room round the screen's footprint, so things at the very edge of
 * the window aren't on the very edge of the map.
 */
const MARGIN = 1.08;
/** How far in from the map's edge off-map landmarks are pointed at from. */
const EDGE_INSET = 12;

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

  // The map shows what the screen shows. It is centred where the camera
  // is, so it moves only when the view pans, and the chicken moves about
  // inside it just as it does on screen.
  const centerCol = (state.cameraX / HALF_W + state.cameraY / HALF_H) / 2;
  const centerRow = (state.cameraY / HALF_H - state.cameraX / HALF_W) / 2;
  // The window is a rectangle on screen but a diamond on the grid, reaching
  // this many tiles from its middle along both the columns and the rows.
  // Fitting that in the map means everything on screen is on the map.
  const reach =
    (state.viewWidth / HALF_W + state.viewHeight / HALF_H) / 4;
  const tilePx = Math.min(w, h) / (2 * reach * MARGIN);

  /** Grid space to map pixels. */
  const toMap = (col: number, row: number) => ({
    x: w / 2 + (col - centerCol) * tilePx,
    y: h / 2 + (row - centerRow) * tilePx,
  });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = colors.map;
  ctx.fillRect(0, 0, w, h);

  // The name, in grid space.
  const origin = toMap(0, 0);
  ctx.setTransform(
    dpr * tilePx,
    0,
    0,
    dpr * tilePx,
    dpr * origin.x,
    dpr * origin.y,
  );
  drawNameFlat(ctx, colors);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawLandmarks(ctx, w, h, toMap, colors);
  const chicken = toMap(state.chickenCol, state.chickenRow);
  drawPuck(ctx, chicken.x, chicken.y, state.facing, colors);
}

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

  for (const landmark of LANDMARKS) {
    const { x, y } = toMap(landmark.col, landmark.row);
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
      ctx.strokeStyle = colors.map;
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
    const tint = landmark.kind === "pin" ? colors.orange : colors.ink[0];

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
    ctx.roundRect(lx - labelW / 2, ly - 7, labelW, 14, 3);
    ctx.fillStyle = colors.map;
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
  // Grid axes are the map's axes, so a step (dc, dr) points along (dc, dr).
  const heading = Math.atan2(dr, dc);
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
