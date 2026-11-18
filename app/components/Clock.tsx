"use client";

import { useSyncExternalStore } from "react";

/*
 * The visitor's local time, in the top right corner: 12-hour, with
 * seconds, like 12:47:04 AM. Shown only once the page is in the browser, so
 * the server's clock never shows.
 */

function subscribe(onTick: () => void) {
  // Tick on each new second, not a second after the page happened to load.
  let interval: number | undefined;
  const timeout = window.setTimeout(() => {
    onTick();
    interval = window.setInterval(onTick, 1000);
  }, 1000 - (Date.now() % 1000));
  return () => {
    window.clearTimeout(timeout);
    window.clearInterval(interval);
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function now() {
  const d = new Date();
  const hours = d.getHours() % 12 || 12;
  const half = d.getHours() < 12 ? "AM" : "PM";
  return `${pad(hours)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${half}`;
}

export default function Clock() {
  const time = useSyncExternalStore(subscribe, now, () => null);
  if (!time) return null;
  return (
    <time className="clock" aria-label={`Local time ${time}`}>
      {time}
    </time>
  );
}
