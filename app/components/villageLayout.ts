import { sortBackToFront, type Box } from "./iso";
import { LOT, VILLAGES, lotOrigin, type Board, type SceneId, type Village } from "./villages";

/*
 * Turns each village's content into things standing on its lot. Every
 * village follows one plan, in lot tiles (0 to 16 both ways):
 *
 *   back row    billboards, with the team's houses in the far corner
 *   left        a market row, one stall per tool
 *   middle      the plaza (5 to 11) with the project's centrepiece on it
 *   right       towers, one per number, smallest at the back
 *   front       plaques either side of the road, the clock tower, the
 *               signpost, and the gate facing the camera
 *
 * Sizes come from the content: a board takes its image's shape, a tower its
 * marked importance, a stall whether the tool was core, a plaque its words.
 */

export type ColorKey =
  | "accent"
  | "accent2"
  | "stone"
  | "roof"
  | "dark"
  | "paper"
  | "road"
  | "line"
  | "muted"
  | "z1"
  | "z2"
  | "z3"
  | "plaza"
  | "stall"
  | "gold"
  | "red"
  | "blue"
  | "glass"
  | "good";

export type InkKey = "ink" | "muted" | "accent";

/** Something standing up, drawn in depth order with the chicken. */
export type Solid =
  | { kind: "box"; box: Box; color: ColorKey }
  | { kind: "board"; box: Box; board: Board };

/** Something lying on the floor, drawn before anything stands on it. */
export type Flat =
  | { kind: "slab"; box: Box; color: ColorKey }
  | {
      kind: "text";
      col: number;
      row: number;
      z: number;
      size: number;
      text: string;
      color: InkKey;
    };

type Area = { c0: number; c1: number; r0: number; r1: number };

/** A place that shows a fact when the chicken stands beside it. */
export type Spot = {
  id: string;
  type:
    | "gate"
    | "board"
    | "tower"
    | "stall"
    | "plaque"
    | "clock"
    | "signpost"
    | "houses";
  title: string;
  text: string;
  /** World grid area, and how far round it still counts as beside it. */
  area: Area;
  reach: number;
};

export type VillagePlan = {
  village: Village;
  /** World grid position of the lot's top-left corner. */
  col: number;
  row: number;
  flats: Flat[];
  /** Back to front, without the chicken. */
  solids: Solid[];
  spots: Spot[];
  plaza: Area;
  /** Tiles the chicken can't step onto, as "col,row". */
  blocked: Set<string>;
};

type Raw = [number, number, number, number, number, number, ColorKey];

/** Each project's centrepiece, on a 6 × 6 patch the size of the plaza. */
const CENTERPIECES: Record<SceneId, Raw[]> = {
  queens: [
    [1, 1.5, 0, 3.2, 2.4, 1.6, "stone"],
    [0.9, 1.4, 1.6, 3.4, 2.6, 0.28, "roof"],
    [4.5, 1.1, 0, 1.1, 1.1, 3.3, "stone"],
    [4.4, 1.0, 3.3, 1.3, 1.3, 0.35, "roof"],
    [4.95, 1.55, 3.65, 0.08, 0.08, 1.1, "dark"],
    [5.03, 1.55, 4.3, 0.6, 0.06, 0.4, "accent"],
    [1.2, 4.5, 0, 0.7, 1, 0.08, "gold"],
    [1.9, 4.5, 0, 0.7, 1, 0.08, "red"],
    [2.6, 4.5, 0, 0.7, 1, 0.08, "blue"],
  ],
  playtoon: [
    [0.8, 1.2, 0, 2.15, 3.6, 0.3, "accent"],
    [0.95, 1.3, 0.3, 1.95, 3.4, 0.2, "paper"],
    [1.3, 1.8, 0.5, 1.2, 0.12, 0.02, "line"],
    [1.3, 2.4, 0.5, 1.3, 0.12, 0.02, "line"],
    [1.3, 3.0, 0.5, 1.0, 0.12, 0.02, "line"],
    [1.3, 3.6, 0.5, 1.3, 0.12, 0.02, "line"],
    [2.95, 1.2, 0, 2.15, 3.6, 0.3, "accent"],
    [2.95, 1.3, 0.3, 1.95, 3.4, 0.2, "paper"],
    [3.4, 1.8, 0.5, 1.2, 0.12, 0.02, "line"],
    [3.4, 2.4, 0.5, 1.0, 0.12, 0.02, "line"],
    [3.4, 3.0, 0.5, 1.3, 0.12, 0.02, "line"],
    [2.5, 2.4, 1.9, 0.9, 0.9, 0.9, "accent2"],
  ],
  qadt: [
    [1.4, 1.4, 0, 3.2, 3.2, 0.14, "dark"],
    [2.3, 2.2, 0.14, 0.28, 1.6, 0.02, "paper"],
    [3.4, 2.2, 0.14, 0.28, 1.6, 0.02, "paper"],
    [2.3, 2.86, 0.14, 1.38, 0.28, 0.02, "paper"],
    [1.9, 2.86, 1.55, 2.2, 0.28, 0.12, "dark"],
    [2.86, 1.9, 1.55, 0.28, 2.2, 0.12, "dark"],
    [2.55, 1.0, 1.8, 0.9, 0.9, 0.06, "muted"],
    [1.0, 2.55, 1.8, 0.9, 0.9, 0.06, "muted"],
    [2.6, 2.6, 1.6, 0.8, 0.8, 0.38, "accent"],
    [4.1, 2.55, 1.8, 0.9, 0.9, 0.06, "muted"],
    [2.55, 4.1, 1.8, 0.9, 0.9, 0.06, "muted"],
  ],
  getinto: [
    [2.2, 2.2, 0, 1.6, 1.0, 0.12, "dark"],
    [2.85, 2.45, 0.12, 0.3, 0.3, 1.0, "dark"],
    [1.5, 2.75, 1.0, 3.0, 0.25, 1.8, "dark"],
    [1.65, 3.0, 1.15, 2.7, 0.04, 1.5, "accent2"],
    [2.85, 2.8, 2.8, 0.3, 0.2, 0.2, "dark"],
    [1.0, 4.3, 0, 0.42, 0.42, 0.5, "accent"],
    [1.7, 4.3, 0, 0.42, 0.42, 1.1, "accent"],
    [2.4, 4.3, 0, 0.42, 0.42, 0.75, "accent"],
    [3.1, 4.3, 0, 0.42, 0.42, 1.45, "accent"],
    [3.8, 4.3, 0, 0.42, 0.42, 0.65, "accent"],
    [4.5, 4.3, 0, 0.42, 0.42, 1.0, "accent"],
  ],
  wayfinder: [
    [1.6, 4.15, 0, 0.7, 0.3, 0.05, "line"],
    [3.1, 3.1, 0, 0.3, 0.9, 0.05, "line"],
    [3.2, 2.1, 0, 0.9, 0.3, 0.05, "line"],
    [0.6, 3.8, 0, 1, 1, 0.3, "accent"],
    [2.2, 2.4, 0, 1, 1, 0.6, "accent"],
    [4.3, 0.8, 0, 1, 1, 0.95, "accent"],
    [4.75, 1.25, 0.95, 0.1, 0.1, 1.4, "dark"],
    [4.85, 1.25, 1.9, 0.75, 0.06, 0.45, "accent2"],
    [2.6, 4.2, 0, 1, 1, 0.5, "muted"],
    [4.3, 3.5, 0, 1, 1, 0.8, "muted"],
  ],
  gofleet: [
    [0, 2.1, 0, 6, 1.9, 0.03, "road"],
    [0.4, 3.0, 0.03, 0.6, 0.1, 0.01, "paper"],
    [1.8, 3.0, 0.03, 0.6, 0.1, 0.01, "paper"],
    [3.2, 3.0, 0.03, 0.6, 0.1, 0.01, "paper"],
    [5.0, 0.7, 0, 0.18, 0.18, 1.3, "dark"],
    [4.8, 0.62, 1.3, 0.6, 0.08, 0.55, "good"],
    [0.6, 2.35, 0.3, 2.6, 1.35, 1.35, "paper"],
    [0.6, 3.7, 0.65, 2.6, 0.03, 0.3, "accent"],
    [0.9, 3.55, 0, 0.5, 0.18, 0.4, "dark"],
    [2.3, 3.55, 0, 0.5, 0.18, 0.4, "dark"],
    [3.3, 2.4, 0.3, 1.05, 1.25, 1.05, "accent"],
    [4.35, 2.55, 0.8, 0.03, 0.95, 0.4, "glass"],
    [3.55, 3.55, 0, 0.5, 0.18, 0.4, "dark"],
    [5.0, 4.3, 0, 0.35, 0.35, 1.2, "dark"],
    [5.1, 1.2, 1.0, 0.15, 3.15, 0.15, "accent2"],
  ],
  zendu: [
    [0.3, 0.3, 0, 5.4, 0.12, 0.5, "stone"],
    [0.3, 0.42, 0, 0.12, 5.28, 0.5, "stone"],
    [0.42, 0.42, 0, 2.5, 2.5, 0.05, "z1"],
    [3.05, 0.42, 0, 2.6, 2.5, 0.05, "z2"],
    [2.92, 0.42, 0, 0.12, 2.5, 0.5, "stone"],
    [0.42, 2.92, 0, 5.28, 0.12, 0.5, "stone"],
    [0.42, 3.04, 0, 5.28, 2.6, 0.05, "z3"],
    [1.4, 1.4, 0.05, 0.38, 0.38, 0.2, "dark"],
    [4.2, 1.4, 0.05, 0.38, 0.38, 0.2, "dark"],
    [3.6, 4.0, 0.05, 0.25, 0.25, 1.2, "dark"],
    [3.42, 3.82, 1.25, 0.6, 0.6, 0.6, "accent"],
  ],
  bankview: [
    [1.2, 0.9, 0, 3.2, 3.0, 2.8, "stone"],
    [1.85, 3.9, 0.45, 1.9, 0.08, 1.9, "dark"],
    [2.0, 3.98, 0.6, 1.6, 0.06, 1.6, "accent"],
    [2.62, 4.04, 1.25, 0.36, 0.03, 0.36, "paper"],
    [0.4, 4.5, 0, 1.4, 0.9, 0.06, "accent2"],
    [4.6, 3.4, 0, 0.7, 0.7, 0.55, "gold"],
    [4.75, 4.5, 0, 0.7, 0.7, 0.3, "gold"],
  ],
};

/** The plaza, in lot tiles, and how high it stands. */
const PLAZA = { c0: 5, c1: 11, r0: 5, r1: 11, h: 0.08 };
/** Mono glyphs are about this wide, as a share of the font size. */
const GLYPH = 0.6;
/** Things this flat lie on the floor; anything taller stands. */
const FLAT = 0.1;

function box(c: number, r: number, z: number, w: number, d: number, h: number): Box {
  return { c0: c, c1: c + w, r0: r, r1: r + d, z0: z, z1: z + h };
}

function textWidth(text: string, size: number) {
  return text.length * GLYPH * size;
}

const TOWER = {
  s: { w: 1.0, h: 1.8 },
  m: { w: 1.2, h: 2.8 },
  l: { w: 1.6, h: 4.2 },
};

/** Board size in tiles: the slot's width, cut to the image's shape. */
function boardSize(kind: Board["kind"], slot: number) {
  switch (kind) {
    case "portrait":
      return { w: 1.9, h: 3.4 };
    case "form":
      return { w: Math.min(slot, 3.2), h: Math.min(slot, 3.2) * 0.66 };
    case "photo": {
      const w = Math.min(slot, 4.2);
      return { w, h: w * 0.75 };
    }
    default: {
      const w = Math.min(slot, 5.8);
      return { w, h: w * 0.5625 };
    }
  }
}

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function planVillage(village: Village): VillagePlan {
  const origin = lotOrigin(village);
  const oc = origin.col;
  const or = origin.row;
  const flats: Flat[] = [];
  const solids: Solid[] = [];
  const spots: Spot[] = [];

  /** Places a lot-space box in the world, on the floor or standing. */
  const put = (b: Box, color: ColorKey) => {
    const placed = { ...b, c0: b.c0 + oc, c1: b.c1 + oc, r0: b.r0 + or, r1: b.r1 + or };
    if (b.z0 <= FLAT && b.z1 - b.z0 <= FLAT) flats.push({ kind: "slab", box: placed, color });
    else solids.push({ kind: "box", box: placed, color });
  };
  const write = (
    c: number,
    r: number,
    text: string,
    size: number,
    color: InkKey,
    z = 0,
  ) => flats.push({ kind: "text", col: c + oc, row: r + or, z, size, text, color });
  const spot = (
    id: string,
    type: Spot["type"],
    title: string,
    text: string,
    area: Area,
    reach = 1,
  ) =>
    spots.push({
      id,
      type,
      title,
      text,
      reach,
      area: {
        c0: area.c0 + oc,
        c1: area.c1 + oc,
        r0: area.r0 + or,
        r1: area.r1 + or,
      },
    });

  // The plaza, the road from the gate, and the centrepiece.
  put(box(PLAZA.c0, PLAZA.r0, 0, PLAZA.c1 - PLAZA.c0, PLAZA.r1 - PLAZA.r0, PLAZA.h), "plaza");
  put(box(7, PLAZA.r1, 0, 2, LOT - PLAZA.r1, 0.02), "road");
  for (const [c, r, z, w, d, h, color] of CENTERPIECES[village.id]) {
    const lift = z <= FLAT && h <= FLAT ? 0.01 : PLAZA.h;
    put(box(PLAZA.c0 + c, PLAZA.r0 + r, z + lift, w, d, h), color);
  }

  // The gate, facing the camera, with the name painted in front of it.
  put(box(6.3, 15.2, 0, 0.6, 0.6, 2.0), "accent");
  put(box(9.1, 15.2, 0, 0.6, 0.6, 2.0), "accent");
  put(box(6.3, 15.2, 2.0, 3.4, 0.6, 0.4), "accent");
  const gateSize = 0.44;
  write(8 - textWidth(village.gate, gateSize) / 2, 16.75, village.gate, gateSize, "ink");
  spot(
    "gate",
    "gate",
    village.name,
    `${village.role} · ${village.dates} · ${village.place}`,
    { c0: 6.3, c1: 9.7, r0: 15.2, r1: 15.8 },
  );

  // Billboards along the back: a wide slot on the left, a narrower one right.
  const slots = [
    { c0: 0.8, c1: 7.2 },
    { c0: 8.6, c1: 12.2 },
  ];
  village.boards.slice(0, 2).forEach((board, index) => {
    const slot = slots[index];
    const { w, h } = boardSize(board.kind, slot.c1 - slot.c0);
    const c0 = (slot.c0 + slot.c1) / 2 - w / 2;
    const r0 = 1.6;
    const z0 = 1.1;
    put(box(c0 + 0.35, r0, 0, 0.2, 0.2, z0), "dark");
    put(box(c0 + w - 0.55, r0, 0, 0.2, 0.2, z0), "dark");
    solids.push({
      kind: "board",
      board,
      box: { c0: c0 + oc, c1: c0 + w + oc, r0: r0 + or, r1: r0 + 0.2 + or, z0, z1: z0 + h },
    });
    const captionSize = 0.34;
    write(
      c0 + w / 2 - textWidth(board.caption, captionSize) / 2,
      2.55,
      board.caption,
      captionSize,
      "muted",
    );
    spot(`board-${index}`, "board", sentenceCase(board.caption.toLowerCase()), board.detail, {
      c0,
      c1: c0 + w,
      r0,
      r1: r0 + 0.2,
    });
  });

  // Houses in the back-right corner, one per teammate, yours in colour.
  if (village.team) {
    const count = Math.min(village.team.size, 4);
    for (let i = 0; i < count; i++) {
      const c = 13.3 + (i % 2) * 1.4;
      const r = 0.25 + Math.floor(i / 2) * 1.3;
      put(box(c, r, 0, 0.9, 0.9, 0.65), "stone");
      put(box(c - 0.05, r - 0.05, 0.65, 1.0, 1.0, 0.22), i === 0 ? "accent" : "muted");
    }
    spot(
      "houses",
      "houses",
      `Team of ${village.team.size}`,
      village.team.you,
      { c0: 13.25, c1: 15.7, r0: 0.2, r1: 2.5 },
    );
  }

  // Towers down the right, smallest at the back so none hides a board, each
  // with its number painted on clear floor in front of it.
  const order = { s: 0, m: 1, l: 2 };
  const towers = village.metrics
    .slice(0, 3)
    .sort((a, b) => order[a.size] - order[b.size]);
  let front = 12.4;
  const placed: { r0: number; text: number }[] = [];
  for (let i = towers.length - 1; i >= 0; i--) {
    const { w } = TOWER[towers[i].size];
    const r0 = front - 0.65 - w;
    placed[i] = { r0, text: front };
    // The next label back must clear this tower's left edge on screen.
    front = r0 - w - 0.2;
  }
  towers.forEach((metric, i) => {
    const { w, h } = TOWER[metric.size];
    const c0 = 12.6;
    put(box(c0, placed[i].r0, 0, w, w, h), metric.size === "l" ? "accent" : "accent2");
    write(c0, placed[i].text, metric.value, 0.5, "accent");
    spot(
      `tower-${metric.label}`,
      "tower",
      `${metric.value} ${metric.label}`,
      metric.detail,
      { c0, c1: c0 + w, r0: placed[i].r0, r1: placed[i].r0 + w },
    );
  });

  // The market row down the left: core tools stand taller.
  village.tools.slice(0, 5).forEach((tool, i) => {
    const r0 = 3.4 + i * 1.9;
    const h = tool.core ? 1.6 : 1.0;
    put(box(0.6, r0, 0, 1.4, 1.4, h), "stall");
    put(box(0.52, r0 - 0.08, h, 1.56, 1.56, 0.16), tool.core ? "accent" : "accent2");
    write(2.35, r0 + 1.1, tool.name.toUpperCase(), 0.38, "ink");
    spot(
      `tool-${tool.name}`,
      "stall",
      tool.name,
      tool.detail ??
        (tool.core
          ? `One of the core tools behind ${village.name}.`
          : `Used alongside the core stack on ${village.name}.`),
      { c0: 0.6, c1: 2.0, r0, r1: r0 + 1.4 },
    );
  });

  // Plaques either side of the road, sized to their words.
  const clock = village.hours !== undefined;
  const plaqueSlots = [
    { c0: 0.8, max: 5.3, r0: 13.3 },
    { c0: 10.0, max: clock ? 4.2 : 5.6, r0: 13.3 },
    { c0: 0.8, max: 5.3, r0: 14.5 },
    { c0: 10.0, max: clock ? 4.2 : 5.6, r0: 14.5 },
  ];
  village.points.slice(0, 4).forEach((point, i) => {
    const slot = plaqueSlots[i];
    let size = 0.34;
    while (textWidth(point.label, size) > slot.max - 0.4 && size > 0.2) size -= 0.02;
    const w = Math.min(slot.max, textWidth(point.label, size) + 0.4);
    put(box(slot.c0, slot.r0, 0, w, 0.8, 0.05), "paper");
    write(slot.c0 + 0.2, slot.r0 + 0.55, point.label, size, "ink", 0.05);
    spot(
      `point-${i}`,
      "plaque",
      sentenceCase(point.label.toLowerCase()),
      point.text,
      { c0: slot.c0, c1: slot.c0 + w, r0: slot.r0, r1: slot.r0 + 0.8 },
      0.5,
    );
  });

  // The clock tower in the front-right corner.
  if (clock) {
    put(box(14.4, 13.1, 0, 1.2, 1.2, 2.6), "stone");
    put(box(14.3, 13.0, 2.6, 1.4, 1.4, 0.28), "roof");
    put(box(14.75, 14.3, 1.7, 0.5, 0.03, 0.5), "paper");
    write(14.2, 15.1, `${village.hours} HRS`, 0.4, "muted");
    spot("clock", "clock", `${village.hours} hours`, `About ${village.hours} hours went into ${village.name}.`, {
      c0: 14.4,
      c1: 15.6,
      r0: 13.1,
      r1: 14.3,
    });
  }

  // The signpost beside the gate, one board per link.
  if (village.links?.length) {
    put(box(5.6, 15.3, 0, 0.14, 0.14, 1.6), "dark");
    village.links.slice(0, 3).forEach((_, i) => {
      put(box(5.1, 15.26, 1.25 - i * 0.42, 1.1, 0.06, 0.3), i === 0 ? "accent" : "accent2");
    });
    spot(
      "signpost",
      "signpost",
      "Links",
      village.links.map((link) => link.label).join(" · ") + ". Press E to open them.",
      { c0: 5.6, c1: 5.74, r0: 15.3, r1: 15.44 },
    );
  }

  // Anything standing on the ground blocks the tiles under it, and so do
  // the boards, so the chicken never walks through their frames.
  const blocked = new Set<string>();
  for (const solid of solids) {
    const b = solid.box;
    const grounded = b.z0 <= 0.3 && b.z1 - b.z0 >= 0.25;
    if (!grounded && solid.kind !== "board") continue;
    for (let c = Math.floor(b.c0 + 1e-6); c < Math.ceil(b.c1 - 1e-6); c++) {
      for (let r = Math.floor(b.r0 + 1e-6); r < Math.ceil(b.r1 - 1e-6); r++) {
        blocked.add(`${c},${r}`);
      }
    }
  }

  return {
    village,
    col: oc,
    row: or,
    flats,
    solids: sortBackToFront(solids),
    spots,
    plaza: {
      c0: PLAZA.c0 + oc,
      c1: PLAZA.c1 + oc,
      r0: PLAZA.r0 + or,
      r1: PLAZA.r1 + or,
    },
    blocked,
  };
}

export const PLANS: VillagePlan[] = VILLAGES.map(planVillage);

/** The village whose lot contains the tile (col, row), if any. */
export function planAt(col: number, row: number) {
  return (
    PLANS.find(
      (plan) =>
        col >= plan.col &&
        col < plan.col + LOT &&
        row >= plan.row &&
        row < plan.row + LOT,
    ) ?? null
  );
}

export function isBlocked(col: number, row: number) {
  const plan = planAt(col, row);
  return plan ? plan.blocked.has(`${col},${row}`) : false;
}

/** What the chicken is beside on tile (col, row) of a village, if anything. */
export function spotAt(plan: VillagePlan, col: number, row: number) {
  const x = col + 0.5;
  const y = row + 0.5;
  let best: Spot | null = null;
  let bestDistance = Infinity;
  for (const spot of plan.spots) {
    const dx = Math.max(spot.area.c0 - x, 0, x - spot.area.c1);
    const dy = Math.max(spot.area.r0 - y, 0, y - spot.area.r1);
    const distance = Math.hypot(dx, dy);
    if (distance <= spot.reach && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

export function onPlaza(plan: VillagePlan, col: number, row: number) {
  return (
    col >= plan.plaza.c0 &&
    col < plan.plaza.c1 &&
    row >= plan.plaza.r0 &&
    row < plan.plaza.r1
  );
}
