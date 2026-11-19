/*
 * Canvas pixels per CSS pixel, and how capable the device is. Every frame
 * repaints the whole canvas, so its cost grows with its pixel count.
 * Phones are often 3× (nine canvas pixels per CSS pixel); at 2× they look
 * the same at arm's length and paint less than half as many. A weak phone
 * goes down to 1.5×, a touch softer but far lighter. Only touch screens
 * are capped: a mouse-driven screen keeps its full ratio.
 */

/** The most canvas pixels per CSS pixel on a touch screen. */
const TOUCH_MAX = 2;
/** The same, on a weak phone or tablet (see lowEndTouch). */
const LOW_END_MAX = 1.5;

let coarse: MediaQueryList | null = null;
let lowEnd: boolean | null = null;

/** Whether the main pointer is a finger: a phone or tablet. */
export function touchScreen() {
  if (typeof window === "undefined") return false;
  coarse ??= window.matchMedia("(pointer: coarse)");
  return coarse.matches;
}

/**
 * A phone or tablet that needs going easy on: one with Data Saver on, or
 * with little memory or few cores. Only Chromium browsers report memory;
 * Safari and Firefox report cores only (and Safari rounds them), so there
 * only a very weak device counts, which keeps capable iPhones on the full
 * experience. Worked out once, since none of it changes during a visit.
 */
export function lowEndTouch() {
  if (lowEnd !== null) return lowEnd;
  if (!touchScreen()) return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const cores = nav.hardwareConcurrency || 8;
  lowEnd =
    nav.connection?.saveData === true ||
    (nav.deviceMemory !== undefined
      ? nav.deviceMemory <= 4 || cores <= 4
      : cores <= 2);
  return lowEnd;
}

export function pixelRatio() {
  if (typeof window === "undefined") return 1;
  const ratio = window.devicePixelRatio || 1;
  if (!touchScreen()) return ratio;
  return Math.min(ratio, lowEndTouch() ? LOW_END_MAX : TOUCH_MAX);
}
