/*
 * BankView's board plays a short loop over its sign-in screenshot: the
 * email types itself in, then the password, the pointer drifts to Sign In
 * and presses it, the button spins, and it all fades back to the empty
 * form to start again.
 *
 * It is drawn live over the (cached) screenshot rather than baked into a
 * video, so the typing stays crisp at any zoom. Positions are measured in
 * the original 1904 × 905 screenshot; signin.png is cut from it, the form
 * from (180, 150) and the dashboard preview set close beside it.
 */

export const SIGNIN_SIZE = { w: 1174, h: 610 };
/** Where signin.png's top-left corner was in the original screenshot. */
const CROP = { x: 180, y: 150 };

/** One full loop, in ms. */
const LOOP_MS = 7600;

// A reserved example.com address, so the demo never shows a real inbox.
const EMAIL = "demo.user@example.com";
const PASSWORD_LENGTH = 15;

// Where the form's parts are in the screenshot, measured from it.
const EMAIL_BOX = { x: 262, y: 433, w: 420, h: 32 };
const PASSWORD_BOX = { x: 262, y: 533, w: 420, h: 32 };
const BUTTON = { x: 262, y: 597, w: 420, h: 32 };
const TEXT_X = 273;
const FONT = '400 15.5px Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
const INK = "#101828";
const FOCUS = "#1570ef";

// The timeline, in ms from the start of the loop.
const EMAIL_FROM = 700;
const EMAIL_CHAR_MS = 70;
const EMAIL_DONE = EMAIL_FROM + EMAIL.length * EMAIL_CHAR_MS;
const PASSWORD_FROM = EMAIL_DONE + 350;
const PASSWORD_CHAR_MS = 55;
const PASSWORD_DONE = PASSWORD_FROM + PASSWORD_LENGTH * PASSWORD_CHAR_MS;
const POINT_FROM = PASSWORD_DONE + 150;
const POINT_TO = POINT_FROM + 650;
const PRESS_TO = POINT_TO + 180;
const SPIN_TO = PRESS_TO + 1500;
const FADE_FROM = SPIN_TO + 500;
const FADE_TO = FADE_FROM + 500;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

function roundRect(ctx: CanvasRenderingContext2D, b: typeof EMAIL_BOX, r: number) {
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, r);
}

/** A field: placeholder hidden, focus ring when active, and its contents. */
function field(
  ctx: CanvasRenderingContext2D,
  box: typeof EMAIL_BOX,
  focused: boolean,
  filled: boolean,
  draw: () => number,
  caret: boolean,
) {
  if (!focused && !filled) return;
  // Wipe the placeholder.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
  if (focused) {
    ctx.strokeStyle = "rgba(21, 112, 239, 0.18)";
    ctx.lineWidth = 6;
    roundRect(ctx, box, 7);
    ctx.stroke();
    ctx.strokeStyle = FOCUS;
    ctx.lineWidth = 1.5;
    roundRect(ctx, box, 7);
    ctx.stroke();
  }
  const end = draw();
  if (caret) {
    ctx.fillStyle = INK;
    ctx.fillRect(end + 1.5, box.y + 8, 1.5, box.h - 16);
  }
}

/** The pointer, tip at (x, y). */
function pointer(ctx: CanvasRenderingContext2D, x: number, y: number, pressed: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (pressed) ctx.scale(0.9, 0.9);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 19);
  ctx.lineTo(4.6, 14.8);
  ctx.lineTo(8, 22);
  ctx.lineTo(11, 20.6);
  ctx.lineTo(7.6, 13.6);
  ctx.lineTo(13.6, 13.6);
  ctx.closePath();
  ctx.fillStyle = "#111111";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the loop `elapsed` ms after it started, over the screenshot.
 * `still` shows the filled-in form without moving, for reduced motion.
 */
export function drawSignInDemo(ctx: CanvasRenderingContext2D, elapsed: number, still: boolean) {
  const t = still ? PASSWORD_DONE : elapsed % LOOP_MS;
  ctx.save();
  ctx.translate(-CROP.x, -CROP.y);
  ctx.globalAlpha = 1 - clamp01((t - FADE_FROM) / (FADE_TO - FADE_FROM));
  if (ctx.globalAlpha <= 0) {
    ctx.restore();
    return;
  }
  ctx.font = FONT;
  ctx.textBaseline = "alphabetic";
  const blink = Math.floor(t / 500) % 2 === 0;

  // Email: focused from the start, typed a letter at a time.
  const typed = still
    ? EMAIL.length
    : Math.floor(clamp01((t - EMAIL_FROM) / (EMAIL_DONE - EMAIL_FROM)) * EMAIL.length);
  const emailFocus = !still && t < PASSWORD_FROM - 150;
  field(
    ctx,
    EMAIL_BOX,
    emailFocus,
    typed > 0,
    () => {
      const text = EMAIL.slice(0, typed);
      ctx.fillStyle = INK;
      ctx.fillText(text, TEXT_X, 453);
      return TEXT_X + ctx.measureText(text).width;
    },
    emailFocus && (blink || (t > EMAIL_FROM && t < EMAIL_DONE)),
  );

  // Password: a dot a key.
  const dots = still
    ? PASSWORD_LENGTH
    : Math.floor(
        clamp01((t - PASSWORD_FROM) / (PASSWORD_DONE - PASSWORD_FROM)) * PASSWORD_LENGTH,
      );
  const passwordFocus = !still && t >= PASSWORD_FROM - 150 && t < POINT_TO;
  field(
    ctx,
    PASSWORD_BOX,
    passwordFocus,
    dots > 0,
    () => {
      ctx.fillStyle = INK;
      for (let i = 0; i < dots; i++) {
        ctx.beginPath();
        ctx.arc(TEXT_X + 4 + i * 7.8, 549, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return TEXT_X + dots * 7.8;
    },
    passwordFocus && (blink || (t > PASSWORD_FROM && t < PASSWORD_DONE)),
  );

  if (!still) {
    // Pressed, then working: the button darkens, then spins.
    if (t >= POINT_TO && t < PRESS_TO) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      roundRect(ctx, BUTTON, 6);
      ctx.fill();
    }
    if (t >= PRESS_TO) {
      const fill = ctx.createLinearGradient(BUTTON.x, 0, BUTTON.x + BUTTON.w, 0);
      fill.addColorStop(0, "#077bfe");
      fill.addColorStop(1, "#4291ff");
      ctx.fillStyle = fill;
      ctx.fillRect(BUTTON.x + 30, BUTTON.y + 3, BUTTON.w - 60, BUTTON.h - 6);
      const cx = BUTTON.x + BUTTON.w / 2;
      const cy = BUTTON.y + BUTTON.h / 2;
      ctx.font = `600 15.5px Inter, "Segoe UI", system-ui, sans-serif`;
      const label = "Signing in";
      const width = ctx.measureText(label).width;
      const spinX = cx - (width + 22) / 2 + 7;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(spinX, cy, 6.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      const a = (t / 140) % (Math.PI * 2);
      ctx.arc(spinX, cy, 6.5, a, a + Math.PI * 0.6);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, spinX + 15, cy + 1);
    }

    // The pointer drifts in from beside the password to the button.
    if (t >= POINT_FROM - 200 && t < SPIN_TO) {
      const k = easeInOut(clamp01((t - POINT_FROM) / (POINT_TO - POINT_FROM)));
      const x = 640 + (500 - 640) * k;
      const y = 575 + (612 - 575) * k;
      ctx.globalAlpha *= clamp01((t - (POINT_FROM - 200)) / 200);
      pointer(ctx, x, y, t >= POINT_TO && t < PRESS_TO);
    }
  }
  ctx.restore();
}
