"use client";

import { useEffect, useRef } from "react";
import { drawChicken } from "./chicken";
import {
  HALF_H,
  HALF_W,
  TILE_SIDE,
  crossMark,
  project,
  tileCenter,
  type Direction,
} from "./iso";
import { INTRO_LANDED_EVENT, drawKeyHints } from "./keyHints";
import { drawMinimap } from "./minimap";
import { HOME, NAME_TILES, drawName, fitZoom } from "./name";
import { drawProp, propAt, propsIn, type Prop } from "./props";
import { readPalette, watchTheme, type Palette } from "./theme";
import {
  drawVillageFloors,
  drawVillageSolids,
  readVillageInk,
  setImageReadyHandler,
  visiblePlans,
  type VillageInk,
} from "./villageDraw";
import {
  PLANS,
  isBlocked,
  onPlaza,
  planAt,
  spotAt,
  type VillagePlan,
} from "./villageLayout";
import { LOT } from "./villages";
import { TRAVEL_EVENT, villageStore } from "./villageStore";

/** How long one step between tiles takes. */
const STEP_MS = 300;
/**
 * How long the view takes to drift to where it is going. Each step while
 * walking starts a fresh drift from wherever the view is, so it glides
 * along behind the chicken rather than lurching.
 */
const PAN_MS = 650;
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
const HOP_PX = 10;
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

/** A floor block. */
type Tile = {
  /** Screen position of the middle of its top face. */
  x: number;
  y: number;
  /** When it starts rising into place. */
  born: number;
  /** Whether a cross is drawn on its back corner. */
  marked: boolean;
  /** Stays put even when it is out of view. */
  fixed: boolean;
};
type Bounds = { x0: number; x1: number; y0: number; y1: number };

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

/** Adds one block's top face to the current path. */
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.moveTo(x, y - HALF_H);
  ctx.lineTo(x + HALF_W, y);
  ctx.lineTo(x, y + HALF_H);
  ctx.lineTo(x - HALF_W, y);
  ctx.closePath();
}

/**
 * Runs the scene on a canvas. Everything is drawn directly each frame, and
 * frames are only scheduled while something is actually moving.
 */
function startWorld(canvas: HTMLCanvasElement, map: MapParts) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  const mapCtx = map.canvas.getContext("2d");
  let shownCoords = "";

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
  // The zoom that fits the name; inside a village the view eases out from
  // it to fit the whole village, and back on leaving.
  let baseZoom = 1;
  const zooming = { from: 1, to: 1, start: -Infinity, active: false };
  /** The village the chicken is in, if any. */
  let inVillage: VillagePlan | null = null;
  /** Which buildings of each village the chicken has stood beside. */
  const visited = new Map<string, Set<string>>();

  const tiles = new Map<string, Tile>();
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
    tiles.set(`${col},${row}`, {
      x,
      y,
      born,
      // Every other grid point, both ways.
      marked: col % 2 === 0 && row % 2 === 0,
      fixed,
    });
  }

  // The floor under the name is always there, so the letters never hang
  // over the fog while blocks rise back in around them.
  for (let row = NAME_TILES.r0; row < NAME_TILES.r1; row++) {
    for (let col = NAME_TILES.c0; col < NAME_TILES.c1; col++) {
      addTile(col, row, -Infinity, true);
    }
  }

  /** Adds any missing blocks inside `area`; existing ones are left alone. */
  function fill(area: Bounds, now: number, delay: (x: number, y: number) => number) {
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
        if (tiles.has(`${col},${row}`)) continue;
        const delayMs = delay(u * HALF_W, (v + 1) * HALF_H);
        addTile(col, row, now + animated(delayMs), false);
      }
    }
  }

  /** Drops every block outside `area`, except the ones under the name. */
  function cull(area: Bounds) {
    for (const [key, tile] of tiles) {
      if (tile.fixed) continue;
      if (
        tile.x < area.x0 ||
        tile.x > area.x1 ||
        tile.y < area.y0 ||
        tile.y > area.y1
      ) {
        tiles.delete(key);
      }
    }
  }

  /**
   * Starts drifting the view to centre on `target`, by default the chicken.
   * Blocks are added for the whole stretch the view will sweep across,
   * timed so the nearest rise first, and anything already out of sight is
   * dropped.
   */
  function recenter(
    now: number,
    target = tileCenter(chicken.col, chicken.row),
  ) {
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
        baseZoom,
        window.innerWidth / VILLAGE_VIEW.width,
        window.innerHeight / VILLAGE_VIEW.height,
      ),
    );
  }

  function setZoom(value: number) {
    zoom = value;
    width = window.innerWidth / zoom;
    height = window.innerHeight / zoom;
  }

  function zoomTo(target: number, now: number) {
    if (Math.abs(target - zoom) < 1e-3) return;
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

  function step(key: string, now: number) {
    const facing = KEY_DIRECTIONS[key];
    // It has found the keys, so the hints can go.
    if (hints.anchor && hints.hiddenAt === null) hints.hiddenAt = now;
    villageStore.closeSheet();

    // Buildings and props are solid: the chicken turns to face one but
    // stays put.
    const nextCol = chicken.col + facing[0];
    const nextRow = chicken.row + facing[1];
    if (isBlocked(nextCol, nextRow) || propAt(nextCol, nextRow)) {
      if (chicken.facing !== facing) {
        chicken.facing = facing;
        chicken.fromCol = chicken.col;
        chicken.fromRow = chicken.row;
      }
      return;
    }

    chicken.fromCol = chicken.col;
    chicken.fromRow = chicken.row;
    chicken.col += facing[0];
    chicken.row += facing[1];
    chicken.facing = facing;
    chicken.moveStart = now;
    updateFocus();

    // Inside a village the view frames the whole of it and holds still.
    const plan = planAt(chicken.col, chicken.row);
    if (plan !== inVillage) {
      inVillage = plan;
      zoomTo(plan ? villageZoom() : baseZoom, now);
      recenter(now, plan ? villageFrame(plan) : undefined);
      return;
    }
    if (plan) return;

    // The view stays put while the chicken is near the middle. Once it
    // strays further, the view shifts just enough to keep it in that zone,
    // about a tile per step, and the floor fills in along the leading edge.
    const at = tileCenter(chicken.col, chicken.row);
    const over = (offset: number, reach: number) =>
      Math.sign(offset) * Math.max(0, Math.abs(offset) - reach);
    const shiftX = over(at.x - camera.toX, (width / 2) * FOLLOW_ZONE);
    const shiftY = over(at.y - camera.toY, (height / 2) * FOLLOW_ZONE);
    if (shiftX !== 0 || shiftY !== 0) {
      recenter(now, { x: camera.toX + shiftX, y: camera.toY + shiftY });
    }
  }

  function draw(now: number) {
    frame = 0;

    // Keep walking while a key is held, or take a step tapped mid-stride.
    const stepping = now - chicken.moveStart < STEP_MS;
    if (!stepping) {
      const key = held.at(-1) ?? queued;
      queued = null;
      if (key) step(key, now);
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
      const t = progress(zooming.start, animated(ZOOM_MS), now);
      const eased = easeOutCubic(t);
      setZoom(zooming.from + (zooming.to - zooming.from) * eased);
      // Floor fills in at once as the view widens; the fog hides the edge.
      fill(viewBounds(camera.x, camera.y), now, () => 0);
      if (t >= 1) {
        zooming.active = false;
        if (!camera.panning) cull(viewBounds(camera.toX, camera.toY));
      }
    }

    const scale = (window.devicePixelRatio || 1) * zoom;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2 - camera.x, height / 2 - camera.y);
    ctx.lineJoin = "round";
    // Grid lines stay one window pixel wide whatever the zoom.
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = colors.line;

    // Blocks still rising are drawn one by one, fading in from below.
    let rising = false;
    const settled: Tile[] = [];
    for (const tile of tiles.values()) {
      const t = progress(tile.born, animated(RISE_MS), now);
      if (now < tile.born) {
        rising = true;
      } else if (t < 1) {
        rising = true;
        const eased = easeOutCubic(t);
        const y = tile.y + (1 - eased) * RISE_PX;
        ctx.globalAlpha = eased;
        ctx.beginPath();
        diamond(ctx, tile.x, y + LIP);
        ctx.fillStyle = colors.side;
        ctx.fill();
        ctx.beginPath();
        diamond(ctx, tile.x, y);
        ctx.fillStyle = colors.top;
        ctx.fill();
        ctx.stroke();
        if (tile.marked) {
          ctx.beginPath();
          crossMark(ctx, tile.x, y);
          ctx.strokeStyle = colors.mark;
          ctx.stroke();
          ctx.strokeStyle = colors.line;
        }
      } else {
        settled.push(tile);
      }
    }
    ctx.globalAlpha = 1;

    // Settled blocks all look alike, so they go down as a few big paths:
    // the sides, hidden wherever a nearer block covers them, then every top
    // face, then the crosses.
    ctx.beginPath();
    for (const tile of settled) diamond(ctx, tile.x, tile.y + LIP);
    ctx.fillStyle = colors.side;
    ctx.fill();

    ctx.beginPath();
    for (const tile of settled) diamond(ctx, tile.x, tile.y);
    ctx.fillStyle = colors.top;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    for (const tile of settled) {
      if (tile.marked) crossMark(ctx, tile.x, tile.y);
    }
    ctx.strokeStyle = colors.mark;
    ctx.stroke();

    // Villages: their plazas, roads, plaques and painted words lie on the
    // floor; their buildings stand, and are drawn with the chicken below.
    const villages = visiblePlans(viewBounds(camera.x, camera.y));
    ctx.lineWidth = 1 / zoom;
    drawVillageFloors(ctx, villages, ink);

    // The tile the chicken stands on is shaded, and outlined so it still
    // shows on the letters. Mid-step the shade passes to the next tile.
    const moved = progress(chicken.moveStart, animated(STEP_MS), now);
    const from = tileCenter(chicken.fromCol, chicken.fromRow);
    const to = tileCenter(chicken.col, chicken.row);
    const standing: [{ x: number; y: number }, number][] = [
      [from, 1 - moved],
      [to, moved],
    ];
    for (const [tile, alpha] of standing) {
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      diamond(ctx, tile.x, tile.y);
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
      diamond(ctx, tile.x, tile.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

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
    const midCol = chicken.fromCol + (chicken.col - chicken.fromCol) * moved + 0.5;
    const midRow = chicken.fromRow + (chicken.row - chicken.fromRow) * moved + 0.5;

    // Props pop up once their floor is in place, and those behind the
    // chicken are drawn before it, the rest after.
    let popping = false;
    const behind: [Prop, number][] = [];
    const inFront: [Prop, number][] = [];
    for (const prop of propsIn(viewBounds(camera.x, camera.y))) {
      const tile = tiles.get(`${prop.col},${prop.row}`);
      if (!tile) continue;
      const ripple = Math.min(
        Math.hypot(prop.col + 0.5 - midCol, prop.row + 0.5 - midRow) *
          PROP_RIPPLE_MS,
        PROP_RIPPLE_MAX_MS,
      );
      const start = Math.max(
        tile.born + animated(RISE_MS) * 0.5,
        propsFrom + animated(ripple),
      );
      if (now < start) {
        if (propsFrom !== Infinity) popping = true;
        continue;
      }
      const t = progress(start, animated(PROP_POP_MS), now);
      if (t < 1) popping = true;
      const isBehind =
        prop.col + 1 <= midCol - 0.3 || prop.row + 1 <= midRow - 0.3;
      (isBehind ? behind : inFront).push([prop, easeOutBack(t)]);
    }
    ctx.lineWidth = 1 / zoom;
    for (const [prop, grow] of behind) drawProp(ctx, prop, grow, colors.shadow);

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
      );
    ctx.lineWidth = 1 / zoom;
    const sorted = drawVillageSolids(ctx, villages, ink, {
      box: {
        c0: midCol - 0.3,
        c1: midCol + 0.3,
        r0: midRow - 0.3,
        r1: midRow + 0.3,
        z0: 0,
        z1: 1.1,
      },
      draw: paintChicken,
    });
    if (!sorted) paintChicken();
    ctx.lineWidth = 1 / zoom;
    for (const [prop, grow] of inFront) drawProp(ctx, prop, grow, colors.shadow);

    if (mapCtx) {
      drawMinimap(
        map.canvas,
        mapCtx,
        {
          cameraX: camera.x,
          cameraY: camera.y,
          viewWidth: width,
          viewHeight: height,
          // The middle of its tile, gliding along with it mid-step.
          chickenCol:
            chicken.fromCol + (chicken.col - chicken.fromCol) * moved + 0.5,
          chickenRow:
            chicken.fromRow + (chicken.row - chicken.fromRow) * moved + 0.5,
          facing: chicken.facing,
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
      queued
    ) {
      schedule();
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
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

  /** A link like /#gofleet goes straight to that village. */
  function travelFromHash() {
    const id = window.location.hash.slice(1);
    if (PLANS.some((plan) => plan.village.id === id)) {
      travel(new CustomEvent(TRAVEL_EVENT, { detail: id }));
      return true;
    }
    return false;
  }

  /** The intro is over: show the keys, as the overlay fades away. */
  function onIntroLanded() {
    propsFrom = performance.now() + HINT_DELAY_MS;
    if (travelFromHash()) return;
    hints.anchor = { col: chicken.col, row: chicken.row };
    hints.shownAt = performance.now() + HINT_DELAY_MS;
    hints.hiddenAt = null;
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
    const dpr = window.devicePixelRatio || 1;
    baseZoom = fitZoom(window.innerWidth, window.innerHeight);
    zooming.active = false;
    setZoom(inVillage ? villageZoom() : baseZoom);
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
    if (hints.anchor && hints.hiddenAt === null) hints.hiddenAt = now;

    inVillage = plan;
    zooming.active = false;
    setZoom(plan ? villageZoom() : baseZoom);
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
      villageStore.closeSheet();
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
    if (!held.includes(key)) held.push(key);
    queued = key;
    schedule();
  }

  function onKeyUp(event: KeyboardEvent) {
    const index = held.indexOf(event.key.toLowerCase());
    if (index !== -1) held.splice(index, 1);
  }

  function releaseKeys() {
    held.length = 0;
    queued = null;
  }

  readHintInk();
  resize();

  window.addEventListener("resize", resize);
  window.addEventListener(INTRO_LANDED_EVENT, onIntroLanded);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseKeys);
  window.addEventListener(TRAVEL_EVENT, travel);
  window.addEventListener("hashchange", travelFromHash);
  setImageReadyHandler(schedule);
  const unwatchTheme = watchTheme(recolor);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener(TRAVEL_EVENT, travel);
    window.removeEventListener("hashchange", travelFromHash);
    setImageReadyHandler(() => {});
    window.removeEventListener("resize", resize);
    window.removeEventListener(INTRO_LANDED_EVENT, onIntroLanded);
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
        className="fixed inset-0 h-full w-full"
        role="img"
        aria-label="The name Jason Ye in huge metallic letters lying flat on an endless grid floor, with a blocky chicken standing beside them. Use the W, A, S and D keys or the arrow keys to walk the chicken around."
      />
      {/* Fog thickens toward the window edges, so new blocks rise out of it. */}
      <div className="fog pointer-events-none fixed inset-0" />

      {/* Top-down map of what is on screen, north up. */}
      <figure className="chrome fixed right-4 bottom-4 z-30 m-0 rounded-lg p-1.5">
        <div className="relative">
          <canvas
            ref={mapRef}
            className="block size-[168px] rounded-[3px] sm:size-[240px]"
            role="img"
            aria-label="Minimap: a top-down view of the area on screen, with north up and the chicken marked. W walks north."
          />
          {/* The chicken's coordinates, tucked into the map's corner. */}
          <span
            ref={coordsRef}
            className="map-coords pointer-events-none absolute top-1.5 right-1.5 rounded-[3px] px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums"
            aria-label="Chicken position: x 0, y 0"
          >
            <b>X</b>0{" "}<b>Y</b>0
          </span>
        </div>
      </figure>
    </>
  );
}
