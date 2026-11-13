import { HALF_H, HALF_W, TILE_SIDE, project, type Box } from "./iso";
import { NAME_TILES } from "./name";
import { PLANS } from "./villageLayout";
import { LOT } from "./villages";

/**
 * Small things scattered over the open floor so it is not all bare grid:
 * trees and rocks, and a few of the owner's favourite things. Each stands on
 * one tile. Where they go is worked out from the tile coordinates alone, so
 * the same spot always holds the same thing, however far the world is
 * explored and in whatever order.
 */

/** One prop on one tile. */
export type Prop = { col: number; row: number; kind: Kind };

/**
 * Paints in the prop's own frame: the tile's back corner is at (0, 0) and
 * `project` of a local (col, row, z) gives the screen point.
 */
type Paint = (ctx: CanvasRenderingContext2D) => void;
/** A box, a painting, or a box with something painted on it. */
type Part = { box?: Box; color?: string; paint?: Paint };
type Kind = {
  id: string;
  /** How often it turns up, relative to the others. */
  weight: number;
  /** Trees and rocks sometimes get a small companion beside them. */
  nature?: boolean;
  /** Radius of its ground shadow, in tiles. 0 for none. */
  shadow: number;
  /** Drawn in this order, which is back to front. */
  parts: Part[];
};

const OUTLINE = "rgba(41, 37, 36, 0.4)";

// ---------------------------------------------------------------------------
// Drawing helpers, all in a prop's own frame.

function box(
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

const shades = new Map<string, string>();
/** The colour darkened by `factor`, for the sides of a box. */
function shade(hex: string, factor: number) {
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
function drawBox(ctx: CanvasRenderingContext2D, b: Box, color: string) {
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
function onFace(
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
function flat(ctx: CanvasRenderingContext2D, z: number, paint: () => void) {
  ctx.save();
  ctx.translate(0, -z * TILE_SIDE);
  ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
  paint();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** A ball resting on the floor at local (c, r), `radius` tiles across. */
function ball(
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

/** A gear lying flat, `teeth` teeth round a circle of radius r, h tiles thick. */
function gear(
  c: number,
  r: number,
  radius: number,
  teeth: number,
  z: number,
  h: number,
  turn: number,
): Part {
  const path = () => {
    const p = new Path2D();
    const steps = teeth * 4;
    for (let i = 0; i < steps; i++) {
      const a = turn + (i / steps) * Math.PI * 2;
      const outer = i % 4 === 1 || i % 4 === 2;
      const rr = outer ? radius : radius * 0.8;
      const x = c + Math.cos(a) * rr;
      const y = r + Math.sin(a) * rr;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    }
    p.closePath();
    return p;
  };
  // Made on first use: Path2D only exists in the browser.
  let shape: Path2D | null = null;
  const steel = "#a8b0bb";
  return {
    paint(ctx) {
      shape ??= path();
      const outline = shape;
      // The rim, built up layer by layer, then the face on top.
      const layers = Math.max(2, Math.round(h * TILE_SIDE));
      for (let i = 0; i < layers; i++) {
        flat(ctx, z + (h * i) / layers, () => {
          ctx.fillStyle = shade(steel, 0.66);
          ctx.fill(outline);
        });
      }
      flat(ctx, z + h, () => {
        const width = ctx.lineWidth;
        ctx.lineWidth = width / HALF_W;
        ctx.fillStyle = steel;
        ctx.fill(outline);
        ctx.stroke(outline);
        ctx.beginPath();
        ctx.arc(c, r, radius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = shade(steel, 0.8);
        ctx.stroke();
        dot(ctx, c, r, radius * 0.22, "#3f3f46");
        ctx.lineWidth = width;
        ctx.strokeStyle = OUTLINE;
      });
    },
  };
}

// ---------------------------------------------------------------------------
// The props.

const WOOD = "#8b5a3c";
const LEAF = "#5fa35a";
const PINE = "#3f8a5a";
const STONE = "#a8a29e";
const PAPER = "#f5f0e1";
const CHOPSTICK = "#b7793f";

const KINDS: Kind[] = [
  {
    id: "tree",
    weight: 5,
    nature: true,
    shadow: 0.36,
    parts: [
      box(0.43, 0.57, 0.43, 0.57, 0, 0.4, WOOD),
      box(0.17, 0.83, 0.17, 0.83, 0.4, 0.92, LEAF),
      box(0.28, 0.72, 0.28, 0.72, 0.92, 1.16, "#74bb69"),
    ],
  },
  {
    id: "pine",
    weight: 4,
    nature: true,
    shadow: 0.32,
    parts: [
      box(0.44, 0.56, 0.44, 0.56, 0, 0.28, WOOD),
      box(0.14, 0.86, 0.14, 0.86, 0.28, 0.58, PINE),
      box(0.24, 0.76, 0.24, 0.76, 0.58, 0.88, "#4a9a66"),
      box(0.34, 0.66, 0.34, 0.66, 0.88, 1.16, "#56a872"),
      box(0.45, 0.55, 0.45, 0.55, 1.16, 1.3, "#56a872"),
    ],
  },
  {
    id: "rock",
    weight: 4,
    nature: true,
    shadow: 0.3,
    parts: [
      box(0.16, 0.6, 0.2, 0.68, 0, 0.3, STONE),
      box(0.26, 0.5, 0.3, 0.56, 0.3, 0.4, "#b8b2ad"),
      box(0.6, 0.86, 0.44, 0.8, 0, 0.17, "#96908b"),
    ],
  },
  {
    id: "bush",
    weight: 2,
    nature: true,
    shadow: 0.3,
    parts: [
      box(0.22, 0.78, 0.22, 0.78, 0, 0.3, "#4f9a4f", (ctx) =>
        flat(ctx, 0.3, () => {
          dot(ctx, 0.35, 0.4, 0.05, "#f9a8d4");
          dot(ctx, 0.62, 0.32, 0.05, "#fde047");
          dot(ctx, 0.55, 0.64, 0.05, "#f9a8d4");
          dot(ctx, 0.36, 0.66, 0.04, "#ffffff");
        }),
      ),
    ],
  },
  {
    id: "flowers",
    weight: 2,
    nature: true,
    shadow: 0,
    parts: [
      [0.3, 0.35, "#f472b6"],
      [0.62, 0.3, "#facc15"],
      [0.45, 0.55, "#a78bfa"],
      [0.72, 0.62, "#fb7185"],
      [0.32, 0.72, "#facc15"],
    ].flatMap(([c, r, petal]) => {
      const x = c as number;
      const y = r as number;
      return [
        box(x - 0.015, x + 0.015, y - 0.015, y + 0.015, 0, 0.18, "#4f9a4f"),
        box(x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.18, 0.24, petal as string, (ctx) =>
          flat(ctx, 0.24, () => dot(ctx, x, y, 0.022, "#fef3c7")),
        ),
      ];
    }),
  },
  {
    id: "ramen",
    weight: 1,
    shadow: 0.3,
    parts: [
      box(0.32, 0.68, 0.32, 0.68, 0, 0.05, "#7f1d1d"),
      box(0.2, 0.8, 0.2, 0.8, 0.05, 0.26, "#c2410c", (ctx) =>
        flat(ctx, 0.26, () => {
          ctx.save();
          ctx.lineWidth = 0.025;
          // Broth, noodles, an egg, a slice of fish cake and spring onion.
          dot(ctx, 0.5, 0.5, 0.25, "#e9b872");
          ctx.strokeStyle = "#fff3c4";
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(0.44, 0.55 + i * 0.035, 0.11, Math.PI * 0.1, Math.PI * 0.9);
            ctx.stroke();
          }
          dot(ctx, 0.62, 0.4, 0.085, "#ffffff");
          dot(ctx, 0.62, 0.4, 0.045, "#f59e0b");
          dot(ctx, 0.36, 0.38, 0.06, "#ffffff");
          ctx.strokeStyle = "#f472b6";
          ctx.lineWidth = 0.015;
          ctx.beginPath();
          ctx.arc(0.36, 0.38, 0.03, 0, Math.PI * 1.6);
          ctx.stroke();
          for (const [x, y] of [[0.6, 0.6], [0.66, 0.56], [0.55, 0.66]]) {
            dot(ctx, x, y, 0.018, "#65a30d");
          }
          ctx.restore();
        }),
      ),
      box(0.28, 0.48, 0.25, 0.28, 0.26, 0.46, "#1f3d2b"),
      box(0.12, 0.92, 0.68, 0.71, 0.26, 0.29, CHOPSTICK),
      box(0.12, 0.92, 0.74, 0.77, 0.26, 0.29, CHOPSTICK),
    ],
  },
  {
    id: "rice",
    weight: 1,
    shadow: 0.26,
    parts: [
      box(0.34, 0.66, 0.3, 0.62, 0, 0.04, "#1e3a8a"),
      box(0.24, 0.76, 0.2, 0.72, 0.04, 0.24, "#3b6fb6", (ctx) =>
        onFace(ctx, { c0: 0.24, c1: 0.76, r0: 0.2, r1: 0.72, z0: 0.04, z1: 0.24 }, "left", (w) => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0.06, w, 0.025);
          for (let i = 0; i < 3; i++) dot(ctx, 0.1 + i * 0.16, 0.13, 0.018, "#ffffff");
        }),
      ),
      box(0.3, 0.7, 0.26, 0.66, 0.24, 0.31, "#fafaf9"),
      box(0.37, 0.63, 0.33, 0.59, 0.31, 0.36, "#ffffff", (ctx) =>
        flat(ctx, 0.36, () => dot(ctx, 0.5, 0.46, 0.045, "#dc2626")),
      ),
      box(0.18, 0.84, 0.83, 0.86, 0, 0.03, "#7c2d12"),
      box(0.18, 0.84, 0.89, 0.92, 0, 0.03, "#7c2d12"),
    ],
  },
  {
    id: "noodles",
    weight: 1,
    shadow: 0.24,
    parts: [
      box(0.3, 0.7, 0.3, 0.7, 0, 0.44, "#fafaf9", (ctx) => {
        onFace(ctx, { c0: 0.3, c1: 0.7, r0: 0.3, r1: 0.7, z0: 0, z1: 0.44 }, "left", (w, h) => {
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(0, h * 0.18, w, 0.035);
          dot(ctx, w / 2, h * 0.55, 0.08, "#dc2626");
          dot(ctx, w / 2, h * 0.55, 0.04, "#fafaf9");
        });
        flat(ctx, 0.44, () => {
          ctx.fillStyle = "#fcd34d";
          ctx.fillRect(0.35, 0.35, 0.3, 0.3);
        });
      }),
      box(0.44, 0.48, 0.4, 0.44, 0.44, 0.8, CHOPSTICK),
      box(0.52, 0.56, 0.44, 0.48, 0.44, 0.76, CHOPSTICK),
    ],
  },
  {
    id: "laptop",
    weight: 1,
    shadow: 0.32,
    parts: [
      box(0.16, 0.78, 0.2, 0.26, 0.05, 0.5, "#3f3f46", (ctx) =>
        onFace(ctx, { c0: 0.16, c1: 0.78, r0: 0.2, r1: 0.26, z0: 0.05, z1: 0.5 }, "left", (w, h) => {
          // An editor: dark, with a few lines of colourful, indented code.
          ctx.fillStyle = "#1e1e2e";
          ctx.fillRect(0.03, 0.03, w - 0.06, h - 0.06);
          const lines: [number, number, string][] = [
            [0, 0.22, "#f472b6"],
            [0.05, 0.3, "#93c5fd"],
            [0.1, 0.18, "#86efac"],
            [0.1, 0.26, "#fde68a"],
            [0.05, 0.1, "#93c5fd"],
            [0, 0.06, "#f472b6"],
          ];
          lines.forEach(([indent, length, color], i) => {
            ctx.fillStyle = color;
            ctx.fillRect(0.07 + indent, 0.07 + i * 0.055, length, 0.025);
          });
        }),
      ),
      box(0.16, 0.78, 0.26, 0.72, 0, 0.05, "#71717a", (ctx) =>
        flat(ctx, 0.05, () => {
          ctx.fillStyle = "#3f3f46";
          for (let row = 0; row < 3; row++) {
            for (let key = 0; key < 7; key++) {
              ctx.fillRect(0.21 + key * 0.075, 0.31 + row * 0.07, 0.055, 0.05);
            }
          }
          ctx.fillStyle = "#52525b";
          ctx.fillRect(0.37, 0.55, 0.2, 0.12);
        }),
      ),
      box(0.82, 0.95, 0.5, 0.63, 0, 0.16, "#f5f5f4", (ctx) =>
        flat(ctx, 0.16, () => dot(ctx, 0.885, 0.565, 0.05, "#6b3e26")),
      ),
    ],
  },
  {
    id: "claude",
    weight: 1,
    shadow: 0.3,
    parts: [
      // A small, blocky, friendly orange creature.
      box(0.28, 0.36, 0.32, 0.4, 0, 0.13, "#c4643f"),
      box(0.64, 0.72, 0.32, 0.4, 0, 0.13, "#c4643f"),
      box(0.15, 0.25, 0.44, 0.56, 0.24, 0.34, "#d97757"),
      box(0.25, 0.75, 0.3, 0.7, 0.13, 0.46, "#d97757", (ctx) =>
        onFace(ctx, { c0: 0.25, c1: 0.75, r0: 0.3, r1: 0.7, z0: 0.13, z1: 0.46 }, "left", () => {
          ctx.fillStyle = "#1c1917";
          ctx.fillRect(0.12, 0.08, 0.055, 0.1);
          ctx.fillRect(0.33, 0.08, 0.055, 0.1);
        }),
      ),
      box(0.75, 0.85, 0.44, 0.56, 0.24, 0.34, "#d97757"),
      box(0.28, 0.36, 0.6, 0.68, 0, 0.13, "#c4643f"),
      box(0.64, 0.72, 0.6, 0.68, 0, 0.13, "#c4643f"),
    ],
  },
  {
    id: "gears",
    weight: 1,
    shadow: 0,
    parts: [
      box(0.06, 0.94, 0.06, 0.94, 0, 0.04, "#57534e"),
      gear(0.4, 0.42, 0.28, 10, 0.04, 0.07, 0),
      gear(0.73, 0.75, 0.17, 7, 0.04, 0.1, 0.22),
    ],
  },
  {
    id: "volleyball",
    weight: 1,
    shadow: 0,
    parts: [
      box(0.1, 0.15, 0.44, 0.49, 0, 0.72, "#e7e5e4"),
      {
        paint(ctx) {
          // The net, strung between the posts.
          onFace(ctx, { c0: 0.15, c1: 0.85, r0: 0.465, r1: 0.465, z0: 0.38, z1: 0.68 }, "left", (w, h) => {
            ctx.save();
            ctx.lineWidth = 0.012;
            ctx.strokeStyle = "rgba(41, 37, 36, 0.55)";
            ctx.beginPath();
            for (let u = 0; u <= w + 1e-6; u += 0.05) {
              ctx.moveTo(u, 0);
              ctx.lineTo(u, h);
            }
            for (let v = 0.05; v <= h + 1e-6; v += 0.05) {
              ctx.moveTo(0, v);
              ctx.lineTo(w, v);
            }
            ctx.stroke();
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, 0.04);
            ctx.restore();
          });
        },
      },
      box(0.85, 0.9, 0.44, 0.49, 0, 0.72, "#e7e5e4"),
      ball(0.48, 0.78, 0.12, (ctx, R) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-R, -R, 2 * R, 2 * R);
        ctx.lineWidth = R * 0.42;
        ctx.strokeStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(-R * 0.9, -R * 0.9, R * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#2563eb";
        ctx.beginPath();
        ctx.arc(R * 1.2, -R * 0.2, R * 1.15, 0, Math.PI * 2);
        ctx.stroke();
      }),
    ],
  },
  {
    id: "basketball",
    weight: 1,
    shadow: 0,
    parts: [
      box(0.45, 0.55, 0.12, 0.22, 0, 0.98, "#57534e"),
      box(0.22, 0.78, 0.22, 0.26, 0.84, 1.22, "#fafaf9", (ctx) =>
        onFace(ctx, { c0: 0.22, c1: 0.78, r0: 0.22, r1: 0.26, z0: 0.84, z1: 1.22 }, "left", () => {
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 0.02;
          ctx.strokeRect(0.19, 0.17, 0.18, 0.13);
        }),
      ),
      {
        paint(ctx) {
          // The net, hanging from the rim, then the rim.
          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const top = project(0.5 + Math.cos(a) * 0.12, 0.4 + Math.sin(a) * 0.12, 0.9);
            const bottom = project(
              0.5 + Math.cos(a + 0.4) * 0.07,
              0.4 + Math.sin(a + 0.4) * 0.07,
              0.72,
            );
            ctx.moveTo(top.x, top.y);
            ctx.lineTo(bottom.x, bottom.y);
          }
          ctx.stroke();
          ctx.restore();
          flat(ctx, 0.9, () => {
            ctx.beginPath();
            ctx.arc(0.5, 0.4, 0.12, 0, Math.PI * 2);
            ctx.lineWidth = 0.035;
            ctx.strokeStyle = "#ea580c";
            ctx.stroke();
          });
        },
      },
      ball(0.64, 0.74, 0.13, (ctx, R) => {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(-R, -R, 2 * R, 2 * R);
        ctx.lineWidth = R * 0.08;
        ctx.strokeStyle = "#431407";
        ctx.beginPath();
        ctx.moveTo(-R, 0);
        ctx.lineTo(R, 0);
        ctx.moveTo(0, -R);
        ctx.lineTo(0, R);
        ctx.moveTo(-R * 0.55, -R);
        ctx.quadraticCurveTo(-R * 0.1, 0, -R * 0.55, R);
        ctx.moveTo(R * 0.55, -R);
        ctx.quadraticCurveTo(R * 0.1, 0, R * 0.55, R);
        ctx.stroke();
      }),
    ],
  },
  {
    id: "books",
    weight: 1,
    shadow: 0.3,
    parts: (
      [
        [0.18, 0.8, 0.24, 0.72, 0, 0.1, "#2563eb"],
        [0.24, 0.76, 0.3, 0.74, 0.1, 0.18, "#dc2626"],
        [0.2, 0.7, 0.26, 0.66, 0.18, 0.28, "#16a34a"],
      ] as const
    ).map(([c0, c1, r0, r1, z0, z1, color]) => {
      const b = { c0, c1, r0, r1, z0, z1 };
      return box(c0, c1, r0, r1, z0, z1, color, (ctx) => {
        // Pages show along the edges that face the camera.
        const pages = (w: number, h: number) => {
          ctx.fillStyle = PAPER;
          ctx.fillRect(0, h * 0.25, w - 0.02, h * 0.5);
        };
        onFace(ctx, b, "left", pages);
        onFace(ctx, b, "right", pages);
      });
    }),
  },
];

const TOTAL_WEIGHT = KINDS.reduce((sum, kind) => sum + kind.weight, 0);
/** Small natural things that may sit beside a tree or rock. */
const COMPANIONS = KINDS.filter((kind) => ["rock", "bush", "flowers"].includes(kind.id));

// ---------------------------------------------------------------------------
// Where they go.

/**
 * The floor is split into squares this many tiles across, and each holds at
 * most one prop (or a prop and a companion), never on its outer ring, so
 * props always have open floor between them.
 */
const CHUNK = 4;
/** Share of squares that hold anything. */
const DENSITY = 0.6;
/** Floor kept clear around the name, and around each village's lot. */
const NAME_MARGIN = 1;
const VILLAGE_MARGIN = 3;

/**
 * Set by hand round the name, so the first view shows a few favourites.
 * They take the place of whatever their square would otherwise hold.
 */
const FEATURED: [string, number, number][] = [
  ["claude", -16, -4],
  ["gears", -11, -10],
  ["books", -8, -11],
  ["rice", -5, -12],
  ["basketball", -2, -12],
  ["pine", 1, -12],
  ["volleyball", -9, 5],
  ["tree", -6, 6],
  ["ramen", -3, 7],
  ["noodles", -4, 5],
  ["laptop", 4, -10],
];

/** A repeatable number in [0, 1) for a square and a purpose. */
function hash(a: number, b: number, salt: number) {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ Math.imul(salt, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function pick(roll: number, kinds: Kind[]) {
  const total = kinds === KINDS ? TOTAL_WEIGHT : kinds.reduce((s, k) => s + k.weight, 0);
  let left = roll * total;
  for (const kind of kinds) {
    left -= kind.weight;
    if (left < 0) return kind;
  }
  return kinds[kinds.length - 1];
}

function keptClear(col: number, row: number) {
  if (
    col >= NAME_TILES.c0 - NAME_MARGIN &&
    col < NAME_TILES.c1 + NAME_MARGIN &&
    row >= NAME_TILES.r0 - NAME_MARGIN &&
    row < NAME_TILES.r1 + NAME_MARGIN
  ) {
    return true;
  }
  return PLANS.some(
    (plan) =>
      col >= plan.col - VILLAGE_MARGIN &&
      col < plan.col + LOT + VILLAGE_MARGIN &&
      row >= plan.row - VILLAGE_MARGIN &&
      row < plan.row + LOT + VILLAGE_MARGIN,
  );
}

const chunks = new Map<string, Prop[]>();

function propsInChunk(i: number, j: number) {
  const key = `${i},${j}`;
  let found = chunks.get(key);
  if (found) return found;
  found = FEATURED.filter(
    ([, col, row]) =>
      Math.floor(col / CHUNK) === i && Math.floor(row / CHUNK) === j,
  ).map(([id, col, row]) => ({
    col,
    row,
    kind: KINDS.find((kind) => kind.id === id) ?? KINDS[0],
  }));
  if (found.length === 0 && hash(i, j, 1) < DENSITY) {
    const col = i * CHUNK + 1 + Math.floor(hash(i, j, 2) * 2);
    const row = j * CHUNK + 1 + Math.floor(hash(i, j, 3) * 2);
    const kind = pick(hash(i, j, 4), KINDS);
    if (!keptClear(col, row)) {
      found.push({ col, row, kind });
      if (kind.nature && hash(i, j, 5) < 0.45) {
        // One step along a grid axis, so it stays inside the square.
        const along = hash(i, j, 6) < 0.5;
        const c = along ? col + 1 : col;
        const r = along ? row : row + 1;
        if (!keptClear(c, r)) {
          found.push({ col: c, row: r, kind: pick(hash(i, j, 7), COMPANIONS) });
        }
      }
    }
  }
  chunks.set(key, found);
  return found;
}

/** The prop on tile (col, row), if there is one. They are solid. */
export function propAt(col: number, row: number) {
  const list = propsInChunk(Math.floor(col / CHUNK), Math.floor(row / CHUNK));
  return list.find((prop) => prop.col === col && prop.row === row) ?? null;
}

/** Every prop whose tile is inside the screen-space area, back to front. */
export function propsIn(area: { x0: number; x1: number; y0: number; y1: number }) {
  // Screen to grid: col - row = x / HALF_W, col + row = y / HALF_H.
  const corners = [
    [area.x0, area.y0],
    [area.x1, area.y0],
    [area.x0, area.y1],
    [area.x1, area.y1],
  ].map(([x, y]) => ({
    col: (x / HALF_W + y / HALF_H) / 2,
    row: (y / HALF_H - x / HALF_W) / 2,
  }));
  const i0 = Math.floor(Math.min(...corners.map((p) => p.col)) / CHUNK);
  const i1 = Math.floor(Math.max(...corners.map((p) => p.col)) / CHUNK);
  const j0 = Math.floor(Math.min(...corners.map((p) => p.row)) / CHUNK);
  const j1 = Math.floor(Math.max(...corners.map((p) => p.row)) / CHUNK);

  const found: Prop[] = [];
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      for (const prop of propsInChunk(i, j)) {
        const p = project(prop.col + 0.5, prop.row + 0.5);
        // Room above for the tallest ones.
        if (
          p.x >= area.x0 - HALF_W &&
          p.x <= area.x1 + HALF_W &&
          p.y >= area.y0 &&
          p.y <= area.y1 + 2 * TILE_SIDE
        ) {
          found.push(prop);
        }
      }
    }
  }
  return found.sort((a, b) => a.col + a.row - (b.col + b.row));
}

/**
 * Draws a prop standing on its tile, grown to `grow` (0 to a little over 1
 * as it pops up) from the middle of the tile.
 */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  prop: Prop,
  grow: number,
  shadow: string,
) {
  if (grow <= 0) return;
  const origin = project(prop.col, prop.row);
  ctx.save();
  // Scale about the middle of the tile, so it grows up out of the floor.
  ctx.translate(origin.x, origin.y + HALF_H);
  ctx.scale(grow, grow);
  ctx.translate(0, -HALF_H);

  if (prop.kind.shadow > 0) {
    const R = prop.kind.shadow;
    ctx.beginPath();
    ctx.ellipse(0, HALF_H, HALF_W * R * 1.1, HALF_H * R * 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();
  }

  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";
  for (const part of prop.kind.parts) {
    if (part.box && part.color) drawBox(ctx, part.box, part.color);
    if (part.paint) part.paint(ctx);
  }
  ctx.restore();
}
