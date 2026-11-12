"use client";

import { useEffect, useRef, useState } from "react";
import { drawChicken } from "./chicken";
import { HALF_H, HALF_W, TILE_SIDE, tileCenter, type Direction } from "./iso";
import { HOME, NAME_TILES, drawName, fitZoom } from "./name";
import { readPalette, watchTheme, type Palette } from "./theme";

/** How long the swirl takes to reach the last block. */
const SWIRL_MS = 1700;
/** How long one block takes to pop in. */
const POP_MS = 320;
/** Pause with the finished grid before the raised blocks settle. */
const HOLD_MS = 120;
/** Distance between successive arms of the swirl, in tiles. */
const ARM_PITCH_TILES = 1.4;
/** Below 1 the swirl starts slow at the centre instead of blurring through it. */
const SWIRL_EASE = 0.6;

/** Roughly what share of the plain blocks stand a little proud of the floor. */
const RAISED_SHARE = 0.3;
/** How far a raised block stands above the floor, in world pixels. */
const RAISE_MIN_PX = 6;
const RAISE_MAX_PX = 18;
/** Blocks start settling at random moments within this long of each other. */
const RELEASE_SPREAD_MS = 650;
/** How long one block takes to slide down into place. */
const SETTLE_MIN_MS = 380;
const SETTLE_MAX_MS = 620;
/** Pause between the floor being down and the name starting to fall. */
const NAME_PAUSE_MS = 150;
/**
 * The name's pieces come down in a loose wave from its first letter to its
 * last: the wave takes this long to cross it, and each piece lets go up to
 * NAME_JITTER_MS either side of it.
 */
const NAME_WAVE_MS = 750;
const NAME_JITTER_MS = 220;
/** How long a piece takes to fall the height of the window. */
const NAME_FALL_MS = 1250;
/** Each piece's fall time is stretched by a random factor in this range. */
const NAME_SLOWEST = 1.12;
const NAME_FASTEST = 0.9;
/** Pieces start up to this many tiles above the top of the window. */
const NAME_HEADROOM_TILES = 3;
/** Over this last share of its fall a piece's outline melts away. */
const NAME_MELT = 0.3;
/**
 * The chicken lets go this long before the last piece of the name lands, so
 * it touches down just after the name is whole.
 */
const CHICKEN_OVERLAP_MS = 450;
/** How long the chicken takes to drop in from above the window. */
const CHICKEN_FALL_MS = 950;
/** The little hop it takes on landing. */
const CHICKEN_HOP_MS = 340;
const CHICKEN_HOP_PX = 12;
/** Where the chicken stands, as World places it. */
const CHICKEN_SPOT = tileCenter(0, 0);
const CHICKEN_FACING: Direction = [0, 1];
/** Size of the chicken's shadow on the ground, as drawn by drawChicken. */
const SHADOW_RX = TILE_SIDE * 0.24 * 1.45;
const SHADOW_RY = TILE_SIDE * 0.14 * 1.45;
/** Pixels per tile when working out which tiles the name is painted on. */
const PROBE_PX = 8;
/** How long the overlay takes to fade once the floor is down. */
const REVEAL_MS = 400;

// Mirrors the floor blocks drawn by World, so the hand-off is seamless.
const LIP = 5;

const MOVEMENT_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
]);

/** A floor block and its part in the intro. */
type Tile = {
  /** Screen position of its top face once it is in place. */
  x: number;
  y: number;
  /** How far it stands above the floor to begin with; 0 if it is flush. */
  drop: number;
  /** When it pops in during the swirl. */
  appear: number;
  /** How long after the settling starts it moves, and how long it takes. */
  release: number;
  duration: number;
  /**
   * A piece of the name rather than floor. It takes no part in the swirl:
   * once the floor is down it falls from above the window onto its tile.
   */
  lettered: boolean;
};

/** Smooth start, smooth stop. */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function between(min: number, max: number) {
  return min + (max - min) * Math.random();
}

/** Adds one block's top face to a path, shrunk around its centre by `scale`. */
function diamond(path: CanvasPath, x: number, y: number, scale = 1) {
  const w = HALF_W * scale;
  const h = HALF_H * scale;
  path.moveTo(x, y - h);
  path.lineTo(x + w, y);
  path.lineTo(x, y + h);
  path.lineTo(x - w, y);
  path.closePath();
}

/**
 * Adds the two front sides of a block standing proud of the floor: from its
 * top face at `top` down to where the floor meets it at `bottom`.
 */
function sides(
  path: CanvasPath,
  x: number,
  top: number,
  bottom: number,
  scale = 1,
) {
  const w = HALF_W * scale;
  const h = HALF_H * scale;
  path.moveTo(x - w, top);
  path.lineTo(x + w, top);
  path.lineTo(x + w, bottom);
  path.lineTo(x, bottom + h);
  path.lineTo(x - w, bottom);
  path.closePath();
  // The front corner, so the two sides read as two faces.
  path.moveTo(x, top + h);
  path.lineTo(x, bottom + h);
}

/** The tiles with any of the name or its accent tiles on them, as [col, row]. */
function findNameCells() {
  const cols = NAME_TILES.c1 - NAME_TILES.c0;
  const rows = NAME_TILES.r1 - NAME_TILES.r0;
  const probe = document.createElement("canvas");
  probe.width = cols * PROBE_PX;
  probe.height = rows * PROBE_PX;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  // Undo the projection, so the name is drawn square-on and every tile is
  // its own square of pixels.
  ctx.setTransform(
    PROBE_PX,
    0,
    0,
    PROBE_PX,
    -NAME_TILES.c0 * PROBE_PX,
    -NAME_TILES.r0 * PROBE_PX,
  );
  ctx.transform(0.5 / HALF_W, -0.5 / HALF_W, 0.5 / HALF_H, 0.5 / HALF_H, 0, 0);
  drawName(ctx, {
    ink: ["#000"],
    orange: "#000",
    blue: "#000",
    sky: "#000",
  });

  const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
  const cells: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let painted = false;
      // Edge pixels count too: a sliver of a curve still has to come along.
      for (let py = 0; py < PROBE_PX && !painted; py++) {
        for (let px = 0; px < PROBE_PX && !painted; px++) {
          const pixel =
            (row * PROBE_PX + py) * probe.width + col * PROBE_PX + px;
          painted = data[4 * pixel + 3] > 8;
        }
      }
      if (painted) cells.push([NAME_TILES.c0 + col, NAME_TILES.r0 + row]);
    }
  }
  return cells;
}

/**
 * Every block of the intro for this window size, ordered back to front, plus
 * how long it all takes.
 *
 * Most floor blocks are flush from the moment they appear. Some stand a
 * little proud of it, each by its own amount, and later slide down into
 * place. Only once the floor is down does the name come, falling in pieces
 * from above the window.
 */
function layFloor(
  width: number,
  height: number,
  nameCells: [number, number][],
) {
  const center = HOME;
  // The same area World fills. A tile's centre sits at x = u * HALF_W,
  // y = (v + 1) * HALF_H, for u + v even.
  const uMin = Math.ceil((center.x - width / 2) / HALF_W) - 1;
  const uMax = Math.floor((center.x + width / 2) / HALF_W) + 1;
  const vMin = Math.ceil((center.y - height / 2 - LIP) / HALF_H) - 2;
  const vMax = Math.floor((center.y + height / 2) / HALF_H);

  // Tile (col, row) sits at u = col - row, v = col + row.
  const named = new Set(
    nameCells.map(([col, row]) => `${col - row},${col + row}`),
  );

  // One tile, as a fraction of the half-window.
  const tileSize = Math.max((4 * HALF_W) / width, (4 * HALF_H) / height);
  const pitch = ARM_PITCH_TILES * tileSize;

  const tiles: Tile[] = [];
  const swirl: { tile: Tile; order: number }[] = [];
  // Where the name's pieces land, back to front.
  const nameSpots: { x: number; y: number }[] = [];

  for (let v = vMin; v <= vMax; v++) {
    for (let u = uMin; u <= uMax; u++) {
      if ((u + v) % 2 !== 0) continue;
      const raised = Math.random() < RAISED_SHARE;
      const tile: Tile = {
        x: u * HALF_W,
        y: (v + 1) * HALF_H,
        drop: raised ? between(RAISE_MIN_PX, RAISE_MAX_PX) : 0,
        appear: 0,
        release: raised ? between(0, RELEASE_SPREAD_MS) : 0,
        duration: raised ? between(SETTLE_MIN_MS, SETTLE_MAX_MS) : 0,
        lettered: false,
      };
      tiles.push(tile);
      if (named.has(`${u},${v}`)) nameSpots.push(tile);

      const nx = (tile.x - center.x) / (width / 2);
      const ny = (tile.y - center.y) / (height / 2);
      const radius = Math.hypot(nx, ny);
      // Fraction of a full turn, clockwise on screen from straight up.
      const turn = (Math.atan2(ny, nx) / (2 * Math.PI) + 1.25) % 1;
      // Which pass of the spiral r = pitch * turns runs closest.
      const arm = Math.max(0, Math.round(radius / pitch - turn));
      swirl.push({ tile, order: arm + turn });
    }
  }

  const last = Math.max(swirl.length - 1, 1);
  swirl
    .sort((a, b) => a.order - b.order)
    .forEach(({ tile }, index) => {
      tile.appear = SWIRL_MS * (index / last) ** SWIRL_EASE;
    });

  const floorMs = Math.max(
    0,
    ...tiles.map((tile) => tile.release + tile.duration),
  );

  // The name, piece by piece, from just out of sight above the window.
  const windowTop = center.y - height / 2 - HALF_H - LIP;
  const xs = nameSpots.map((spot) => spot.x);
  const nameLeft = Math.min(...xs);
  const nameWidth = Math.max(...xs) - nameLeft || 1;
  let nameMs = floorMs;
  for (const { x, y } of nameSpots) {
    const drop =
      y - windowTop + between(0, NAME_HEADROOM_TILES) * 2 * HALF_H;
    const along = (x - nameLeft) / nameWidth;
    const release =
      floorMs +
      NAME_PAUSE_MS +
      NAME_JITTER_MS +
      along * NAME_WAVE_MS +
      between(-NAME_JITTER_MS, NAME_JITTER_MS);
    const duration =
      NAME_FALL_MS *
      Math.sqrt(drop / height) *
      between(NAME_FASTEST, NAME_SLOWEST);
    tiles.push({ x, y, drop, appear: 0, release, duration, lettered: true });
    nameMs = Math.max(nameMs, release + duration);
  }

  // Last of all, the chicken drops in onto its tile.
  const chickenAt = nameMs - CHICKEN_OVERLAP_MS;
  const chickenDrop = CHICKEN_SPOT.y - windowTop + TILE_SIDE * 1.5;
  const settleMs = chickenAt + CHICKEN_FALL_MS + CHICKEN_HOP_MS;
  return { tiles, settleMs, chickenAt, chickenDrop };
}

/**
 * Plays the intro on a canvas: the grid is drawn block by block in a swirl,
 * and once the page has loaded the blocks still standing proud slide down
 * into place. Calls `onLanded` when the last one is flush.
 */
function startLoader(canvas: HTMLCanvasElement, onLanded: () => void) {
  const context = canvas.getContext("2d");
  if (!context) {
    const skip = requestAnimationFrame(onLanded);
    return () => cancelAnimationFrame(skip);
  }
  const ctx = context;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // As in World: the scene is scaled to fit the name, and `width` and
  // `height` are the size of the view in world pixels.
  let zoom = 1;
  let width = 0;
  let height = 0;
  let tiles: Tile[] = [];
  let settleMs = 0;
  let chickenAt = 0;
  let chickenDrop = 0;
  let colors: Palette = readPalette();
  let nameCells: [number, number][] | null = null;
  let frame = 0;
  // The clock starts on the first painted frame, so a tab opened in the
  // background still plays the intro when it is first looked at.
  let startedAt: number | null = null;
  let settleAt: number | null = null;
  let pageLoaded = document.readyState === "complete";
  let landed = false;

  /** Height above the floor, `since` ms after the block started to move. */
  function liftAt(tile: Tile, since: number) {
    if (since <= 0) return tile.drop;
    if (since >= tile.duration) return 0;
    if (tile.lettered) {
      // Glides down: gathers speed, then slows to touch the floor softly.
      return tile.drop * (1 - easeInOutCubic(since / tile.duration));
    }
    // Eases out of its spot and gently into place.
    return (tile.drop * (1 + Math.cos((Math.PI * since) / tile.duration))) / 2;
  }

  function draw(now: number) {
    frame = 0;

    // Reduced motion skips the swirl and the settling: the floor is simply there.
    startedAt ??= now;
    const elapsed = reducedMotion ? Infinity : now - startedAt;
    // The blocks stay proud until the page really has finished loading.
    if (
      settleAt === null &&
      pageLoaded &&
      elapsed >= SWIRL_MS + POP_MS + HOLD_MS
    ) {
      settleAt = now;
    }
    const sinceSettle =
      settleAt === null ? 0 : reducedMotion ? Infinity : now - settleAt;

    const scale = (window.devicePixelRatio || 1) * zoom;
    const center = HOME;
    const top = center.y - height / 2 - HALF_H - LIP;
    const bottom = center.y + height / 2 + HALF_H + RAISE_MAX_PX;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2 - center.x, height / 2 - center.y);
    ctx.lineJoin = "round";
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = colors.line;

    // Blocks in place all look alike, so they go down as a few big paths:
    // the sides peeking out from under each block, the tops, then the name.
    const flushSides = new Path2D();
    const flushTops = new Path2D();
    const flushName = new Path2D();
    const moving: Tile[] = [];
    for (const tile of tiles) {
      if (elapsed <= tile.appear) continue;
      const since = sinceSettle - tile.release;
      if (tile.lettered) {
        // A landed piece is painted straight onto the floor below it.
        if (since >= tile.duration) {
          diamond(flushName, tile.x, tile.y);
        } else if (since > 0) {
          moving.push(tile);
        }
        continue;
      }
      const settled = tile.drop === 0 || since >= tile.duration;
      if (elapsed >= tile.appear + POP_MS && settled) {
        if (tile.y < top || tile.y > bottom) continue;
        diamond(flushSides, tile.x, tile.y + LIP);
        diamond(flushTops, tile.x, tile.y);
      } else {
        moving.push(tile);
      }
    }

    ctx.fillStyle = colors.side;
    ctx.fill(flushSides);
    ctx.fillStyle = colors.top;
    ctx.fill(flushTops);
    ctx.stroke(flushTops);
    // The name, in one piece, as World paints it.
    ctx.save();
    ctx.clip(flushName);
    drawName(ctx, colors);
    ctx.restore();

    // Blocks popping in or standing proud are drawn one by one, back to front.
    for (const tile of moving) {
      const since = sinceSettle - tile.release;
      const y = tile.y - liftAt(tile, since);
      if (y < top || y > bottom) continue;
      const grown = easeOutCubic(clamp01((elapsed - tile.appear) / POP_MS));
      const scale = 0.3 + 0.7 * grown;
      // The name has no grid lines on it, so a piece's outline and lip melt
      // away as it comes in to land, rather than vanishing the moment it is down.
      const outline = tile.lettered
        ? clamp01((1 - since / tile.duration) / NAME_MELT)
        : 1;
      ctx.globalAlpha = grown;
      ctx.beginPath();
      // A raised floor block's sides end where the floor meets it, so they
      // shrink away to nothing as it settles; others show their usual lip.
      const depth =
        tile.lettered ? LIP * outline : tile.drop > 0 ? tile.y - y : LIP;
      sides(ctx, tile.x, y, y + depth * scale, scale);
      ctx.fillStyle = colors.side;
      ctx.fill();
      ctx.globalAlpha = grown * outline;
      ctx.stroke();
      ctx.globalAlpha = grown;
      ctx.beginPath();
      diamond(ctx, tile.x, y, scale);
      ctx.fillStyle = colors.top;
      ctx.fill();
      if (tile.lettered) {
        ctx.globalAlpha = grown * outline;
        ctx.stroke();
        ctx.globalAlpha = grown;
        // Its piece of the name, carried on its top face.
        ctx.save();
        ctx.clip();
        ctx.translate(0, y - tile.y);
        drawName(ctx, colors);
        ctx.restore();
      } else {
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // The chicken drops in last: it glides down like the name, its shadow
    // gathering beneath it, then takes a little hop as it lands.
    const sinceChicken = sinceSettle - chickenAt;
    if (settleAt !== null && sinceChicken > 0) {
      const fell = clamp01(sinceChicken / CHICKEN_FALL_MS);
      const hopped = clamp01((sinceChicken - CHICKEN_FALL_MS) / CHICKEN_HOP_MS);
      const lift =
        chickenDrop * (1 - easeInOutCubic(fell)) +
        CHICKEN_HOP_PX * Math.sin(Math.PI * hopped);
      const { x, y } = CHICKEN_SPOT;

      // Its tile is shaded as it comes in to land, as World shades it.
      const arriving = clamp01((fell - 0.6) / 0.4);
      ctx.globalAlpha = arriving;
      ctx.beginPath();
      diamond(ctx, x, y);
      ctx.fillStyle = colors.here;
      ctx.fill();
      ctx.lineWidth = 1.25 / zoom;
      ctx.strokeStyle = colors.hereEdge;
      ctx.stroke();

      ctx.globalAlpha = clamp01(1 - lift / chickenDrop);
      ctx.beginPath();
      const near = 0.4 + 0.6 * ctx.globalAlpha;
      ctx.ellipse(x, y, SHADOW_RX * near, SHADOW_RY * near, 0, 0, Math.PI * 2);
      ctx.fillStyle = colors.shadow;
      ctx.fill();
      ctx.globalAlpha = 1;
      // Its own shadow is drawn above, so it can grow as the chicken nears.
      drawChicken(ctx, x, y, CHICKEN_FACING, lift, "transparent");
    }

    if (settleAt !== null && sinceSettle >= settleMs) {
      if (!landed) {
        landed = true;
        onLanded();
      }
    } else {
      schedule();
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  /** Repaints at once in the new colours, mid-animation or not. */
  function recolor() {
    colors = readPalette();
    cancelAnimationFrame(frame);
    draw(performance.now());
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    zoom = fitZoom(window.innerWidth, window.innerHeight);
    width = window.innerWidth / zoom;
    height = window.innerHeight / zoom;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    nameCells ??= findNameCells();
    ({ tiles, settleMs, chickenAt, chickenDrop } = layFloor(
      width,
      height,
      nameCells,
    ));
    schedule();
  }

  function onPageLoaded() {
    pageLoaded = true;
  }

  resize();

  window.addEventListener("resize", resize);
  window.addEventListener("load", onPageLoaded);
  const unwatchTheme = watchTheme(recolor);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("load", onPageLoaded);
    unwatchTheme();
  };
}

/**
 * Intro shown over the home page while it loads. The floor it lays is the
 * same one World draws underneath, so when this overlay fades out the
 * settled blocks are simply the real floor.
 */
export default function Loader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"playing" | "reveal" | "done">("playing");

  useEffect(() => {
    if (canvasRef.current) {
      return startLoader(canvasRef.current, () => setPhase("reveal"));
    }
  }, []);

  // Keep the chicken still under the overlay: if it walked off, the view
  // would pan and the floor would no longer line up with the blocks here.
  useEffect(() => {
    if (phase === "done") return;
    const swallowMovement = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (MOVEMENT_KEYS.has(event.key.toLowerCase())) event.stopPropagation();
    };
    window.addEventListener("keydown", swallowMovement, { capture: true });
    return () =>
      window.removeEventListener("keydown", swallowMovement, { capture: true });
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      className="bg-background fixed inset-0 z-50 transition-opacity ease-out"
      style={{
        opacity: phase === "reveal" ? 0 : 1,
        pointerEvents: phase === "reveal" ? "none" : undefined,
        transitionDuration: `${REVEAL_MS}ms`,
      }}
      onTransitionEnd={() => setPhase("done")}
      role="status"
      aria-label="Loading"
    >
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      <div className="fog absolute inset-0" />
    </div>
  );
}
