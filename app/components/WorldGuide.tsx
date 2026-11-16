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
    label: "Centre",
    spoken: "Space brings the view back to the chicken.",
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

  return (
    <section className="guide chrome" aria-label="Controls">
      <ul className="guide-rows">
        {ROWS.map((row) => (
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
