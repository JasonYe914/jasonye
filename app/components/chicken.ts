import {
  TILE_SIDE,
  project,
  sortBackToFront,
  type Box,
  type Direction,
  type FaceFills,
} from "./iso";

const WHITE: FaceFills = { top: "#ffffff", left: "#e7e5e4", right: "#cfcac6" };
const WING: FaceFills = { top: "#f1efed", left: "#dad6d2", right: "#bfb9b4" };
const ORANGE: FaceFills = { top: "#fbbf24", left: "#f59e0b", right: "#d97706" };
const RED: FaceFills = { top: "#ef4444", left: "#dc2626", right: "#b91c1c" };
const EYE: FaceFills = { top: "#1c1917", left: "#1c1917", right: "#1c1917" };
const OUTLINE = "#78716c";
/**
 * How big the chicken is drawn, relative to the part sizes below. Kept
 * under ~1.6 so it still fits within its own tile.
 */
const SCALE = 1.45;

/**
 * A body part in the chicken's own frame, in tile units:
 * f = forward, s = sideways, z = up. Origin is the ground under its centre.
 */
type Part = {
  f: [number, number];
  s: [number, number];
  z: [number, number];
  fills: FaceFills;
};

const PARTS: Part[] = [
  // Feet and legs
  { f: [0.03, 0.09], s: [-0.11, -0.04], z: [0, 0.03], fills: ORANGE },
  { f: [0.03, 0.09], s: [0.04, 0.11], z: [0, 0.03], fills: ORANGE },
  { f: [-0.03, 0.03], s: [-0.1, -0.05], z: [0, 0.1], fills: ORANGE },
  { f: [-0.03, 0.03], s: [0.05, 0.1], z: [0, 0.1], fills: ORANGE },
  // Body, tail, wings
  { f: [-0.16, 0.12], s: [-0.13, 0.13], z: [0.1, 0.32], fills: WHITE },
  { f: [-0.22, -0.16], s: [-0.08, 0.08], z: [0.22, 0.38], fills: WHITE },
  { f: [-0.1, 0.06], s: [-0.16, -0.13], z: [0.15, 0.27], fills: WING },
  { f: [-0.1, 0.06], s: [0.13, 0.16], z: [0.15, 0.27], fills: WING },
  // Head, eyes, wattle, beak, comb
  { f: [0.02, 0.2], s: [-0.1, 0.1], z: [0.32, 0.52], fills: WHITE },
  { f: [0.11, 0.15], s: [-0.105, -0.1], z: [0.42, 0.47], fills: EYE },
  { f: [0.11, 0.15], s: [0.1, 0.105], z: [0.42, 0.47], fills: EYE },
  { f: [0.2, 0.23], s: [-0.03, 0.03], z: [0.32, 0.38], fills: RED },
  { f: [0.2, 0.27], s: [-0.04, 0.04], z: [0.38, 0.44], fills: ORANGE },
  { f: [0.05, 0.17], s: [-0.03, 0.03], z: [0.52, 0.58], fills: RED },
];

/** Rotates a part into grid space for the given facing direction. */
function toBox(part: Part, [dc, dr]: Direction): Box {
  const cols = [0, 1].flatMap((i) =>
    [0, 1].map((j) => dc * part.f[i] - dr * part.s[j]),
  );
  const rows = [0, 1].flatMap((i) =>
    [0, 1].map((j) => dr * part.f[i] + dc * part.s[j]),
  );
  return {
    c0: Math.min(...cols),
    c1: Math.max(...cols),
    r0: Math.min(...rows),
    r1: Math.max(...rows),
    z0: part.z[0],
    z1: part.z[1],
  };
}

type Face = { points: { x: number; y: number }[]; fill: string };

/** The three camera-facing faces of a box, as screen polygons. */
function boxFaces({ c0, c1, r0, r1, z0, z1 }: Box, fills: FaceFills): Face[] {
  return [
    {
      fill: fills.left,
      points: [
        project(c0, r1, z1),
        project(c1, r1, z1),
        project(c1, r1, z0),
        project(c0, r1, z0),
      ],
    },
    {
      fill: fills.right,
      points: [
        project(c1, r0, z1),
        project(c1, r1, z1),
        project(c1, r1, z0),
        project(c1, r0, z0),
      ],
    },
    {
      fill: fills.top,
      points: [
        project(c0, r0, z1),
        project(c1, r0, z1),
        project(c1, r1, z1),
        project(c0, r1, z1),
      ],
    },
  ];
}

const facesByFacing = new Map<string, Face[]>();

/** Every face of the chicken in paint order, worked out once per facing. */
function chickenFaces(facing: Direction) {
  const key = facing.join(",");
  let faces = facesByFacing.get(key);
  if (!faces) {
    faces = sortBackToFront(
      PARTS.map((part) => ({ fills: part.fills, box: toBox(part, facing) })),
    ).flatMap(({ box, fills }) => boxFaces(box, fills));
    facesByFacing.set(key, faces);
  }
  return faces;
}

/**
 * Draws the chicken standing at screen point (x, y), lifted `lift` pixels
 * off the ground. Its shadow stays on the ground.
 */
export function drawChicken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Direction,
  lift: number,
  shadow: string,
) {
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    TILE_SIDE * 0.24 * SCALE,
    TILE_SIDE * 0.14 * SCALE,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.75;
  ctx.lineJoin = "round";
  for (const face of chickenFaces(facing)) {
    ctx.beginPath();
    face.points.forEach((point, index) => {
      const px = x + point.x * SCALE;
      const py = y + point.y * SCALE - lift;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    ctx.stroke();
  }
}
