"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { INTRO_LANDED_EVENT } from "./keyHints";
import { GUIDE_EVENT, worldSettings } from "./worldSettings";

/** Wait after the intro lands, so the view has pulled back first. */
const SHOW_DELAY_MS = 1500;

/** Keys that walk the chicken; pressing one also puts the guide away. */
const MOVE_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
]);

function Key({ children }: { children: ReactNode }) {
  return <kbd className="guide-key">{children}</kbd>;
}

function MouseIcon({ button }: { button: "right" | "wheel" }) {
  return (
    <svg className="guide-mouse" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="6" />
      <path d="M12 3v6.5M6 9.5h12" />
      {button === "right" ? (
        <path
          className="guide-mouse-on"
          d="M12 3.6a5.4 5.4 0 0 1 5.4 5.4v.5H12Z"
        />
      ) : (
        <rect
          className="guide-mouse-on"
          x="11"
          y="5"
          width="2"
          height="3.2"
          rx="1"
        />
      )}
    </svg>
  );
}

/** A fingertip gesture, drawn in the same line style as the mouse. */
function TouchIcon({ gesture }: { gesture: "tap" | "drag" | "pinch" | "details" }) {
  return (
    <svg className="guide-mouse" viewBox="0 0 24 24" aria-hidden="true">
      {gesture === "tap" && (
        <>
          <circle className="guide-mouse-on" cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="10" opacity="0.45" />
        </>
      )}
      {gesture === "drag" && (
        <>
          <circle className="guide-mouse-on" cx="12" cy="12" r="3" />
          <path d="M3 12h4M17 12h4M12 3v4M12 17v4" />
          <path d="M5 10l-2 2 2 2M19 10l2 2-2 2M10 5l2-2 2 2M10 19l2 2 2-2" />
        </>
      )}
      {gesture === "details" && (
        <>
          <rect x="3.5" y="3.5" width="15" height="15" rx="3" />
          <path d="M7.5 8.5h7M7.5 12h4.5" />
          <circle className="guide-mouse-on" cx="17.5" cy="17.5" r="3" />
        </>
      )}
      {gesture === "pinch" && (
        <>
          <circle className="guide-mouse-on" cx="8.5" cy="15.5" r="2.6" />
          <circle className="guide-mouse-on" cx="15.5" cy="8.5" r="2.6" />
          <path d="M5.5 18.5 3 21M18.5 5.5 21 3M3 17.5V21h3.5M21 6.5V3h-3.5" />
        </>
      )}
    </svg>
  );
}

/** The same guide for a touch screen, where there are no keys or mouse. */
const TOUCH_ROWS: { keys: ReactNode; label: string; spoken: string }[] = [
  {
    keys: <TouchIcon gesture="tap" />,
    label: "Go to",
    spoken: "Tap a tile to walk the chicken there.",
  },
  {
    keys: <TouchIcon gesture="drag" />,
    label: "Look",
    spoken: "Drag to look around the world.",
  },
  {
    keys: <TouchIcon gesture="pinch" />,
    label: "Zoom",
    spoken: "Pinch to zoom in and out.",
  },
  {
    keys: <TouchIcon gesture="details" />,
    label: "Details",
    spoken: "Tap the chicken while it stands in a place to read that place's details.",
  },
];

/**
 * Each control as a picture and one word. The pictures carry the meaning;
 * full sentences are only for screen readers.
 */
const ROWS: { keys: ReactNode; label: string; spoken: string }[] = [
  {
    keys: (
      <span className="guide-wasd">
        <Key>W</Key>
        <Key>A</Key>
        <Key>S</Key>
        <Key>D</Key>
      </span>
    ),
    label: "Move",
    spoken: "W, A, S and D, or the arrow keys, walk the chicken.",
  },
  {
    keys: <MouseIcon button="right" />,
    label: "Go to",
    spoken: "Right-click a tile to walk there.",
  },
  {
    keys: <MouseIcon button="wheel" />,
    label: "Zoom",
    spoken: "Scroll to zoom in and out.",
  },
  {
    keys: <Key>E</Key>,
    label: "Details",
    spoken: "E opens the details of what the chicken stands beside.",
  },
  {
    keys: <kbd className="guide-key is-wide">Space</kbd>,
    // A no-break space keeps the slash with "Centre" when the label wraps.
    label: "Centre / follow",
    spoken: "Space brings the view back to the chicken; hold it and the view follows the chicken.",
  },
];

/**
 * A strip showing how to get around the world. It shows after the intro on
 * every visit, and again whenever the settings ask for it.
 */
export default function WorldGuide() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Applies the saved settings (minimap and so on) as the page opens.
    worldSettings.get();
    let timer = 0;
    const onLanded = () => {
      timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    };
    const onAsk = () => setOpen(true);
    window.addEventListener(INTRO_LANDED_EVENT, onLanded);
    window.addEventListener(GUIDE_EVENT, onAsk);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INTRO_LANDED_EVENT, onLanded);
      window.removeEventListener(GUIDE_EVENT, onAsk);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    button.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "escape" || MOVE_KEYS.has(key)) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  if (!open) return null;
  // Only ever open in the browser (after the intro), so this is safe to read here.
  const touch = window.matchMedia("(pointer: coarse)").matches;

  return (
    <section className={touch ? "guide chrome is-touch" : "guide chrome"} aria-label="Controls">
      <ul className="guide-rows">
        {(touch ? TOUCH_ROWS : ROWS).map((row) => (
          <li key={row.label}>
            <span className="guide-keys" aria-hidden="true">
              {row.keys}
            </span>
            <span className="guide-label" aria-hidden="true">
              {row.label}
            </span>
            <span className="sr-only">{row.spoken}</span>
          </li>
        ))}
      </ul>
      <button ref={button} type="button" className="guide-ok" onClick={close}>
        Got it
      </button>
    </section>
  );
}
