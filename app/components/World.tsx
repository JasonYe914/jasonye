"use client";

import { useEffect, useRef } from "react";
import { drawChicken } from "./chicken";
import {
  createFloor,
  drawFloor,
  floorAdded,
  floorChanged,
  floorDropped,
  tileKey,
  type Tile,
} from "./floor";
import {
  HALF_H,
  HALF_W,
  TILE_SIDE,
  project,
  tileCenter,
  type Direction,
  GRID_TILES,
  sameSquare,
  squareCenter,
} from "./iso";
import { INTRO_SKIPPED_EVENT, intro } from "./introState";
import { INTRO_LANDED_EVENT, drawKeyHints } from "./keyHints";
import { drawMinimap, mapFrame, mapToWorld, type MapFrame } from "./minimap";
import { HOME, NAME_TILES, drawName, fitZoom, overviewZoom } from "./name";
import { blockedAt } from "./obstacles";
import { pixelRatio } from "./pixelRatio";
import { clampToWorld, inFloor, minZoomToFill } from "./worldEdge";
import {
  drawMini,
  miniSpot,
  spawnMinis,
  updateMinis,
  type Mini,
} from "./minis";
import { shortestPath, type Cell } from "./pathfinding";
import {
  actorNear,
  drawPlaceFloor,
  drawPlaceSolids,
  placeMiddle,
  placesIn,
  type Place,
} from "./places";
import { drawProp, propAtPoint, propsIn } from "./props";
import { mixHex, readPalette, watchTheme, type Palette } from "./theme";
import {
  boardFloorAt,
  drawVillageFloors,
  demosPlaying,
  drawVillageSolids,
  hoverBoards,
  hoverMatters,
  readVillageInk,
  stepBoardTilts,
  setImageReadyHandler,
  whenFontsReady,
  visiblePlans,
  type VillageInk,
} from "./villageDraw";
import {
  PLANS,
  onPlaza,
  planAt,
  spotAt,
  type VillagePlan,
} from "./villageLayout";
import { LOT } from "./villages";
import { worldSettings } from "./worldSettings";
import {
  TRAVEL_EVENT,
  WORLD_COVER_EVENT,
  ZOOM_EVENT,
  isWorldCovered,
  villageStore,
} from "./villageStore";

/** How long one step between tiles takes. */
const STEP_MS = 225;
/**
 * How long the view takes to drift to where it is going. Each step while
 * walking starts a fresh drift from wherever the view is, so it glides
 * along behind the chicken rather than lurching.
 */
const PAN_MS = 650;
/**
 * While Space is held the view chases the chicken, closing the gap with
 * this time constant: it catches up in about a third of a second from
 * wherever it was, then trails a walking chicken by a fraction of a tile.
 */
const CHASE_MS = 90;
/** How long a new block takes to rise out of the fog. */
const RISE_MS = 600;
/** How far below the floor a new block starts. */
const RISE_PX = 48;
/** Height of a block's side, which only shows while the block is rising. */
const LIP = 5;
/**
 * The chicken roams freely within this share of the way from the middle of
 * the view to the window edge. Past it, the view follows, moving only as
 * far as it must to keep the chicken inside. Somewhere between the middle
 * and the edge, so new floor rises in ahead of the chicken without the view
 * moving while it is still near the middle.
 */
const FOLLOW_ZONE = 0.6;
const HOP_PX = 12;
/** How far each wing swings at the top of a flap, in degrees. */
const FLAP_DEG = 35;
/** How many flaps the wings make during one step. */
const FLAPS_PER_STEP = 2;
/** Wait after the intro hands over before the key hints start to show. */
const HINT_DELAY_MS = 250;
/** How long a prop takes to pop up out of the floor. */
const PROP_POP_MS = 480;
/**
 * Once the intro is over the props pop up in a ripple out from the chicken,
 * this much later per tile away, up to a limit.
 */
const PROP_RIPPLE_MS = 40;
const PROP_RIPPLE_MAX_MS = 900;
/** How long the view takes to ease out to fit a village, or back in. */
const ZOOM_MS = 700;
/**
 * The view a village needs, in world pixels: its lot is about 1830 wide and
 * 1390 tall on screen counting its tallest buildings, plus a margin.
 */
const VILLAGE_VIEW = { width: 2100, height: 1500 };
/** How far above the lot's middle the view centres, for the tall things. */
const VILLAGE_LIFT = 140;
/**
 * A village's facts: how long after arriving they start to fade in (so the
 * zoom has mostly settled), how long each takes, how much later each line
 * follows the one above, and how long they take to fade out on leaving.
 */
const FACTS_DELAY_MS = 350;
const FACTS_IN_MS = 320;
const FACTS_STAGGER_MS = 70;
const FACTS_OUT_MS = 200;
/** How long the view takes to ease to a new wheel zoom. */
const WHEEL_ZOOM_MS = 180;
/** Zoom per pixel scrolled, so a notch of about 100 px is about 14%. */
const WHEEL_RATE = 0.0015;
/** The furthest the wheel may zoom out, as a share of the settled zoom. */
const MIN_WHEEL_SCALE = 0.6;
/**
 * The furthest the wheel may zoom in, as a share of the settled zoom. The
 * home view starts well zoomed out, so this reaches past the name's own fit.
 */
const MAX_WHEEL_SCALE = 4;
/** How long the view takes to pull back to the overview after the intro. */
const OVERVIEW_MS = 1400;
/** The lowest zoom the view will ever use, wheel or not. */
const MIN_VIEW_ZOOM = 0.15;
/**
 * Edge scrolling on the minimap, as in a strategy game: with the mouse
 * within this many pixels of the map's edge, the view slides that way.
 */
const EDGE_PX = 14;
/** How fast it slides with the mouse right at the edge, in window pixels a second. */
const EDGE_SPEED = 1100;
/** How long the camera's box on the minimap takes to brighten on hover. */
const MAP_HOVER_MS = 200;
/** How often blocks left behind by a slide are dropped, at most. */
const EDGE_CULL_MS = 800;
/**
 * How long a full-page panel takes to fade in over the world. The world
 * keeps drawing until then, since it still shows through, and stops after.
 */
const COVER_FADE_MS = 260;

/**
 * Blocks that have already risen once this visit. When the view comes back
 * to them (after zooming in and out again, walking away and back, or
 * leaving for a project's page and coming back) they are simply there,
 * without rising a second time. Outside the world, so it outlives the
 * world being taken down and set up again; only a reload clears it.
 */
const risen = new Set<number>();

/**
 * Where the chicken and the view were when the world was last taken down
 * (on leaving for a project's page), so coming back opens right there
 * rather than at the name. Only a reload clears it.
 */
let savedSpot: {
  col: number;
  row: number;
  facing: Direction;
  /** Where the view was centred, or heading. */
  x: number;
  y: number;
  wheelScale: number;
  /** Which buildings of each village the chicken had stood beside. */
  visited: Map<string, Set<string>>;
} | null = null;
/** How many tiles a path may stray past the box round its two ends. */
const PATH_MARGIN = 16;
/**
 * A right-click on something solid walks to the nearest open tile instead:
 * looked for this many tiles round the click, trying at most this many.
 */
const OPEN_REACH = 10;
const OPEN_TRIES = 12;
/**
 * Touch: a finger that strays less than this many window pixels and lifts
 * within TAP_MS is a tap, which walks there; further, it drags the view.
 */
const TAP_SLOP = 10;
const TAP_MS = 500;
/** How long after a tap its trailing click is ignored, so it isn't handled twice. */
const TAP_CLICK_MS = 800;
/**
 * The least reach, in window pixels, of a tap on the chicken from its
 * middle, so a fingertip finds it even when the view is zoomed far out.
 */
const CHICKEN_TAP_PX = 24;
/** How long the cross on an unreachable tile stays before it fades. */
const NO_PATH_MS = 700;
/**
 * How much bigger the no-way-there cross is drawn
 * than one tile would suggest, to match the floor's 2 × 2 tile squares.
 */
const MARKER_SCALE = 2;

// On screen: W = up-right, A = up-left, S = down-left, D = down-right.
// The arrow keys do the same as the letters in their places on the keyboard.
// Keys are matched lower-cased, so "ArrowUp" is "arrowup".
const KEY_DIRECTIONS: Record<string, Direction> = {
  w: [0, -1],
  a: [-1, 0],
  s: [0, 1],
  d: [1, 0],
  arrowup: [0, -1],
  arrowleft: [-1, 0],
  arrowdown: [0, 1],
  arrowright: [1, 0],
};

/** The key that steps (dc, dr), so a path is walked the same way the keys walk. */
const STEP_KEYS: Record<string, string> = {
  "0,-1": "w",
  "-1,0": "a",
  "0,1": "s",
  "1,0": "d",
};

type Bounds = { x0: number; x1: number; y0: number; y1: number };

/** Something drawn in depth order around the chicken. */
type Paint = { depth: number; paint: () => void };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function progress(start: number, duration: number, now: number) {
  return duration <= 0 ? 1 : clamp01((now - start) / duration);
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Overshoots a little before settling, for a pop. */
function easeOutBack(t: number) {
  return 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
}

/** The minimap's canvas and the coordinates shown under it. */
type MapParts = { canvas: HTMLCanvasElement; coords: HTMLElement };

/** Adds one block's top face to the current path, or `size` tiles' worth. */
function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 1,
) {
  ctx.moveTo(x, y - HALF_H * size);
  ctx.lineTo(x + HALF_W * size, y);
  ctx.lineTo(x, y + HALF_H * size);
  ctx.lineTo(x - HALF_W * size, y);
  ctx.closePath();
}

/**
 * Runs the scene on a canvas. The floor is a cached pattern fill (see
 * floor.ts) and the rest is drawn directly each frame. Frames are only
 * scheduled while something is actually moving.
 */
function startWorld(canvas: HTMLCanvasElement, map: MapParts) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  const mapCtx = map.canvas.getContext("2d");
  let shownCoords = "";
  /** What the minimap last showed, so unchanged frames can skip it. */
  const shownMap: { key: string; colors: Palette | null } = {
    key: "",
    colors: null,
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animated = (ms: number) => (reducedMotion.matches ? 0 : ms);

  // The scene is scaled so the whole name fits the window. `width` and
  // `height` are the size of the view in world pixels, not window pixels.
  let zoom = 1;
  let width = 0;
  let height = 0;
  let colors: Palette = readPalette();
  let ink: VillageInk = readVillageInk();
  let frame = 0;
  // The zoom of the home view: fitted to the name while the intro plays,
  // then pulled back to take in the villages round it. Inside a village the
  // view eases to fit the whole village, and back on leaving.
  let baseZoom = 1;
  /** Whether the intro is over, so home is the wider overview. */
  let overview = false;
  const zooming = {
    from: 1,
    to: 1,
    start: -Infinity,
    active: false,
    ms: ZOOM_MS,
  };
  /** How far the wheel has zoomed from the settled view; 1 is none. */
  let wheelScale = 1;
  /** The tiles still to walk on a right-click route, next first. */
  let route: Cell[] = [];
  /** The tile last right-clicked, for its marker. */
  let goal: (Cell & { at: number; reachable: boolean }) | null = null;
  /** The little Claudes hopping about. */
  const minis: Mini[] = [];
  /** The village the chicken is in, if any. */
  let inVillage: VillagePlan | null = null;
  /**
   * Villages whose facts are fading in or shown (`on`), or fading out from
   * `from`. A village leaves the map once faded out. `factsFor` is the
   * village they were last set for, so a change of village is noticed.
   */
  const facts = new Map<VillagePlan, { on: boolean; at: number; from: number }>();
  let factsFor: VillagePlan | null = null;
  let factsMoving = false;
  /** Which buildings of each village the chicken has stood beside. */
  const visited = savedSpot?.visited ?? new Map<string, Set<string>>();

  const tiles = new Map<number, Tile>();
  /**
   * When a full-page panel last covered the world, or null while the world
   * shows. Covered from the start if the world mounts under an open panel.
   */
  let coveredAt: number | null = isWorldCovered() ? -Infinity : null;
  /** The settled floor's cached path. */
  const floor = createFloor();
  // The view opens on the name, with the chicken standing beside it.
  const camera = {
    x: HOME.x,
    y: HOME.y,
    fromX: HOME.x,
    fromY: HOME.y,
    toX: HOME.x,
    toY: HOME.y,
    panStart: -Infinity,
    panning: false,
  };
  const chicken = {
    col: 0,
    row: 0,
    fromCol: 0,
    fromRow: 0,
    facing: KEY_DIRECTIONS.s,
    moveStart: -Infinity,
  };
  // Movement keys currently held, most recent last, plus one tapped mid-step.
  const held: string[] = [];
  // The movement keys, painted around the chicken once the intro is over
  // and cleared away as soon as it takes its first step.
  const hints = {
    anchor: null as { col: number; row: number } | null,
    shownAt: 0,
    hiddenAt: null as number | null,
  };
  let hintInk = "";
  // The props stay hidden until the intro is over, then pop up in a ripple
  // out from where the chicken stands.
  let propsFrom = Infinity;
  let queued: string | null = null;
  /**
   * Edge scrolling: which way the mouse is pushing the view, each from -1
   * to 1, and when the slide last moved and last dropped blocks.
   */
  const edge = { x: 0, y: 0, last: 0, culled: 0 };
  /**
   * Space held: the view is locked on the chicken, and when it last moved.
   * Released, the view stays where it is and the usual following resumes.
   */
  const chase = { held: false, last: 0 };
  /** Easing the minimap out on hover and back: 0 is at rest, 1 pulled back. */
  const mapHover = { from: 0, to: 0, at: -Infinity };
  /** The minimap's framing as a drag on it began, kept for the drag. */
  let mapDrag: { frame: MapFrame; pointer: number } | null = null;
  /** A phone or tablet: no keys to hint at, and fingers instead of a mouse. */
  const touchScreen = window.matchMedia("(pointer: coarse)");
  /** Fingers on the world, by pointer id: where each was last seen. */
  const fingers = new Map<number, { x: number; y: number }>();
  /**
   * What the fingers on the world are doing: maybe a tap (where and when it
   * began), dragging the view, or pinching to zoom.
   */
  let gesture:
    | { kind: "tap"; x: number; y: number; at: number }
    | { kind: "drag" }
    | { kind: "pinch" }
    | null = null;
  /** When a tap was last handled, so the click the browser sends after it is ignored. */
  let tappedAt = -Infinity;

  /** Everything a view centred on (cx, cy) can show, with room for edges. */
  function viewBounds(cx: number, cy: number): Bounds {
    return {
      x0: cx - width / 2 - HALF_W,
      x1: cx + width / 2 + HALF_W,
      y0: cy - height / 2 - HALF_H - LIP,
      y1: cy + height / 2 + HALF_H,
    };
  }

  function union(a: Bounds, b: Bounds): Bounds {
    return {
      x0: Math.min(a.x0, b.x0),
      x1: Math.max(a.x1, b.x1),
      y0: Math.min(a.y0, b.y0),
      y1: Math.max(a.y1, b.y1),
    };
  }

  function addTile(col: number, row: number, born: number, fixed: boolean) {
    const { x, y } = tileCenter(col, row);
    const tile: Tile = { col, row, x, y, born, fixed, settled: false };
    tiles.set(tileKey(col, row), tile);
    floorAdded(floor, tile);
  }

  // The floor under the name is always there, so the letters never hang
  // over the fog while blocks rise back in around them.
  for (let row = NAME_TILES.r0; row < NAME_TILES.r1; row++) {
    for (let col = NAME_TILES.c0; col < NAME_TILES.c1; col++) {
      addTile(col, row, -Infinity, true);
    }
  }

  /**
   * The area last filled with blocks. Everything inside it is known to be
   * there (until a cull trims it), so a fill only has to scan the strips
   * of a new area that reach outside it.
   */
  let filled: Bounds | null = null;

  /**
   * Adds any missing blocks inside `area`; existing ones are left alone.
   * Blocks seen before come back already in place; new ones rise.
   */
  function fill(
    area: Bounds,
    now: number,
    delay: (x: number, y: number) => number,
  ) {
    const known = filled;
    if (!known || known.x0 >= known.x1 || known.y0 >= known.y1) {
      fillArea(area, now, delay);
    } else {
      // The parts of `area` outside `known`: a band above, a band below,
      // and the two sides of the middle.
      const midY0 = Math.max(area.y0, known.y0);
      const midY1 = Math.min(area.y1, known.y1);
      if (area.y0 < known.y0)
        fillArea(
          { ...area, y1: Math.min(area.y1, known.y0 + HALF_H) },
          now,
          delay,
        );
      if (area.y1 > known.y1)
        fillArea(
          { ...area, y0: Math.max(area.y0, known.y1 - HALF_H) },
          now,
          delay,
        );
      if (midY0 < midY1) {
        if (area.x0 < known.x0)
          fillArea(
            {
              x0: area.x0,
              x1: Math.min(area.x1, known.x0 + HALF_W),
              y0: midY0,
              y1: midY1,
            },
            now,
            delay,
          );
        if (area.x1 > known.x1)
          fillArea(
            {
              x0: Math.max(area.x0, known.x1 - HALF_W),
              x1: area.x1,
              y0: midY0,
              y1: midY1,
            },
            now,
            delay,
          );
      }
    }
    filled = area;
  }

  /** Adds any missing blocks inside `area`, scanning all of it. */
  function fillArea(
    area: Bounds,
    now: number,
    delay: (x: number, y: number) => number,
  ) {
    // A tile's centre sits at x = (col - row) * HALF_W, y = (col + row + 1) * HALF_H.
    const uMin = Math.ceil(area.x0 / HALF_W);
    const uMax = Math.floor(area.x1 / HALF_W);
    const vMin = Math.ceil(area.y0 / HALF_H) - 1;
    const vMax = Math.floor(area.y1 / HALF_H) - 1;

    for (let v = vMin; v <= vMax; v++) {
      for (let u = uMin; u <= uMax; u++) {
        if ((u + v) % 2 !== 0) continue;
        const col = (u + v) / 2;
        const row = (v - u) / 2;
        if (!inFloor(col, row)) continue;
        const key = tileKey(col, row);
        if (tiles.has(key)) continue;
        if (risen.has(key)) {
          addTile(col, row, -Infinity, false);
          continue;
        }
        const delayMs = delay(u * HALF_W, (v + 1) * HALF_H);
        addTile(col, row, now + animated(delayMs), false);
      }
    }
  }

  /** Drops every block outside `area`, except the ones under the name. */
  function cull(area: Bounds) {
    // Only what is still inside both is known to be filled now.
    if (filled) {
      filled = {
        x0: Math.max(filled.x0, area.x0),
        x1: Math.min(filled.x1, area.x1),
        y0: Math.max(filled.y0, area.y0),
        y1: Math.min(filled.y1, area.y1),
      };
    }
    let dropped = false;
    const now = performance.now();
    for (const [key, tile] of tiles) {
      if (tile.fixed) continue;
      if (
        tile.x < area.x0 ||
        tile.x > area.x1 ||
        tile.y < area.y0 ||
        tile.y > area.y1
      ) {
        // Anything that has started rising has been seen, even if the view
        // slid off it mid-rise (as edge scrolling and the minimap do), so
        // it comes back already in place. Only blocks still waiting their
        // turn, never shown, rise when next seen.
        if (tile.settled || tile.born <= now) risen.add(key);
        tiles.delete(key);
        floorDropped(floor, tile);
        dropped = true;
      }
    }
    if (dropped) floorChanged(floor);
  }

  /**
   * Starts drifting the view to centre on `target`, by default the chicken.
   * Blocks are added for the whole stretch the view will sweep across,
   * timed so the nearest rise first, and anything already out of sight is
   * dropped.
   */
  function recenter(
    now: number,
    wanted = tileCenter(chicken.col, chicken.row),
  ) {
    const [w, h] = targetView();
    const target = clampToWorld(wanted.x, wanted.y, w, h);
    const oldView = viewBounds(camera.toX, camera.toY);

    camera.fromX = camera.x;
    camera.fromY = camera.y;
    camera.toX = target.x;
    camera.toY = target.y;
    camera.panStart = now;
    camera.panning = true;

    const sweep = union(
      viewBounds(camera.x, camera.y),
      viewBounds(target.x, target.y),
    );
    cull(sweep);
    fill(sweep, now, (x, y) => {
      const beyond = Math.hypot(
        Math.max(oldView.x0 - x, x - oldView.x1, 0),
        Math.max(oldView.y0 - y, y - oldView.y1, 0),
      );
      return Math.min(beyond * 0.8, 350) + Math.random() * 120;
    });
  }

  /** The zoom at which a village fits the window. */
  function villageZoom() {
    return Math.max(
      0.2,
      Math.min(
        window.innerWidth / VILLAGE_VIEW.width,
        window.innerHeight / VILLAGE_VIEW.height,
      ),
    );
  }

  /**
   * The zoom the view settles at, fitted to the name or the village and
   * multiplied by the wheel's.
   */
  function settledZoom() {
    return Math.max(
      MIN_VIEW_ZOOM,
      fillZoom(),
      (inVillage ? villageZoom() : baseZoom) * wheelScale,
    );
  }

  /** The least zoom that keeps the whole window over the world's floor. */
  function fillZoom() {
    return minZoomToFill(window.innerWidth, window.innerHeight);
  }

  /** The window's size in world pixels at the zoom the view is heading for. */
  function targetView(): [number, number] {
    const z = Math.max(zooming.active ? zooming.to : zoom, fillZoom());
    return [window.innerWidth / z, window.innerHeight / z];
  }

  function setZoom(value: number) {
    zoom = Math.max(value, fillZoom());
    width = window.innerWidth / zoom;
    height = window.innerHeight / zoom;
  }

  function zoomTo(target: number, now: number, ms = ZOOM_MS) {
    if (Math.abs(target - zoom) < 1e-3) {
      zooming.active = false;
      setZoom(target);
      return;
    }
    zooming.ms = ms;
    zooming.from = zoom;
    zooming.to = target;
    zooming.start = now;
    zooming.active = true;
  }

  /** Where the view centres to show a whole village. */
  function villageFrame(plan: VillagePlan) {
    const middle = project(plan.col + LOT / 2, plan.row + LOT / 2);
    return { x: middle.x, y: middle.y - VILLAGE_LIFT };
  }

  /** Tells the cards what the chicken is beside, and counts the visit. */
  function updateFocus() {
    const plan = planAt(chicken.col, chicken.row);
    if (!plan) {
      villageStore.setFocus(null);
      return;
    }
    const spot = spotAt(plan, chicken.col, chicken.row);
    const plaza = onPlaza(plan, chicken.col, chicken.row);
    const id = plan.village.id;
    const seen = visited.get(id) ?? new Set<string>();
    if (spot) seen.add(spot.id);
    else if (plaza) seen.add("plaza");
    visited.set(id, seen);
    villageStore.setFocus({
      villageId: id,
      spot,
      onPlaza: plaza,
      visited: seen.size,
      total: plan.spots.length + 1,
    });
  }

  /**
   * The view stays put while the chicken is near the middle. Once it
   * strays further, the view shifts just enough to keep it in that zone,
   * about a tile per step, and the floor fills in along the leading edge.
   */
  function follow(now: number, w = width, h = height) {
    const at = tileCenter(chicken.col, chicken.row);
    const over = (offset: number, reach: number) =>
      Math.sign(offset) * Math.max(0, Math.abs(offset) - reach);
    const shiftX = over(at.x - camera.toX, (w / 2) * FOLLOW_ZONE);
    const shiftY = over(at.y - camera.toY, (h / 2) * FOLLOW_ZONE);
    if (shiftX !== 0 || shiftY !== 0) {
      recenter(now, { x: camera.toX + shiftX, y: camera.toY + shiftY });
    }
  }

  /**
   * Where the view centres to sit on the chicken as drawn now, part-way
   * through its step, kept where the window stays over the world.
   */
  function chickenAt(now: number) {
    const moved = progress(chicken.moveStart, animated(STEP_MS), now);
    const at = project(
      chicken.fromCol + (chicken.col - chicken.fromCol) * moved + 0.5,
      chicken.fromRow + (chicken.row - chicken.fromRow) * moved + 0.5,
    );
    const [w, h] = targetView();
    return clampToWorld(at.x, at.y, w, h);
  }

  /** Whether Space is held and the view still has catching up to do. */
  function chasing(now: number) {
    if (!chase.held) return false;
    const at = chickenAt(now);
    return Math.hypot(at.x - camera.x, at.y - camera.y) > 0.25;
  }

  /** Takes one step, or turns to face what blocks it; false if it could not move. */
  function step(facing: Direction, now: number) {
    // It has found the keys, so the hints can go.
    if (hints.anchor && hints.hiddenAt === null) hints.hiddenAt = now;
    villageStore.closeSheet();

    // Buildings and props are solid: the chicken turns to face one but
    // stays put.
    const nextCol = chicken.col + facing[0];
    const nextRow = chicken.row + facing[1];
    if (blockedAt(nextCol, nextRow)) {
      if (chicken.facing !== facing) {
        chicken.facing = facing;
        chicken.fromCol = chicken.col;
        chicken.fromRow = chicken.row;
      }
      return false;
    }

    chicken.fromCol = chicken.col;
    chicken.fromRow = chicken.row;
    chicken.col += facing[0];
    chicken.row += facing[1];
    chicken.facing = facing;
    chicken.moveStart = now;
    updateFocus();

    // Inside a village the view frames the whole of it and holds still,
    // unless the wheel has zoomed in past it.
    const plan = planAt(chicken.col, chicken.row);
    if (plan !== inVillage) {
      inVillage = plan;
      zoomTo(settledZoom(), now);
      // Held on the chicken, the view doesn't frame the village.
      if (!chase.held) recenter(now, plan && wheelScale <= 1 ? villageFrame(plan) : undefined);
      return true;
    }

    if (!chase.held && (!plan || wheelScale > 1)) follow(now);
    return true;
  }

  /** How shown line `line` of a village's facts is, from 0 to 1. */
  function factShown(plan: VillagePlan, line: number, now: number) {
    const state = facts.get(plan);
    if (!state) return 0;
    if (state.on) {
      return progress(state.at + animated(FACTS_STAGGER_MS) * line, animated(FACTS_IN_MS), now);
    }
    return state.from * (1 - progress(state.at, animated(FACTS_OUT_MS), now));
  }

  /**
   * Fades the facts in for the village the chicken has just entered and out
   * for the one it left, and drops those that have faded out.
   */
  function stepFacts(now: number) {
    if (inVillage !== factsFor) {
      if (factsFor) {
        facts.set(factsFor, { on: false, at: now, from: factShown(factsFor, 0, now) });
      }
      if (inVillage) {
        facts.set(inVillage, { on: true, at: now + animated(FACTS_DELAY_MS), from: 0 });
      }
      factsFor = inVillage;
    }
    factsMoving = false;
    for (const [plan, state] of facts) {
      if (state.on) {
        const lines = plan.flats.filter((f) => f.kind === "text" && f.reveal !== undefined).length;
        if (factShown(plan, Math.max(0, lines - 1), now) < 1) factsMoving = true;
      } else if (factShown(plan, 0, now) > 0) {
        factsMoving = true;
      } else {
        facts.delete(plan);
      }
    }
  }

  function draw(now: number) {
    frame = 0;

    // Keep walking while a key is held, or take a step tapped mid-stride.
    const stepping = now - chicken.moveStart < STEP_MS;
    if (!stepping) {
      const key = held.at(-1) ?? queued;
      queued = null;
      if (key) step(KEY_DIRECTIONS[key], now);
      else if (route.length > 0) {
        const next = route[0];
        const facing =
          KEY_DIRECTIONS[
            STEP_KEYS[`${next.col - chicken.col},${next.row - chicken.row}`]
          ];
        if (facing && step(facing, now)) route.shift();
        else cancelRoute();
      }
    }
    updateMinis(
      minis,
      now,
      (col, row) =>
        blockedAt(col, row) || (col === chicken.col && row === chicken.row),
    );

    if (chase.held) {
      // Locked on the chicken where it is drawn, part-way through its step,
      // so the view glides with it instead of hopping tile to tile. This
      // wins over edge scrolling, as it would in a MOBA.
      const dt = chase.last ? Math.min(50, now - chase.last) : 16;
      chase.last = now;
      const at = chickenAt(now);
      const k = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / CHASE_MS);
      if (Math.hypot(at.x - camera.x, at.y - camera.y) > 0.25) {
        panTo(camera.x + (at.x - camera.x) * k, camera.y + (at.y - camera.y) * k, now);
      }
    } else if (edge.x !== 0 || edge.y !== 0) {
      const dt = edge.last ? Math.min(50, now - edge.last) : 16;
      edge.last = now;
      const distance = (EDGE_SPEED / zoom) * (dt / 1000);
      panTo(camera.x + edge.x * distance, camera.y + edge.y * distance, now);
    } else {
      edge.last = 0;
    }

    if (camera.panning) {
      const t = progress(camera.panStart, animated(PAN_MS), now);
      // Eases out only: a drift restarted mid-way carries straight on
      // instead of stalling and starting up again.
      const eased = easeOutCubic(t);
      camera.x = camera.fromX + (camera.toX - camera.fromX) * eased;
      camera.y = camera.fromY + (camera.toY - camera.fromY) * eased;
      if (t >= 1) {
        camera.panning = false;
        if (!zooming.active) cull(viewBounds(camera.toX, camera.toY));
      }
    }

    if (zooming.active) {
      const t = progress(zooming.start, animated(zooming.ms), now);
      const eased = easeOutCubic(t);
      setZoom(zooming.from + (zooming.to - zooming.from) * eased);
      // Floor fills in at once as the view widens; the fog hides the edge.
      fill(viewBounds(camera.x, camera.y), now, () => 0);
      if (t >= 1) {
        zooming.active = false;
        if (!camera.panning) cull(viewBounds(camera.toX, camera.toY));
      }
    }

    // Whatever moved the view, the window stays wholly over the world.
    const kept = clampToWorld(camera.x, camera.y, width, height);
    camera.x = kept.x;
    camera.y = kept.y;

    const scale = pixelRatio() * zoom;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2 - camera.x, height / 2 - camera.y);
    ctx.lineJoin = "round";
    // Grid lines stay one window pixel wide whatever the zoom.
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = colors.line;

    // The floor: one pattern fill for the settled blocks, a few batches for
    // those still rising. See floor.ts.
    const rising = drawFloor(ctx, floor, tiles, {
      now,
      view: viewBounds(camera.x, camera.y),
      riseMs: animated(RISE_MS),
      risePx: RISE_PX,
      lip: LIP,
      scale,
      zoom,
      colors,
    });

    if (
      goal &&
      (goal.reachable
        ? route.length === 0 && now - chicken.moveStart >= STEP_MS
        : now - goal.at >= NO_PATH_MS)
    ) {
      goal = null;
    }
    if (goal?.reachable) {
      // The route lies just above the floor, under everything else: the
      // villages, the places, the name and the chicken are all drawn after.
      // The marker fills the whole floor square clicked.
      const square = squareCenter(goal.col, goal.row);
      ctx.save();
      // Every floor square the route crosses is filled in, leaving out
      // the chicken's own square and the target's. The shade runs from
      // routeFar to routeNear as the squares near the target.
      const squares: Cell[] = [];
      let last = { col: chicken.col, row: chicken.row };
      for (const cell of route) {
        const skip =
          sameSquare(last.col, last.row, cell.col, cell.row) ||
          sameSquare(goal.col, goal.row, cell.col, cell.row);
        last = cell;
        if (!skip) squares.push(cell);
      }
      squares.forEach((cell, i) => {
        const c = squareCenter(cell.col, cell.row);
        ctx.fillStyle = mixHex(
          colors.routeFar,
          colors.routeNear,
          (i + 1) / (squares.length + 1),
        );
        ctx.beginPath();
        diamond(ctx, c.x, c.y, GRID_TILES);
        ctx.fill();
      });
      // The target itself takes the nearest shade.
      ctx.fillStyle = colors.routeNear;
      ctx.beginPath();
      diamond(ctx, square.x, square.y, GRID_TILES);
      ctx.fill();
      ctx.restore();
    }

    // The world's edge is not drawn: the chicken still can't cross it
    // (see worldEdge.ts), but the floor reads as carrying on unbroken.

    // Villages: their plazas, roads, plaques and painted words lie on the
    // floor; their buildings stand, and are drawn with the chicken below.
    const villages = visiblePlans(viewBounds(camera.x, camera.y));
    // Pictures tip towards the mouse. Found again every frame, so one
    // still under a resting mouse keeps up as the view moves.
    hoverBoards(
      villages,
      pointer && !mapDrag && animated(1) > 0
        ? worldAt(pointer.x, pointer.y)
        : null,
    );
    const tilting = stepBoardTilts(now);
    ctx.lineWidth = 1 / zoom;
    stepFacts(now);
    drawVillageFloors(ctx, villages, ink, (plan, line) => factShown(plan, line, now));

    // Props, places and minis pop up once their floor is in place, in a
    // ripple out from the chicken. Returns how grown the thing on tile
    // (col, row) is: 0 while still hidden.
    let popping = false;
    const popGrow = (col: number, row: number) => {
      const tile = tiles.get(tileKey(col, row));
      if (!tile) return 0;
      const ripple = Math.min(
        Math.hypot(col - chicken.col, row - chicken.row) * PROP_RIPPLE_MS,
        PROP_RIPPLE_MAX_MS,
      );
      const start = Math.max(
        tile.born + animated(RISE_MS) * 0.5,
        propsFrom + animated(ripple),
      );
      if (now < start) {
        if (propsFrom !== Infinity) popping = true;
        return 0;
      }
      const t = progress(start, animated(PROP_POP_MS), now);
      if (t < 1) popping = true;
      return easeOutBack(t);
    };

    // The courts, the library and the restaurant: their shadows and labels
    // lie with the ground; their floating cards are drawn with the props
    // below.
    const places: [Place, number][] = [];
    for (const place of placesIn(viewBounds(camera.x, camera.y))) {
      const middle = placeMiddle(place);
      const grow = popGrow(middle.col, middle.row);
      if (grow > 0) places.push([place, grow]);
    }
    for (const [place, grow] of places) drawPlaceFloor(ctx, place, grow, ink);

    // The floor square the chicken stands in is shaded, and outlined so it
    // still shows on the letters. When a step crosses into the next square,
    // the shade passes over to it mid-step.
    const moved = progress(chicken.moveStart, animated(STEP_MS), now);
    const from = squareCenter(chicken.fromCol, chicken.fromRow);
    const to = squareCenter(chicken.col, chicken.row);
    const standing: [{ x: number; y: number }, number][] = sameSquare(
      chicken.fromCol,
      chicken.fromRow,
      chicken.col,
      chicken.row,
    )
      ? [[to, 1]]
      : [
          [from, 1 - moved],
          [to, moved],
        ];
    for (const [tile, alpha] of standing) {
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      diamond(ctx, tile.x, tile.y, GRID_TILES);
      ctx.fillStyle = colors.here;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawName(ctx, colors);

    ctx.lineWidth = 1.25 / zoom;
    ctx.strokeStyle = colors.hereEdge;
    for (const [tile, alpha] of standing) {
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      diamond(ctx, tile.x, tile.y, GRID_TILES);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (goal && !goal.reachable) {
      // The cross for no way there sits on the clicked tile itself.
      const g = tileCenter(goal.col, goal.row);
      ctx.save();
      ctx.globalAlpha = 1 - progress(goal.at, NO_PATH_MS, now);
      ctx.lineWidth = 3 / zoom;
      ctx.lineCap = "round";
      ctx.strokeStyle = colors.strong;
      const dx = HALF_W * 0.35 * MARKER_SCALE;
      const dy = HALF_H * 0.35 * MARKER_SCALE;
      ctx.beginPath();
      ctx.moveTo(g.x - dx, g.y - dy);
      ctx.lineTo(g.x + dx, g.y + dy);
      ctx.moveTo(g.x + dx, g.y - dy);
      ctx.lineTo(g.x - dx, g.y + dy);
      ctx.stroke();
      ctx.restore();
    }

    // Drawn before the chicken, so it stands in front of the tiles behind it.
    let hinting = false;
    if (hints.anchor) {
      hinting = drawKeyHints(
        ctx,
        hints.anchor.col,
        hints.anchor.row,
        now - hints.shownAt,
        hints.hiddenAt === null ? null : now - hints.hiddenAt,
        { cap: colors.here, capEdge: colors.hereEdge, ink: hintInk },
        !reducedMotion.matches,
      );
      if (!hinting) hints.anchor = null;
    }

    // In grid space, the chicken takes up the middle of its tile.
    const midCol =
      chicken.fromCol + (chicken.col - chicken.fromCol) * moved + 0.5;
    const midRow =
      chicken.fromRow + (chicken.row - chicken.fromRow) * moved + 0.5;

    // Those behind the chicken are drawn before it, the rest after. A
    // place the chicken is on or beside is drawn with it, sorted in.
    const actorBox = {
      c0: midCol - 0.3,
      c1: midCol + 0.3,
      r0: midRow - 0.3,
      r1: midRow + 0.3,
      z0: 0,
      z1: 1.1,
    };
    const behind: Paint[] = [];
    const inFront: Paint[] = [];
    for (const prop of propsIn(viewBounds(camera.x, camera.y))) {
      const grow = popGrow(prop.col, prop.row);
      if (grow <= 0) continue;
      const isBehind =
        prop.col + 1 <= midCol - 0.3 || prop.row + 1 <= midRow - 0.3;
      (isBehind ? behind : inFront).push({
        depth: prop.col + prop.row + 1,
        paint: () => drawProp(ctx, prop, grow, colors.shadow, scale),
      });
    }
    let host: [Place, number] | null = null;
    for (const [place, grow] of places) {
      if (!host && actorNear(place, actorBox)) {
        host = [place, grow];
        continue;
      }
      const isBehind =
        place.col + place.w <= midCol - 0.3 ||
        place.row + place.d <= midRow - 0.3;
      (isBehind ? behind : inFront).push({
        depth: place.col + place.row + (place.w + place.d) / 2,
        paint: () => drawPlaceSolids(ctx, place, grow, null, ink),
      });
    }
    for (const mini of minis) {
      const spot = miniSpot(mini, now);
      const isBehind =
        spot.col + 0.2 <= midCol - 0.3 || spot.row + 0.2 <= midRow - 0.3;
      (isBehind ? behind : inFront).push({
        depth: spot.col + spot.row,
        paint: () => drawMini(ctx, mini, now, colors.shadow, scale),
      });
    }
    behind.sort((a, b) => a.depth - b.depth);
    inFront.sort((a, b) => a.depth - b.depth);
    ctx.lineWidth = 1 / zoom;
    for (const item of behind) item.paint();

    const chickenX = from.x + (to.x - from.x) * moved;
    const chickenY = from.y + (to.y - from.y) * moved;
    const paintChicken = () =>
      drawChicken(
        ctx,
        chickenX,
        chickenY,
        chicken.facing,
        Math.sin(Math.PI * moved) * animated(HOP_PX),
        colors.shadow,
        moved >= 1
          ? 0
          : -Math.sin(2 * Math.PI * (FLAPS_PER_STEP / 2) * moved) *
              animated((FLAP_DEG * Math.PI) / 180),
        // The rest of the walk (squash, waddle, feet) goes when motion is off.
        animated(1) > 0 ? moved : undefined,
      );
    ctx.lineWidth = 1 / zoom;
    const actor = { box: actorBox, draw: paintChicken };
    if (host) {
      drawPlaceSolids(ctx, host[0], host[1], actor, ink);
      ctx.lineWidth = 1 / zoom;
    }
    const sorted = drawVillageSolids(ctx, villages, ink, host ? null : actor);
    if (!host && !sorted) paintChicken();
    ctx.lineWidth = 1 / zoom;
    for (const item of inFront) item.paint();

    // The minimap only changes when the view, the chicken, its hover or the
    // colours do, so it is skipped on frames where only the floor is rising.
    const mapCol =
      chicken.fromCol + (chicken.col - chicken.fromCol) * moved + 0.5;
    const mapRow =
      chicken.fromRow + (chicken.row - chicken.fromRow) * moved + 0.5;
    const mapKey = `${camera.x.toFixed(1)}|${camera.y.toFixed(1)}|${width}|${height}|${pixelRatio()}|${mapCol.toFixed(3)}|${mapRow.toFixed(3)}|${chicken.facing}|${mapHoverAt(now).toFixed(3)}`;
    if (mapCtx && (mapKey !== shownMap.key || colors !== shownMap.colors)) {
      shownMap.key = mapKey;
      shownMap.colors = colors;
      drawMinimap(
        map.canvas,
        mapCtx,
        {
          cameraX: camera.x,
          cameraY: camera.y,
          viewWidth: width,
          viewHeight: height,
          // The middle of its tile, gliding along with it mid-step.
          chickenCol: mapCol,
          chickenRow: mapRow,
          facing: chicken.facing,
          viewAlpha: 0.55 + 0.45 * mapHoverAt(now),
        },
        colors,
      );
    }
    // x runs east (D), y runs north (W), matching the map's orientation.
    const x = chicken.col;
    const y = -chicken.row || 0;
    const coords = `${x},${y}`;
    if (coords !== shownCoords) {
      shownCoords = coords;
      const value = (n: number) => String(n).replace("-", "−");
      const label = (text: string) => {
        const element = document.createElement("b");
        element.textContent = text;
        return element;
      };
      map.coords.replaceChildren(
        label("X"),
        value(x),
        " ",
        label("Y"),
        value(y),
      );
      map.coords.setAttribute("aria-label", `Chicken position: x ${x}, y ${y}`);
    }

    const walking = now - chicken.moveStart < STEP_MS;
    if (
      rising ||
      camera.panning ||
      zooming.active ||
      walking ||
      hinting ||
      popping ||
      held.length > 0 ||
      queued ||
      route.length > 0 ||
      goal !== null ||
      minis.length > 0 ||
      tilting ||
      factsMoving ||
      demosPlaying() ||
      edge.x !== 0 ||
      edge.y !== 0 ||
      chasing(now) ||
      now - mapHover.at < MAP_HOVER_MS
    ) {
      schedule();
    }
  }

  /** Whether a panel has covered the world long enough that none of it shows. */
  function hidden(now: number) {
    return coveredAt !== null && now - coveredAt >= COVER_FADE_MS;
  }

  function schedule() {
    // Nothing is drawn behind a panel; uncovering schedules a frame again.
    if (hidden(performance.now())) return;
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function onCover(event: Event) {
    if ((event as CustomEvent<boolean>).detail) {
      coveredAt = performance.now();
    } else {
      coveredAt = null;
      schedule();
    }
  }

  /**
   * Puts the view's centre straight at (x, y), for edge scrolling and the
   * minimap. Floor rises in at once where the view now reaches, and blocks
   * left behind are dropped every so often rather than every frame. On a
   * touch screen new floor is simply there instead of rising: a phone
   * sliding the view fast can't keep up with hundreds of blocks rising.
   */
  function panTo(toX: number, toY: number, now: number) {
    const [w, h] = targetView();
    const { x, y } = clampToWorld(toX, toY, w, h);
    camera.panning = false;
    camera.x = camera.fromX = camera.toX = x;
    camera.y = camera.fromY = camera.toY = y;
    fill(viewBounds(x, y), now, touchScreen.matches ? () => -Infinity : () => 0);
    if (now - edge.culled > EDGE_CULL_MS) {
      edge.culled = now;
      cull(viewBounds(x, y));
    }
    schedule();
  }

  /** How hard the mouse at `at` pushes towards an edge `size` away: -1 to 1. */
  function edgePush(at: number, size: number) {
    const push = (depth: number) => 0.35 + 0.65 * Math.min(1, depth / EDGE_PX);
    if (at < EDGE_PX) return -push(EDGE_PX - at);
    if (at > size - EDGE_PX) return push(at - (size - EDGE_PX));
    return 0;
  }

  /**
   * Edge scrolling: the mouse in the thin band round the minimap's edge
   * slides the view that way. The map is drawn the way the screen is, so
   * its edges are the screen's.
   */
  function onWindowPointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    const over =
      event.target === map.canvas &&
      !mapDrag &&
      performance.now() >= propsFrom &&
      worldSettings.get().edgePan;
    if (!over) {
      setEdge(0, 0);
      return;
    }
    const box = map.canvas.getBoundingClientRect();
    const x = edgePush(event.clientX - box.left, box.width);
    const y = edgePush(event.clientY - box.top, box.height);
    // Corners push both ways at once, no faster than an edge.
    const length = Math.hypot(x, y);
    const scale = length > 0 ? Math.max(Math.abs(x), Math.abs(y)) / length : 0;
    setEdge(x * scale, y * scale);
  }

  function setEdge(x: number, y: number) {
    const was = edge.x !== 0 || edge.y !== 0;
    edge.x = x;
    edge.y = y;
    if (x !== 0 || y !== 0) schedule();
    else if (was) cull(viewBounds(camera.x, camera.y));
  }

  /** The mouse has left the window: stop sliding. */
  function onWindowPointerOut(event: PointerEvent) {
    if (!event.relatedTarget) setEdge(0, 0);
  }

  /** How far the camera's box has brightened for a hover, 0 to 1. */
  function mapHoverAt(now: number) {
    const t = progress(mapHover.at, animated(MAP_HOVER_MS), now);
    return mapHover.from + (mapHover.to - mapHover.from) * easeOutCubic(t);
  }

  function setMapHover(to: number) {
    const now = performance.now();
    mapHover.from = mapHoverAt(now);
    mapHover.to = to;
    mapHover.at = now;
    schedule();
  }

  function onMapPointerEnter(event: PointerEvent) {
    if (event.pointerType === "mouse") setMapHover(1);
  }

  function onMapPointerLeave() {
    if (!mapDrag) setMapHover(0);
  }

  /** How the minimap is laid over the world right now. */
  function currentMapFrame() {
    return mapFrame(map.canvas.clientWidth, map.canvas.clientHeight, {
      cameraX: camera.x,
      cameraY: camera.y,
      viewWidth: width,
      viewHeight: height,
      chickenCol: chicken.col + 0.5,
      chickenRow: chicken.row + 0.5,
    });
  }

  /** The world point under a window point on the minimap, for a framing. */
  function mapPoint(frame: MapFrame, clientX: number, clientY: number) {
    const box = map.canvas.getBoundingClientRect();
    return mapToWorld(
      frame,
      box.width,
      box.height,
      clientX - box.left,
      clientY - box.top,
    );
  }

  /**
   * Left-press on the minimap centres the view there, and dragging carries
   * it along, as in a strategy game. The map's framing is held for the
   * drag, so the point under the mouse stays put while the view moves.
   */
  function onMapPointerDown(event: PointerEvent) {
    if (event.button !== 0 || performance.now() < propsFrom) return;
    event.preventDefault();
    setEdge(0, 0);
    mapDrag = { frame: currentMapFrame(), pointer: event.pointerId };
    map.canvas.setPointerCapture(event.pointerId);
    mapDragTo(event);
  }

  function mapDragTo(event: PointerEvent) {
    if (!mapDrag || event.pointerId !== mapDrag.pointer) return;
    const at = mapPoint(mapDrag.frame, event.clientX, event.clientY);
    panTo(at.x, at.y, performance.now());
  }

  /** Right-click on the minimap: the chicken walks there, as on the floor. */
  function onMapContextMenu(event: MouseEvent) {
    event.preventDefault();
    if (performance.now() < propsFrom) return;
    const at = mapPoint(currentMapFrame(), event.clientX, event.clientY);
    const tile = tileAtWorld(at.x, at.y);
    walkTo(tile, { col: tile.col + 0.5, row: tile.row + 0.5 });
  }

  function onMapPointerUp(event: PointerEvent) {
    if (!mapDrag || event.pointerId !== mapDrag.pointer) return;
    mapDrag = null;
    cull(viewBounds(camera.x, camera.y));
    // Let go outside the map: its box can dim again now.
    const box = map.canvas.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) setMapHover(0);
  }

  /** Where the mouse last was over the world, in window pixels; null once it leaves. */
  let pointer: { x: number; y: number } | null = null;

  function onPointerLeave() {
    pointer = null;
    schedule();
  }

  /** Where a window point is in world pixels, undoing zoom and pan. */
  function worldAt(clientX: number, clientY: number) {
    const box = canvas.getBoundingClientRect();
    return {
      x: (clientX - box.left) / zoom - width / 2 + camera.x,
      y: (clientY - box.top) / zoom - height / 2 + camera.y,
    };
  }

  /** The floor tile under world point (x, y), in world pixels. */
  function tileAtWorld(x: number, y: number): Cell {
    return {
      col: Math.floor((x / HALF_W + y / HALF_H) / 2),
      row: Math.floor((y / HALF_H - x / HALF_W) / 2),
    };
  }

  /** Stops walking a route, and clears its marker unless it is a cross. */
  function cancelRoute() {
    route = [];
    if (goal?.reachable) goal = null;
  }

  /**
   * Right-click: walk to that tile by the shortest way round what blocks.
   * A click on a picture aims for the floor under the spot clicked, and a
   * blocked tile gives way to the nearest one that can be reached.
   */
  function onContextMenu(event: MouseEvent) {
    event.preventDefault();
    if (
      (event.button !== 2 && !event.ctrlKey) ||
      performance.now() < propsFrom
    ) {
      return;
    }
    walkToward(worldAt(event.clientX, event.clientY));
  }

  /** Walks to the floor under world point `point`, or under the picture there. */
  function walkToward(point: { x: number; y: number }) {
    const onBoard = boardFloorAt(visiblePlans(viewBounds(camera.x, camera.y)), point);
    if (onBoard) {
      walkTo({ col: Math.floor(onBoard.col), row: Math.floor(onBoard.row) }, onBoard);
    } else {
      const tile = tileAtWorld(point.x, point.y);
      walkTo(tile, { col: tile.col + 0.5, row: tile.row + 0.5 });
    }
  }

  /**
   * A tap on the chicken while it stands in a village opens that village's
   * details, as E does on a keyboard (and a second tap closes them). False
   * if the tap missed the chicken or it is out in the open.
   */
  function toggleSheetAt(point: { x: number; y: number }) {
    const { focus, sheet } = villageStore.get();
    if (!focus) return false;
    const feet = tileCenter(chicken.col, chicken.row);
    // Its body stands about half a tile tall above the tile's middle.
    const dx = point.x - feet.x;
    const dy = point.y - (feet.y - TILE_SIDE / 2);
    const reach = CHICKEN_TAP_PX / zoom;
    if (Math.abs(dx) > Math.max(HALF_W * 0.6, reach)) return false;
    if (Math.abs(dy) > Math.max(TILE_SIDE * 0.65, reach)) return false;
    if (sheet) villageStore.closeSheet();
    else villageStore.openSheet(focus.villageId);
    return true;
  }

  /** The distance between the first two fingers, in window pixels. */
  function fingerSpan() {
    const [a, b] = [...fingers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  /**
   * Touch on the world. A tap does what a right-click does (a tap on a
   * Claude what a click does, and on the chicken what E does); one finger
   * dragged moves the view, as a drag on the minimap does; two fingers
   * pinch to zoom, as the wheel does.
   */
  function onTouchDown(event: PointerEvent) {
    if (event.pointerType === "mouse" || performance.now() < propsFrom) return;
    canvas.setPointerCapture(event.pointerId);
    fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (fingers.size === 1) {
      gesture = { kind: "tap", x: event.clientX, y: event.clientY, at: performance.now() };
    } else {
      gesture = { kind: "pinch" };
    }
  }

  function onTouchMove(event: PointerEvent) {
    const finger = fingers.get(event.pointerId);
    if (!finger || !gesture) return;
    if (gesture.kind === "pinch") {
      const before = fingerSpan();
      finger.x = event.clientX;
      finger.y = event.clientY;
      const after = fingerSpan();
      if (before > 0 && after > 0) zoomBy(after / before, 0);
      return;
    }
    let fromX = finger.x;
    let fromY = finger.y;
    if (gesture.kind === "tap") {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= TAP_SLOP) return;
      // Strayed too far for a tap: the drag starts from where the finger went down.
      fromX = gesture.x;
      fromY = gesture.y;
      gesture = { kind: "drag" };
    }
    finger.x = event.clientX;
    finger.y = event.clientY;
    panTo(
      camera.x - (event.clientX - fromX) / zoom,
      camera.y - (event.clientY - fromY) / zoom,
      performance.now(),
    );
  }

  function onTouchUp(event: PointerEvent) {
    if (!fingers.delete(event.pointerId)) return;
    const was = gesture;
    if (fingers.size > 0) {
      // A pinch down to one finger carries on as a drag.
      gesture = { kind: "drag" };
      return;
    }
    gesture = null;
    const now = performance.now();
    if (event.type === "pointerup" && was?.kind === "tap" && now - was.at < TAP_MS) {
      tappedAt = now;
      const point = worldAt(event.clientX, event.clientY);
      const prop = propAtPoint(point.x, point.y);
      if (prop?.kind.id === "claude") {
        spawnMinis(minis, prop, now);
        schedule();
      } else if (!toggleSheetAt(point)) {
        walkToward(point);
      }
      return;
    }
    // Done moving the view: drop the blocks it left behind.
    cull(viewBounds(camera.x, camera.y));
  }

  /** The path from the chicken to `target`, or null if there is none. */
  function pathTo(target: Cell) {
    const start = { col: chicken.col, row: chicken.row };
    return shortestPath(
      start,
      target,
      {
        c0: Math.min(start.col, target.col) - PATH_MARGIN,
        c1: Math.max(start.col, target.col) + PATH_MARGIN + 1,
        r0: Math.min(start.row, target.row) - PATH_MARGIN,
        r1: Math.max(start.row, target.row) + PATH_MARGIN + 1,
      },
      blockedAt,
    );
  }

  /**
   * The chicken walks to `target` by the shortest way round what blocks.
   * If `target` itself is blocked, it heads for the open tile nearest
   * `aim` (the grid point clicked) that it can reach instead.
   */
  function walkTo(target: Cell, aim?: { col: number; row: number }) {
    let goalTile = target;
    let path: Cell[] | null;
    if (blockedAt(target.col, target.row) && aim) {
      path = null;
      for (const tile of openTilesNear(aim)) {
        path = pathTo(tile);
        if (path) {
          goalTile = tile;
          break;
        }
      }
    } else {
      path = pathTo(target);
    }
    releaseKeys();
    route = path ?? [];
    goal = { ...goalTile, at: performance.now(), reachable: path !== null };
    schedule();
  }

  /**
   * Open tiles near grid point `aim`, nearest first: within OPEN_REACH
   * tiles, and at most OPEN_TRIES of them, since each is tried as a path.
   */
  function openTilesNear(aim: { col: number; row: number }) {
    const tiles: (Cell & { d: number })[] = [];
    const c0 = Math.floor(aim.col);
    const r0 = Math.floor(aim.row);
    for (let dc = -OPEN_REACH; dc <= OPEN_REACH; dc++) {
      for (let dr = -OPEN_REACH; dr <= OPEN_REACH; dr++) {
        const col = c0 + dc;
        const row = r0 + dr;
        if (blockedAt(col, row)) continue;
        tiles.push({ col, row, d: Math.hypot(col + 0.5 - aim.col, row + 0.5 - aim.row) });
      }
    }
    return tiles
      .sort((a, b) => a.d - b.d)
      .slice(0, OPEN_TRIES)
      .map(({ col, row }) => ({ col, row }));
  }

  /** Scrolling zooms the view in or out about its centre. */
  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? window.innerHeight
          : 1;
    zoomBy(Math.exp(-event.deltaY * unit * WHEEL_RATE), WHEEL_ZOOM_MS);
  }

  /** The zoom buttons in the settings: a factor, or 0 to reset. */
  function onZoomEvent(event: Event) {
    const factor = (event as CustomEvent<number>).detail;
    if (factor === 0) zoomBy(1 / wheelScale, ZOOM_MS / 2);
    else zoomBy(factor, ZOOM_MS / 2);
  }

  /** Zooms the view by `factor` about its centre, within the wheel's limits. */
  function zoomBy(factor: number, ms: number) {
    const now = performance.now();
    if (now < propsFrom) return;
    // Never further out than keeps the screen covered with floor.
    const base = inVillage ? villageZoom() : baseZoom;
    const next = Math.min(
      MAX_WHEEL_SCALE,
      Math.max(MIN_WHEEL_SCALE, fillZoom() / base, wheelScale * factor),
    );
    if (Math.abs(next - wheelScale) < 1e-4) return;
    const framed = wheelScale <= 1;
    wheelScale = next;
    const target = settledZoom();
    zoomTo(target, now, ms);
    if (inVillage && wheelScale <= 1) {
      if (!framed) recenter(now, villageFrame(inVillage));
    } else {
      follow(now, window.innerWidth / target, window.innerHeight / target);
    }
    schedule();
  }

  /** Clicking a Claude sends little ones out of it. */
  function onClick(event: MouseEvent) {
    const now = performance.now();
    if (event.button !== 0 || now < propsFrom) return;
    // A tap has already been handled as a touch.
    if (now - tappedAt < TAP_CLICK_MS) return;
    const { x, y } = worldAt(event.clientX, event.clientY);
    const prop = propAtPoint(x, y);
    if (prop?.kind.id !== "claude") return;
    spawnMinis(minis, prop, now);
    schedule();
  }

  /** The mouse turns into a pointing hand over a Claude. */
  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    const { x, y } = worldAt(event.clientX, event.clientY);
    // Only the pictures follow the mouse (they tip towards it). Over bare
    // floor a move changes nothing on screen, so it needs no new frame.
    if (hoverMatters(visiblePlans(viewBounds(camera.x, camera.y)), { x, y })) {
      schedule();
    }
    const over =
      performance.now() >= propsFrom && propAtPoint(x, y)?.kind.id === "claude";
    const cursor = over ? "pointer" : "";
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }

  /**
   * Repaints at once in the new colours, rather than on the next frame, so
   * a theme switch's crossfade captures the canvas already recoloured.
   */
  function readHintInk() {
    hintInk = getComputedStyle(document.documentElement)
      .getPropertyValue("--foreground")
      .trim();
  }

  /** The village a link like /#gofleet asks for, if it names one. */
  function hashVillage() {
    const id = window.location.hash.slice(1);
    return PLANS.some((plan) => plan.village.id === id) ? id : null;
  }

  /** A link like /#gofleet goes straight to that village. */
  function travelFromHash() {
    const id = hashVillage();
    if (id) {
      travel(new CustomEvent(TRAVEL_EVENT, { detail: id }));
      return true;
    }
    return false;
  }

  /**
   * Puts the chicken and the view back where they were when the world was
   * last taken down, inside its village with the facts already shown if it
   * was in one. False if there is nowhere saved.
   */
  function restoreSpot() {
    const spot = savedSpot;
    if (!spot) return false;
    chicken.col = chicken.fromCol = spot.col;
    chicken.row = chicken.fromRow = spot.row;
    chicken.facing = spot.facing;
    chicken.moveStart = -Infinity;
    wheelScale = spot.wheelScale;
    inVillage = planAt(spot.col, spot.row);
    if (inVillage) facts.set(inVillage, { on: true, at: -Infinity, from: 0 });
    factsFor = inVillage;
    camera.x = camera.fromX = camera.toX = spot.x;
    camera.y = camera.fromY = camera.toY = spot.y;
    camera.panning = false;
    return true;
  }

  /** The intro is over: show the keys, as the overlay fades away. */
  function onIntroLanded() {
    propsFrom = performance.now() + HINT_DELAY_MS;
    // Pull back from the name to show the villages round it.
    overview = true;
    baseZoom = overviewZoom(window.innerWidth, window.innerHeight);
    if (!inVillage) {
      zoomTo(settledZoom(), performance.now(), OVERVIEW_MS);
      schedule();
    }
    if (travelFromHash()) return;
    // The keys hinted at aren't there on a touch screen; the guide shows the gestures.
    if (touchScreen.matches) return;
    hints.anchor = { col: chicken.col, row: chicken.row };
    hints.shownAt = performance.now() + HINT_DELAY_MS;
    hints.hiddenAt = null;
    schedule();
  }

  /**
   * The intro has played already this page load, or was passed over: open
   * straight onto the settled overview, floor down and everything in place,
   * with no rise, pop or pull-back.
   */
  function settleWithoutIntro() {
    const now = performance.now();
    propsFrom = -Infinity;
    overview = true;
    baseZoom = overviewZoom(window.innerWidth, window.innerHeight);
    zooming.active = false;
    // Back from another page: where the visitor left off, unless the link
    // asks for a village of its own.
    const restored = !hashVillage() && restoreSpot();
    setZoom(settledZoom());
    if (restored) {
      // The window may have changed size meanwhile.
      const at = clampToWorld(camera.toX, camera.toY, width, height);
      camera.x = camera.fromX = camera.toX = at.x;
      camera.y = camera.fromY = camera.toY = at.y;
      cull(viewBounds(camera.x, camera.y));
    }
    for (const tile of tiles.values()) tile.born = -Infinity;
    fill(viewBounds(camera.toX, camera.toY), now, () => -Infinity);
    travelFromHash();
    if (restored) updateFocus();
    schedule();
  }

  function recolor() {
    colors = readPalette();
    ink = readVillageInk();
    readHintInk();
    cancelAnimationFrame(frame);
    draw(performance.now());
  }

  function resize() {
    const first = width === 0;
    const dpr = pixelRatio();
    baseZoom = (overview ? overviewZoom : fitZoom)(
      window.innerWidth,
      window.innerHeight,
    );
    zooming.active = false;
    setZoom(settledZoom());
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);

    const now = performance.now();
    if (first) {
      // Opening: the floor ripples out from the middle of the view.
      fill(viewBounds(camera.toX, camera.toY), now, (x, y) =>
        Math.min(Math.hypot(x - camera.toX, y - camera.toY) * 0.5, 600),
      );
    } else {
      const at = tileCenter(chicken.col, chicken.row);
      const offScreen =
        Math.abs(at.x - camera.toX) > width / 2 - HALF_W ||
        Math.abs(at.y - camera.toY) > height / 2 - TILE_SIDE;
      if (offScreen) recenter(now);
      fill(
        union(
          viewBounds(camera.x, camera.y),
          viewBounds(camera.toX, camera.toY),
        ),
        now,
        () => 0,
      );
    }
    schedule();
  }

  /**
   * Sends the chicken straight to a village, standing just inside its gate,
   * or home to the name. The floor ripples in around it as on arrival.
   */
  function travel(event: Event) {
    const id = (event as CustomEvent<string>).detail;
    const plan = PLANS.find((p) => p.village.id === id) ?? null;
    if (id !== "home" && !plan) return;
    const now = performance.now();

    const col = plan ? plan.col + LOT / 2 : 0;
    const row = plan ? plan.row + LOT - 1 : 0;
    chicken.col = chicken.fromCol = col;
    chicken.row = chicken.fromRow = row;
    chicken.facing = plan ? KEY_DIRECTIONS.w : KEY_DIRECTIONS.s;
    chicken.moveStart = -Infinity;
    releaseKeys();
    cancelRoute();
    if (hints.anchor && hints.hiddenAt === null) hints.hiddenAt = now;

    inVillage = plan;
    zooming.active = false;
    wheelScale = 1;
    setZoom(settledZoom());
    const target = plan ? villageFrame(plan) : HOME;
    camera.x = camera.fromX = camera.toX = target.x;
    camera.y = camera.fromY = camera.toY = target.y;
    camera.panning = false;

    const view = viewBounds(target.x, target.y);
    cull(view);
    fill(view, now, (x, y) =>
      Math.min(Math.hypot(x - target.x, y - target.y) * 0.35, 450),
    );
    villageStore.closeSheet();
    updateFocus();
    schedule();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "escape") {
      cancelRoute();
      villageStore.closeSheet();
      return;
    }
    if (key === " ") {
      // Back to the chicken, wherever the view has wandered, and held on
      // it for as long as Space is down.
      event.preventDefault();
      if (event.repeat) return;
      chase.held = true;
      chase.last = 0;
      schedule();
      return;
    }
    if (key === "e" && !event.repeat) {
      const { focus, sheet } = villageStore.get();
      if (sheet) villageStore.closeSheet();
      else if (focus) villageStore.openSheet(focus.villageId);
      return;
    }
    if (!(key in KEY_DIRECTIONS)) return;
    // Arrow keys would otherwise scroll the page.
    event.preventDefault();
    if (event.repeat) return;
    cancelRoute();
    if (!held.includes(key)) held.push(key);
    queued = key;
    schedule();
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.key === " ") releaseChase();
    const index = held.indexOf(event.key.toLowerCase());
    if (index !== -1) held.splice(index, 1);
  }

  /** Lets go of the chicken: the view stays put, and settles its floor. */
  function releaseChase() {
    if (!chase.held) return;
    chase.held = false;
    cull(viewBounds(camera.x, camera.y));
  }

  function releaseKeys() {
    releaseChase();
    held.length = 0;
    queued = null;
    setEdge(0, 0);
  }

  readHintInk();
  resize();
  if (intro.played()) settleWithoutIntro();

  window.addEventListener("resize", resize);
  window.addEventListener(INTRO_LANDED_EVENT, onIntroLanded);
  window.addEventListener(INTRO_SKIPPED_EVENT, settleWithoutIntro);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseKeys);
  window.addEventListener(TRAVEL_EVENT, travel);
  window.addEventListener(ZOOM_EVENT, onZoomEvent);
  window.addEventListener(WORLD_COVER_EVENT, onCover);
  window.addEventListener("hashchange", travelFromHash);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContextMenu);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onTouchDown);
  canvas.addEventListener("pointermove", onTouchMove);
  canvas.addEventListener("pointerup", onTouchUp);
  canvas.addEventListener("pointercancel", onTouchUp);
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerout", onWindowPointerOut);
  map.canvas.addEventListener("pointerdown", onMapPointerDown);
  map.canvas.addEventListener("contextmenu", onMapContextMenu);
  map.canvas.addEventListener("pointerenter", onMapPointerEnter);
  map.canvas.addEventListener("pointerleave", onMapPointerLeave);
  map.canvas.addEventListener("pointermove", mapDragTo);
  map.canvas.addEventListener("pointerup", onMapPointerUp);
  map.canvas.addEventListener("pointercancel", onMapPointerUp);
  setImageReadyHandler(schedule);
  // The floor's words are set in a web font; redraw once it has arrived,
  // so nothing stays in the fallback face.
  whenFontsReady(ink.fun, schedule);
  const unwatchTheme = watchTheme(recolor);

  return () => {
    cancelAnimationFrame(frame);
    // Remember every block already shown, so a world set up again (back
    // from a project's page) has them in place instead of rising again.
    const now = performance.now();
    for (const [key, tile] of tiles) {
      if (!tile.fixed && (tile.settled || tile.born < now)) risen.add(key);
    }
    // And where the visitor was, to come back to.
    savedSpot = {
      col: chicken.col,
      row: chicken.row,
      facing: chicken.facing,
      x: camera.toX,
      y: camera.toY,
      wheelScale,
      visited,
    };
    window.removeEventListener(TRAVEL_EVENT, travel);
    window.removeEventListener(ZOOM_EVENT, onZoomEvent);
    window.removeEventListener(WORLD_COVER_EVENT, onCover);
    window.removeEventListener("hashchange", travelFromHash);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContextMenu);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("pointerdown", onTouchDown);
    canvas.removeEventListener("pointermove", onTouchMove);
    canvas.removeEventListener("pointerup", onTouchUp);
    canvas.removeEventListener("pointercancel", onTouchUp);
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerout", onWindowPointerOut);
    map.canvas.removeEventListener("pointerdown", onMapPointerDown);
    map.canvas.removeEventListener("contextmenu", onMapContextMenu);
    map.canvas.removeEventListener("pointerenter", onMapPointerEnter);
    map.canvas.removeEventListener("pointerleave", onMapPointerLeave);
    map.canvas.removeEventListener("pointermove", mapDragTo);
    map.canvas.removeEventListener("pointerup", onMapPointerUp);
    map.canvas.removeEventListener("pointercancel", onMapPointerUp);
    setImageReadyHandler(() => {});
    window.removeEventListener("resize", resize);
    window.removeEventListener(INTRO_LANDED_EVENT, onIntroLanded);
    window.removeEventListener(INTRO_SKIPPED_EVENT, settleWithoutIntro);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", releaseKeys);
    unwatchTheme();
  };
}

export default function World() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const coordsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (canvasRef.current && mapRef.current && coordsRef.current) {
      return startWorld(canvasRef.current, {
        canvas: mapRef.current,
        coords: coordsRef.current,
      });
    }
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 h-full w-full touch-none"
        role="img"
        aria-label="The name Jason Ye in huge metallic letters lying flat on an endless grid floor, with a blocky chicken standing beside them. Use the W, A, S and D keys or the arrow keys to walk the chicken around, right-click or tap a tile to walk there, press E or tap the chicken for the details of the place it stands in, drag to look around, and scroll or pinch to zoom."
      />
      {/* Fog thickens toward the window edges, so new blocks rise out of it. */}
      <div className="fog pointer-events-none fixed inset-0" />

      {/* The whole world in miniature, with the camera boxed. */}
      <figure className="world-map chrome fixed right-4 bottom-4 z-30 m-0 rounded-lg p-1.5">
        <div className="relative">
          <canvas
            ref={mapRef}
            className="block size-[168px] touch-none rounded-[3px] sm:size-[240px]"
            role="img"
            aria-label="Minimap of the whole world, with the area on screen boxed and the chicken marked. Click or drag to move the view there; right-click to walk there."
          />
          {/* The chicken's coordinates, tucked into the map's corner. */}
          <span
            ref={coordsRef}
            className="map-coords pointer-events-none absolute top-1.5 right-1.5 rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums"
            aria-label="Chicken position: x 0, y 0"
          >
            <b>X</b>0{" "}
            <b>Y</b>0
          </span>
        </div>
      </figure>
    </>
  );
}
