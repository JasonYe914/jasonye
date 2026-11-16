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
const WING_LEFT: FaceFills = { ...WING };
const WING_RIGHT: FaceFills = { ...WING };
const ORANGE: FaceFills = { top: "#fbbf24", left: "#f59e0b", right: "#d97706" };
const RED: FaceFills = { top: "#ef4444", left: "#dc2626", right: "#b91c1c" };
const EYE: FaceFills = { top: "#1c1917", left: "#1c1917", right: "#1c1917" };
const OUTLINE = "#78716c";
/**
 * How big the chicken is drawn, relative to the part sizes below. About
 * the size of one floor square, which is 2 × 2 tiles, so it reads at the
 * zoomed-out home view; it still steps one tile at a time.
 */
export const CHICKEN_SCALE = 2.8;
const SCALE = CHICKEN_SCALE;

/**
 * A body part in the chicken's own frame, in tile units:
 * f = forward, s = sideways, z = up. Origin is the ground under its centre.
 */
type Part = {
  f: [number, number];
  s: [number, number];
  z: [number, number];
  fills: FaceFills;
  /** Which leg this is, -1 or 1, for the parts that lift in turn as it walks. */
  leg?: number;
};

const PARTS: Part[] = [
  // Feet and legs
  { f: [0.03, 0.09], s: [-0.11, -0.04], z: [0, 0.03], fills: ORANGE, leg: -1 },
  { f: [0.03, 0.09], s: [0.04, 0.11], z: [0, 0.03], fills: ORANGE, leg: 1 },
  { f: [-0.03, 0.03], s: [-0.1, -0.05], z: [0, 0.1], fills: ORANGE, leg: -1 },
  { f: [-0.03, 0.03], s: [0.05, 0.1], z: [0, 0.1], fills: ORANGE, leg: 1 },
  // Body, tail, wings
  { f: [-0.16, 0.12], s: [-0.13, 0.13], z: [0.1, 0.32], fills: WHITE },
  { f: [-0.22, -0.16], s: [-0.08, 0.08], z: [0.22, 0.38], fills: WHITE },
  { f: [-0.1, 0.06], s: [-0.16, -0.13], z: [0.15, 0.27], fills: WING_LEFT },
  { f: [-0.1, 0.06], s: [0.13, 0.16], z: [0.15, 0.27], fills: WING_RIGHT },
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

/** A wing's shoulder joint in the chicken's frame: forward, sideways, up. */
const SHOULDER = { f: -0.02, z: 0.27 };

type Face = {
  points: { x: number; y: number }[];
  fill: string;
  /** Which way a wing flaps, 1 or -1, and where it hinges; unset off the wings. */
  wing?: { side: number; pivot: { x: number; y: number } };
  /** Which leg the face belongs to, -1 or 1; unset off the legs. */
  leg?: number;
};

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
      PARTS.map((part) => ({
        fills: part.fills,
        leg: part.leg,
        box: toBox(part, facing),
      })),
    ).flatMap(({ box, fills, leg }) => {
      const side = fills === WING_LEFT ? -1 : fills === WING_RIGHT ? 1 : 0;
      const [dc, dr] = facing;
      const s = side * 0.13;
      const pivot = project(
        dc * SHOULDER.f - dr * s,
        dr * SHOULDER.f + dc * s,
        SHOULDER.z,
      );
      return boxFaces(box, fills).map((face) =>
        side ? { ...face, wing: { side, pivot } } : leg ? { ...face, leg } : face,
      );
    });
    facesByFacing.set(key, faces);
  }
  return faces;
}

/** How high a foot lifts mid-stride, in the chicken's own units. */
const FOOT_LIFT = TILE_SIDE * 0.07;
/** How far the body rocks side to side in a stride, in radians. */
const WADDLE = 0.08;
/** How much the body squashes on take-off and landing. */
const SQUASH = 0.12;
/** How much it stretches at the top of a hop. */
const STRETCH = 0.07;

/** A bump that rises from 0 to 1 and back over [from, to], and is 0 outside it. */
function bump(t: number, from: number, to: number) {
  return t <= from || t >= to ? 0 : Math.sin((Math.PI * (t - from)) / (to - from));
}

/**
 * Draws the chicken standing at screen point (x, y), lifted `lift` pixels
 * off the ground. Its shadow stays on the ground, shrinking as it rises.
 * `flap` swings each wing about its shoulder by that many radians,
 * mirrored between the two. `stride`, from 0 to 1 through a step, adds
 * the walk: it crouches to spring, stretches in the air, squashes as it
 * lands, rocks side to side, and lifts one foot then the other.
 */
export function drawChicken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: Direction,
  lift: number,
  shadow: string,
  flap = 0,
  stride?: number,
) {
  const walking = stride !== undefined && stride > 0 && stride < 1;
  const t = walking ? stride : 0;
  // Height over width: under 1 squashed, over 1 stretched. Width gives
  // a little the other way, so it keeps about the same bulk.
  const tall = walking
    ? 1 - SQUASH * (bump(t, 0, 0.2) + bump(t, 0.82, 1)) + STRETCH * bump(t, 0.2, 0.82)
    : 1;
  const wide = 1 + (1 - tall) * 0.6;
  const rock = walking ? WADDLE * Math.sin(2 * Math.PI * t) : 0;
  const rockCos = Math.cos(rock);
  const rockSin = Math.sin(rock);
  // The left foot lifts in the first half of the stride, the right in the second.
  const footUp = walking ? Math.sin(2 * Math.PI * t) : 0;

  const fade = 1 - Math.min(lift / 40, 0.3);
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    TILE_SIDE * 0.24 * SCALE * fade * wide,
    TILE_SIDE * 0.14 * SCALE * fade * wide,
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
    const wing = flap === 0 ? undefined : face.wing;
    const cos = Math.cos(flap * (wing?.side ?? 0));
    const sin = Math.sin(flap * (wing?.side ?? 0));
    const raise = face.leg ? Math.max(0, -face.leg * footUp) * FOOT_LIFT : 0;
    face.points.forEach((point, index) => {
      let qx = point.x;
      let qy = point.y - raise;
      if (wing) {
        const dx = qx - wing.pivot.x;
        const dy = qy - wing.pivot.y;
        qx = wing.pivot.x + dx * cos - dy * sin;
        qy = wing.pivot.y + dx * sin + dy * cos;
      }
      // Squash and rock about the spot it stands on, then lift.
      const sx = qx * SCALE * wide;
      const sy = qy * SCALE * tall;
      const px = x + sx * rockCos - sy * rockSin;
      const py = y + sx * rockSin + sy * rockCos - lift;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = face.fill;
    ctx.fill();
    ctx.stroke();
  }
}
