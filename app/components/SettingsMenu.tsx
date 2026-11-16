"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { zoomWorld } from "./villageStore";
import { showGuide, worldSettings, type WorldSettings } from "./worldSettings";

/** How much one press of a zoom button zooms. */
const ZOOM_STEP = 1.35;

const TOGGLES: { key: keyof WorldSettings; label: string }[] = [
  { key: "minimap", label: "Minimap" },
  { key: "coords", label: "Coordinates" },
  { key: "edgePan", label: "Edge scrolling" },
];

/**
 * The world's settings, opened from the dock: zoom buttons for anyone
 * without a scroll wheel, a way back to the start, what is shown on
 * screen, and the controls guide again.
 */
export default function SettingsMenu({
  onClose,
  onHome,
}: {
  onClose: () => void;
  onHome: () => void;
}) {
  const settings = useSyncExternalStore(
    worldSettings.subscribe,
    worldSettings.get,
    worldSettings.server,
  );
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    root.current?.querySelector("button")?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // A press anywhere outside the panel or its dock button closes it.
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (root.current?.contains(target)) return;
      if (target?.closest('[aria-controls="settings-menu"]')) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  return (
    <div
      ref={root}
      id="settings-menu"
      role="dialog"
      aria-label="Settings"
      className="settings-menu chrome"
      // The dock magnifies with the pointer; the panel shouldn't.
      onPointerMove={(event) => event.stopPropagation()}
    >
      <p className="settings-title">Settings</p>

      <div className="settings-group">
        <p className="settings-label">View</p>
        <div className="settings-zoom" role="group" aria-label="Zoom">
          <button
            type="button"
            onClick={() => zoomWorld(1 / ZOOM_STEP)}
            aria-label="Zoom out"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12" />
            </svg>
          </button>
          <button type="button" onClick={() => zoomWorld(0)}>
            Reset zoom
          </button>
          <button
            type="button"
            onClick={() => zoomWorld(ZOOM_STEP)}
            aria-label="Zoom in"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 12h12M12 6v12" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="settings-row-button"
          onClick={() => {
            onHome();
            onClose();
          }}
        >
          Back to start
        </button>
      </div>

      <div className="settings-group">
        <p className="settings-label">On screen</p>
        {TOGGLES.map((toggle) => (
          <button
            key={toggle.key}
            type="button"
            role="switch"
            aria-checked={settings[toggle.key]}
            className="settings-switch"
            disabled={toggle.key === "coords" && !settings.minimap}
            onClick={() =>
              worldSettings.set({ [toggle.key]: !settings[toggle.key] })
            }
          >
            <span className="settings-switch-label">{toggle.label}</span>
            <span className="settings-switch-track" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="settings-group">
        <button
          type="button"
          className="settings-row-button"
          onClick={() => {
            showGuide();
            onClose();
          }}
        >
          Controls
        </button>
      </div>
    </div>
  );
}
