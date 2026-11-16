/*
 * Draw once, stamp many times. Things that look the same every frame (a
 * line of text on the floor, the drawing on a card, a board's picture)
 * are painted once into a small offscreen canvas and then copied in with a
 * single drawImage, rather than laid out again every frame.
 *
 * A sprite is painted at about the resolution it is shown at, rounded up
 * to a power of two, so it stays sharp; zooming far enough paints a new
 * one at the next size, and the old one ages out of the cache.
 */

type Paint = (ctx: CanvasRenderingContext2D) => void;

/** The most sprites kept; the least recently used go first. */
const LIMIT = 160;
/** No sprite is made wider or taller than this, in pixels. */
const MAX_SIDE = 2048;

const cache = new Map<string, HTMLCanvasElement | null>();

/** Device pixels per unit of the context's current transform, rounded up to a power of two. */
function resolution(ctx: CanvasRenderingContext2D) {
  const m = ctx.getTransform();
  const px = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  return 2 ** Math.ceil(Math.log2(Math.max(px, 1)));
}

/**
 * Stamps the picture `paint` makes over the area (x, y, w, h), in the
 * context's current units. `key` must name everything the picture depends
 * on (its words, its colours), but not where it is drawn.
 */
export function stamp(
  ctx: CanvasRenderingContext2D,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  paint: Paint,
) {
  let px = resolution(ctx);
  while (px > 1 && Math.max(w, h) * px > MAX_SIDE) px /= 2;
  const id = `${key}|${px}`;

  let canvas = cache.get(id);
  if (canvas === undefined) {
    canvas = render(w, h, x, y, px, paint);
    cache.set(id, canvas);
    if (cache.size > LIMIT) cache.delete(cache.keys().next().value as string);
  } else {
    // Seen again: move it to the back of the queue.
    cache.delete(id);
    cache.set(id, canvas);
  }
  if (canvas) ctx.drawImage(canvas, x, y, w, h);
}

function render(w: number, h: number, x: number, y: number, px: number, paint: Paint) {
  if (typeof document === "undefined" || w <= 0 || h <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w * px));
  canvas.height = Math.max(1, Math.ceil(h * px));
  const p = canvas.getContext("2d");
  if (!p) return null;
  p.setTransform(canvas.width / w, 0, 0, canvas.height / h, -x * (canvas.width / w), -y * (canvas.height / h));
  paint(p);
  return canvas;
}

/** Forgets every sprite whose key starts with `prefix`, as when a picture finishes loading. */
export function forgetSprites(prefix: string) {
  for (const id of [...cache.keys()]) if (id.startsWith(prefix)) cache.delete(id);
}
