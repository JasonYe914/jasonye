import { HALF_H, HALF_W, type Direction } from "./iso";

/**
 * Fired on `window` by the intro once the chicken has landed, so the home
 * page knows when to show the key hints.
 */
export const INTRO_LANDED_EVENT = "intro:landed";

/** The movement keys, each painted on the tile it would step the chicken to. */
export const KEY_HINTS: { label: string; direction: Direction }[] = [
  { label: "W", direction: [0, -1] },
  { label: "A", direction: [-1, 0] },
  { label: "S", direction: [0, 1] },
  { label: "D", direction: [1, 0] },
];

/** How long one hint takes to fade in, and the gap before the next starts. */
export const HINT_FADE_IN_MS = 420;
export const HINT_STAGGER_MS = 90;
/** How long the hints take to fade out once the chicken moves. */
export const HINT_FADE_OUT_MS = 260;
/** How long one bob of the arrows takes. */
const BOB_MS = 1400;

export type HintColors = {
  /** Keycap fill and outline. */
  cap: string;
  capEdge: string;
  /** The letter and the arrow. */
  ink: string;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Paints the key hints flat on the floor around the tile (col, row). `since`
 * is ms since they started to show, `hiding` ms since they started to go
 * (null while they stay). Returns whether any are still to be drawn.
 */
export function drawKeyHints(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  since: number,
  hiding: number | null,
  colors: HintColors,
  animate: boolean,
) {
  const out = hiding === null ? 1 : 1 - clamp01(hiding / HINT_FADE_OUT_MS);
  if (out <= 0) return false;
  // The arrows nudge outward and back, a small invitation to step.
  const bob = animate ? (1 - Math.cos((2 * Math.PI * since) / BOB_MS)) / 2 : 0;

  KEY_HINTS.forEach(({ label, direction: [dc, dr] }, index) => {
    const shown = animate
      ? easeOutCubic(
          clamp01((since - index * HINT_STAGGER_MS) / HINT_FADE_IN_MS),
        )
      : 1;
    const alpha = shown * out;
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    // From here on one unit is one tile and the axes are the grid's own, so
    // the hint lies flat on the floor like the name does.
    ctx.transform(HALF_W, HALF_H, -HALF_W, HALF_H, 0, 0);
    ctx.translate(col + dc + 0.5, row + dr + 0.5);
    // It settles into place as it fades in.
    const grow = 0.85 + 0.15 * shown;
    ctx.scale(grow, grow);

    // The keycap, set back a little from the arrow.
    const capX = -dc * 0.09;
    const capY = -dr * 0.09;
    const cap = 0.56;
    ctx.beginPath();
    ctx.roundRect(capX - cap / 2, capY - cap / 2, cap, cap, 0.1);
    ctx.fillStyle = colors.cap;
    ctx.fill();
    ctx.lineWidth = 0.025;
    ctx.strokeStyle = colors.capEdge;
    ctx.stroke();

    // The letter. Fonts misbehave at sizes under a pixel, so it is set large
    // and scaled down.
    ctx.save();
    ctx.translate(capX, capY);
    ctx.scale(0.01, 0.01);
    ctx.font = "700 38px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = colors.ink;
    ctx.fillText(label, 0, 2);
    ctx.restore();

    // The arrow, pointing the way this key steps.
    // A solid triangle, which still reads as an arrow when laid flat.
    const reach = 0.29 + 0.04 * bob;
    const tipX = dc * (reach + 0.12);
    const tipY = dr * (reach + 0.12);
    const backX = dc * reach;
    const backY = dr * reach;
    const sideX = -dr * 0.11;
    const sideY = dc * 0.11;
    ctx.beginPath();
    ctx.moveTo(backX + sideX, backY + sideY);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(backX - sideX, backY - sideY);
    ctx.closePath();
    ctx.lineWidth = 0.03;
    ctx.lineJoin = "round";
    ctx.fillStyle = colors.ink;
    ctx.strokeStyle = colors.ink;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  return true;
}
