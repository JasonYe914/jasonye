"use client";

import { useEffect, useRef } from "react";
import { drawChicken } from "./chicken";
import {
  HALF_H,
  HALF_W,
  TILE_SIDE,
  crossMark,
  tileCenter,
  type Direction,
} from "./iso";
import { drawMinimap } from "./minimap";
import { HOME, NAME_TILES, drawName, fitZoom } from "./name";
import { readPalette, watchTheme, type Palette } from "./theme";

/** How long one step between tiles takes. */
const STEP_MS = 300;
/** How long the view takes to drift over to the chicken. */
const PAN_MS = 900;
/** How long a new block takes to rise out of the fog. */
const RISE_MS = 600;
/** How far below the floor a new block starts. */
const RISE_PX = 48;
/** Height of a block's side, which only shows while the block is rising. */
const LIP = 5;
/**
 * How far the chicken gets from the middle of the view, as a share of the
 * way to the window edge, before the view moves over to it. Well short of
 * the edge, so new floor rises in long before the chicken could reach it.
 */
const RECENTER_AT = 0.4;
/**
 * When the view moves, it centres this many tiles ahead of the chicken in
 * the direction it is walking, so the floor builds out in front of it.
 */
const LEAD_TILES = 4;
const HOP_PX = 10;

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

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
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
  let frame = 0;

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
   * Starts drifting the view over to the chicken. Blocks are added for the
   * whole stretch the view will sweep across, timed so the nearest rise
   * first, and anything already out of sight is dropped.
   */
  function recenter(now: number, lead = 0) {
    const target = tileCenter(
      chicken.col + chicken.facing[0] * lead,
      chicken.row + chicken.facing[1] * lead,
    );
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

  function step(key: string, now: number) {
    const facing = KEY_DIRECTIONS[key];
    chicken.fromCol = chicken.col;
    chicken.fromRow = chicken.row;
    chicken.col += facing[0];
    chicken.row += facing[1];
    chicken.facing = facing;
    chicken.moveStart = now;

    // The floor stays put until the chicken is a good way out from the
    // middle, then the view moves over to it and fills in ahead.
    const at = tileCenter(chicken.col, chicken.row);
    if (
      Math.abs(at.x - camera.toX) > (width / 2) * RECENTER_AT ||
      Math.abs(at.y - camera.toY) > (height / 2) * RECENTER_AT
    ) {
      recenter(now, LEAD_TILES);
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
      const eased = easeInOutCubic(t);
      camera.x = camera.fromX + (camera.toX - camera.fromX) * eased;
      camera.y = camera.fromY + (camera.toY - camera.fromY) * eased;
      if (t >= 1) {
        camera.panning = false;
        cull(viewBounds(camera.toX, camera.toY));
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

    const chickenX = from.x + (to.x - from.x) * moved;
    const chickenY = from.y + (to.y - from.y) * moved;
    drawChicken(
      ctx,
      chickenX,
      chickenY,
      chicken.facing,
      Math.sin(Math.PI * moved) * animated(HOP_PX),
      colors.shadow,
    );

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
    const coords = `${chicken.col}, ${-chicken.row}`;
    if (coords !== shownCoords) {
      shownCoords = coords;
      map.coords.textContent = coords.replace(/-/g, "−");
    }

    const walking = now - chicken.moveStart < STEP_MS;
    if (rising || camera.panning || walking || held.length > 0 || queued) {
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
  function recolor() {
    colors = readPalette();
    cancelAnimationFrame(frame);
    draw(performance.now());
  }

  function resize() {
    const first = width === 0;
    const dpr = window.devicePixelRatio || 1;
    zoom = fitZoom(window.innerWidth, window.innerHeight);
    width = window.innerWidth / zoom;
    height = window.innerHeight / zoom;
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

  function onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
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

  resize();

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", releaseKeys);
  const unwatchTheme = watchTheme(recolor);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
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
        <canvas
          ref={mapRef}
          className="block size-[132px] rounded-[3px] sm:size-[184px]"
          role="img"
          aria-label="Minimap: a top-down view of the area on screen, with north up and the chicken marked. W walks north."
        />
        <figcaption className="flex items-center justify-between px-2 pt-1.5 pb-0.5 font-mono text-[10px] tracking-[0.08em] uppercase opacity-60">
          <span>Map</span>
          <span ref={coordsRef} className="tabular-nums" aria-label="Chicken position">
            0, 0
          </span>
        </figcaption>
      </figure>
    </>
  );
}
