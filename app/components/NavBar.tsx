"use client";

import {
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";
import Emblem from "./Emblem";
import { ThemeIcon, useThemeToggle } from "./ThemeToggle";
import { VILLAGES } from "./villages";
import { travelTo } from "./villageStore";

/**
 * Placeholder destinations. Swap the labels and icons once the pages
 * exist; each will most likely become a <Link href="..."> instead of a
 * button.
 */
const PAGES: { id: string; label: string; icon: ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
    ),
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <>
        <circle cx="12" cy="8.5" r="3.75" />
        <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
      </>
    ),
  },
  {
    id: "contact",
    label: "Contact",
    icon: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
      </>
    ),
  },
];

/*
 * Magnification, like the macOS Dock turned on its side. Each icon grows
 * by how close the pointer is to where it sits at rest: the one under the
 * pointer the most, its neighbours a little, the rest not at all. Icons
 * are left-aligned, so growing pushes them out to the right, and together
 * they bulge out of the bar in a curve.
 */
/** Resting size of an icon, the gap between icons, and the bar's padding. */
const SIZE = 44;
const GAP = 6;
const PAD = 6;
/** How much bigger the icon right under the pointer gets. */
const MAX_GROWTH = 0.3;
/** How quickly the effect falls off, in icon spacings: ~40% one away. */
const SPREAD = 0.75;

const ITEM_COUNT = PAGES.length + 1;

/** Where each icon's middle sits at rest, from the middle of the bar. */
const REST = (() => {
  const centers = Array.from(
    { length: ITEM_COUNT },
    (_, index) => PAD + SIZE / 2 + index * (SIZE + GAP),
  );
  const height = centers[ITEM_COUNT - 1] + SIZE / 2 + PAD;
  return centers.map((center) => center - height / 2);
})();

function growthAt(index: number, pointer: number | null) {
  if (pointer === null) return 0;
  const distance = (pointer - REST[index]) / (SIZE + GAP);
  return MAX_GROWTH * Math.exp(-(distance * distance) / (2 * SPREAD * SPREAD));
}

/*
 * Palettes being tried out, picked with ?nav=<name> in the address bar.
 * Each one is defined for both themes in globals.css.
 */
export const NAV_PALETTES = ["aluminum", "graphite", "space-gray", "stone"];
const DEFAULT_PALETTE = "aluminum";

function readPalette() {
  const name = new URLSearchParams(window.location.search).get("nav");
  return name && NAV_PALETTES.includes(name) ? name : DEFAULT_PALETTE;
}

function subscribeToNothing() {
  return () => {};
}

/**
 * A vertical dock on the left edge: the pages, then the theme switch.
 * Each icon shows its name to the right on hover or focus.
 */
export default function NavBar() {
  const [active, setActive] = useState("home");
  /** Whether the list of villages to travel to is open. */
  const [travelOpen, setTravelOpen] = useState(false);

  function choose(id: string) {
    if (id === "projects") {
      setTravelOpen((open) => !open);
      return;
    }
    setTravelOpen(false);
    setActive(id);
    if (id === "home") travelTo("home");
  }

  function go(id: string) {
    setTravelOpen(false);
    setActive("projects");
    travelTo(id);
  }
  /** Pointer height from the middle of the bar, while it is over it. */
  const [pointer, setPointer] = useState<number | null>(null);
  const palette = useSyncExternalStore(
    subscribeToNothing,
    readPalette,
    () => DEFAULT_PALETTE,
  );
  const { theme, toggle } = useThemeToggle();

  function track(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    setPointer(event.clientY - (box.top + box.height / 2));
  }

  /** Keyboard focus magnifies around the focused icon, as a pointer would. */
  const focusProps = (index: number) => ({
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
      if (event.currentTarget.matches(":focus-visible")) {
        setPointer(REST[index]);
      }
    },
    onBlur: () => setPointer(null),
  });

  const sizeOf = (index: number) => SIZE * (1 + growthAt(index, pointer));

  return (
    <nav
      aria-label="Main"
      data-palette={palette}
      onPointerMove={track}
      onPointerLeave={() => setPointer(null)}
      className="nav-bar fixed top-1/2 left-4 z-40 flex -translate-y-1/2 flex-col items-start rounded-full"
      style={{ padding: PAD, gap: GAP, width: SIZE + 2 * PAD }}
    >
      {PAGES.map((page, index) => {
        const current = page.id === active;
        const size = sizeOf(index);
        return (
          <button
            key={page.id}
            type="button"
            onClick={() => choose(page.id)}
            aria-label={page.label}
            aria-current={current ? "page" : undefined}
            aria-expanded={page.id === "projects" ? travelOpen : undefined}
            aria-controls={page.id === "projects" ? "travel-menu" : undefined}
            className="nav-item relative grid shrink-0 place-items-center rounded-full"
            style={{ width: size, height: size }}
            {...focusProps(index)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {page.icon}
            </svg>
            <span className="nav-tip">{page.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={toggle}
        aria-label="Dark mode"
        aria-pressed={theme === null ? undefined : theme === "dark"}
        className="nav-item relative grid shrink-0 place-items-center rounded-full"
        style={{
          width: sizeOf(PAGES.length),
          height: sizeOf(PAGES.length),
        }}
        {...focusProps(PAGES.length)}
      >
        <ThemeIcon />
        <span className="nav-tip">
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </span>
      </button>

      {travelOpen && (
        <div
          id="travel-menu"
          className="travel-menu chrome"
          // The dock magnifies with the pointer; the list shouldn't.
          onPointerMove={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Escape") setTravelOpen(false);
          }}
        >
          <p className="travel-menu-title">Travel to</p>
          <ul>
            {VILLAGES.map((village) => (
              <li key={village.id}>
                <button type="button" onClick={() => go(village.id)}>
                  <Emblem id={village.id} color={village.color} size={28} />
                  <span>
                    <span className="travel-name">{village.name}</span>
                    <span className="travel-meta">{village.dates}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
