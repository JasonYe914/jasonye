import { HALF_H, HALF_W, TILE_SIDE, project } from "./iso";
import { pixelRatio } from "./pixelRatio";
import { OUTLINE, box, drawBox, grayscale, onFace, type Part } from "./paint";

/**
 * Things that stand on one tile of the floor. The world holds none of its own
 * now, so only the Claude kind is kept, for the mini Claudes drawn with
 * `drawProp`.
 */

/** One prop on one tile. */
export type Prop = { col: number; row: number; kind: Kind };

type Kind = {
  id: string;
  /** Radius of its ground shadow, in tiles. 0 for none. */
  shadow: number;
  /** Drawn in this order, which is back to front. */
  parts: Part[];
};

/** The small, blocky, friendly orange creature. */
export const CLAUDE: Kind = {
  id: "claude",
  shadow: 0.3,
  parts: [
    box(0.28, 0.36, 0.32, 0.4, 0, 0.13, grayscale("#c4643f")),
    box(0.64, 0.72, 0.32, 0.4, 0, 0.13, grayscale("#c4643f")),
    box(0.15, 0.25, 0.44, 0.56, 0.24, 0.34, grayscale("#d97757")),
    box(0.25, 0.75, 0.3, 0.7, 0.13, 0.46, grayscale("#d97757"), (ctx) =>
      onFace(ctx, { c0: 0.25, c1: 0.75, r0: 0.3, r1: 0.7, z0: 0.13, z1: 0.46 }, "left", () => {
        ctx.fillStyle = grayscale("#1c1917");
        ctx.fillRect(0.12, 0.08, 0.055, 0.1);
        ctx.fillRect(0.33, 0.08, 0.055, 0.1);
      }),
    ),
    box(0.75, 0.85, 0.44, 0.56, 0.24, 0.34, grayscale("#d97757")),
    box(0.28, 0.36, 0.6, 0.68, 0, 0.13, grayscale("#c4643f")),
    box(0.64, 0.72, 0.6, 0.68, 0, 0.13, grayscale("#c4643f")),
  ],
};

/** The prop on tile (col, row), if there is one. There are none. */
export function propAt(col: number, row: number): Prop | null {
  void col;
  void row;
  return null;
}

/** Every prop whose tile is inside the screen-space area, back to front. There are none. */
export function propsIn(area: { x0: number; x1: number; y0: number; y1: number }): Prop[] {
  void area;
  return [];
}

/** The front-most prop drawn over world point (x, y). There are none. */
export function propAtPoint(x: number, y: number): Prop | null {
  void x;
  void y;
  return null;
}

/*
 * Props are drawn once per kind into an offscreen canvas and then stamped
 * in with drawImage, rather than rebuilding every box
 * each frame. A sprite is made for a pixel scale rounded up to the next
 * quarter-octave, so it stays sharp while the view zooms without being
 * remade on every frame of the zoom.
 */

/** The prop's own frame reaches this far round the tile's back corner. */
const SPRITE_PAD = 4;
const SPRITE_X0 = -HALF_W - SPRITE_PAD;
const SPRITE_X1 = HALF_W + SPRITE_PAD;
/** The tallest prop stands about 1.3 tiles high. */
const SPRITE_Y0 = -1.45 * TILE_SIDE - SPRITE_PAD;
const SPRITE_Y1 = 2 * HALF_H + SPRITE_PAD;
/** The least recently used sprite is dropped once there are this many. */
const SPRITE_LIMIT = 96;

const sprites = new Map<string, HTMLCanvasElement>();

function paintKind(ctx: CanvasRenderingContext2D, kind: Kind, shadow: string) {
  if (kind.shadow > 0) {
    const R = kind.shadow;
    ctx.beginPath();
    ctx.ellipse(0, HALF_H, HALF_W * R * 1.1, HALF_H * R * 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();
  }
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  for (const part of kind.parts) {
    if (part.box && part.color) drawBox(ctx, part.box, part.color);
    if (part.paint) part.paint(ctx);
  }
}

/** The kind drawn at `bucket` device pixels per world pixel. */
function spriteFor(kind: Kind, bucket: number, dpr: number, shadow: string) {
  const key = `${kind.id}|${bucket}|${dpr}|${shadow}`;
  let sprite = sprites.get(key);
  if (sprite) {
    sprites.delete(key);
    sprites.set(key, sprite);
    return sprite;
  }
  if (sprites.size >= SPRITE_LIMIT) {
    const oldest = sprites.keys().next().value;
    if (oldest !== undefined) sprites.delete(oldest);
  }
  sprite = document.createElement("canvas");
  sprite.width = Math.ceil((SPRITE_X1 - SPRITE_X0) * bucket);
  sprite.height = Math.ceil((SPRITE_Y1 - SPRITE_Y0) * bucket);
  const ctx = sprite.getContext("2d");
  if (ctx) {
    ctx.setTransform(bucket, 0, 0, bucket, -SPRITE_X0 * bucket, -SPRITE_Y0 * bucket);
    // Outlines one window pixel wide, as when drawn straight to the screen.
    ctx.lineWidth = dpr / bucket;
    paintKind(ctx, kind, shadow);
  }
  sprites.set(key, sprite);
  return sprite;
}

/**
 * Draws a prop standing on its tile, grown to `grow` (0 to a little over 1
 * as it pops up) from the middle of the tile. `scale` is device pixels per
 * world pixel (device pixel ratio times zoom).
 */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: Prop,
  grow: number,
  shadow: string,
  scale: number,
) {
  if (grow <= 0) return;
  const dpr = pixelRatio();
  const bucket = 2 ** (Math.ceil(Math.log2(scale) * 4) / 4);
  const sprite = spriteFor(prop.kind, bucket, dpr, shadow);
  const origin = project(prop.col, prop.row);
  ctx.save();
  // Scale about the middle of the tile, so it grows up out of the floor.
  ctx.translate(origin.x, origin.y + HALF_H);
  ctx.scale(grow, grow);
  ctx.translate(0, -HALF_H);
  ctx.drawImage(
    sprite,
    SPRITE_X0,
    SPRITE_Y0,
    SPRITE_X1 - SPRITE_X0,
    SPRITE_Y1 - SPRITE_Y0,
  );
  ctx.restore();
}
