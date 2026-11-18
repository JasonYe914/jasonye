"use client";

import {
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from "react";
import AboutPanel from "./AboutPanel";
import ContactPanel from "./ContactPanel";
import ProjectGallery from "./ProjectGallery";
import SettingsMenu from "./SettingsMenu";
import { ThemeIcon, useThemeToggle } from "./ThemeToggle";
import {
  GALLERY_CLOSED_EVENT,
  forgetGalleryRequest,
  projectsInUrl,
  travelTo,
  villageStore,
} from "./villageStore";

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
 * Magnification, like the macOS Dock. Each icon grows by how close the
 * pointer is to where it sits at rest: the one under the pointer the most,
 * its neighbours a little, the rest not at all. Icons sit on the bottom
 * edge, so growing pushes them up, and together they bulge out of the top
 * of the bar in a curve.
 */
/** Resting size of an icon, the gap between icons, and the bar's padding. */
const SIZE = 44;
const GAP = 6;
const PAD = 6;
/** How much bigger the icon right under the pointer gets. */
const MAX_GROWTH = 0.3;
/** How quickly the effect falls off, in icon spacings: ~40% one away. */
const SPREAD = 0.75;

/** The pages, then the theme switch and the settings. */
const ITEM_COUNT = PAGES.length + 2;

/** Where each icon's middle sits at rest, from the middle of the bar. */
const REST = (() => {
  const centers = Array.from(
    { length: ITEM_COUNT },
    (_, index) => PAD + SIZE / 2 + index * (SIZE + GAP),
  );
  const length = centers[ITEM_COUNT - 1] + SIZE / 2 + PAD;
  return centers.map((center) => center - length / 2);
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

/** Kept once, rather than asked for again on every pointer move. */
let reducedMotionQuery: MediaQueryList | null = null;
function prefersReducedMotion() {
  reducedMotionQuery ??= matchMedia("(prefers-reduced-motion: reduce)");
  return reducedMotionQuery.matches;
}

type FocusProps = {
  onFocus: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur: () => void;
};

/**
 * The bar itself, and its magnification. The pointer's position lives
 * here rather than in NavBar, so each move re-renders just the icons and
 * not the panels NavBar opens (the gallery, the about page) with them.
 * `children` (the settings panel) is made by NavBar, so it is left alone
 * too when only the pointer moves.
 */
function Dock({
  palette,
  items,
  children,
}: {
  palette: string;
  items: (
    sizeOf: (index: number) => number,
    focusProps: (index: number) => FocusProps,
  ) => ReactNode;
  children?: ReactNode;
}) {
  /** Pointer distance from the middle of the bar, while it is over it. */
  const [pointer, setPointer] = useState<number | null>(null);

  function track(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    if (prefersReducedMotion()) return;
    const box = event.currentTarget.getBoundingClientRect();
    setPointer(event.clientX - (box.left + box.width / 2));
  }

  /** Keyboard focus magnifies around the focused icon, as a pointer would. */
  const focusProps = (index: number): FocusProps => ({
    onFocus: (event) => {
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
      className="nav-bar fixed bottom-9 left-1/2 z-40 flex -translate-x-1/2 flex-row items-end rounded-full"
      style={{ padding: PAD, gap: GAP, height: SIZE + 2 * PAD }}
    >
      {items(sizeOf, focusProps)}
      {children}
    </nav>
  );
}

/**
 * A horizontal dock at the bottom middle: the pages, then the theme
 * switch and the settings. Each icon shows its name above it on hover or
 * focus.
 */
export default function NavBar() {
  const [active, setActive] = useState("home");
  /**
   * Whether the gallery of projects is open over the world. A project's
   * page links back to /?projects, which opens it; after that, the dock's
   * button decides.
   */
  const fromUrl = useSyncExternalStore(
    subscribeToNothing,
    projectsInUrl,
    () => false,
  );
  const [chosen, setChosen] = useState<boolean | null>(null);
  const galleryOpen = chosen ?? fromUrl;
  /** Whether the settings panel is open beside the dock. */
  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Whether the contact card is open over the world. */
  const [contactOpen, setContactOpen] = useState(false);
  /** Whether the about page is open over the world. */
  const [aboutOpen, setAboutOpen] = useState(false);
  /**
   * Whether the full page showing (gallery or about) took the place of the
   * other one. It then appears at once instead of fading in, since a fade
   * would show the world through it for a moment between the two.
   */
  const [swapped, setSwapped] = useState(false);

  function choose(id: string) {
    setSettingsOpen(false);
    if (id === "projects") {
      setContactOpen(false);
      setSwapped(aboutOpen);
      setAboutOpen(false);
      if (galleryOpen) closeGallery();
      else setChosen(true);
      return;
    }
    // Contact is a small window over whatever is showing, so it leaves the
    // gallery or the about page open underneath it.
    if (id === "contact") {
      setContactOpen((open) => !open);
      return;
    }
    setSwapped(id === "about" && galleryOpen);
    // About opens over the world but isn't going to it: no intro for that.
    closeGallery(id !== "about");
    setContactOpen(false);
    if (id === "about") {
      setAboutOpen((open) => !open);
      return;
    }
    setAboutOpen(false);
    setActive(id);
    if (id === "home") travelTo("home");
  }

  /** `toWorld`: whether closing it shows the world, rather than another panel. */
  function closeGallery(toWorld = true) {
    setChosen(false);
    villageStore.closeSheet();
    // Drop ?projects, so a reload doesn't open the gallery again.
    if (projectsInUrl())
      history.replaceState(
        history.state,
        "",
        location.pathname + location.hash,
      );
    forgetGalleryRequest();
    // After the address loses ?projects, so a held intro sees it gone.
    if (galleryOpen)
      window.dispatchEvent(
        new CustomEvent<{ toWorld: boolean }>(GALLERY_CLOSED_EVENT, {
          detail: { toWorld },
        }),
      );
  }
  const palette = useSyncExternalStore(
    subscribeToNothing,
    readPalette,
    () => DEFAULT_PALETTE,
  );
  const { theme, toggle } = useThemeToggle();

  return (
    <>
      <Dock
        palette={palette}
        items={(sizeOf, focusProps) => (
          <>
        {PAGES.map((page, index) => {
          const current =
            page.id ===
            (contactOpen
              ? "contact"
              : galleryOpen
                ? "projects"
                : aboutOpen
                  ? "about"
                  : active);
          const size = sizeOf(index);
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => choose(page.id)}
              aria-label={page.label}
              aria-current={current ? "page" : undefined}
              aria-expanded={
                page.id === "projects"
                  ? galleryOpen
                  : page.id === "contact"
                    ? contactOpen
                    : page.id === "about"
                      ? aboutOpen
                      : undefined
              }
              aria-controls={
                page.id === "projects"
                  ? "project-gallery"
                  : page.id === "contact"
                    ? "contact-panel"
                    : page.id === "about"
                      ? "about-panel"
                      : undefined
              }
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

        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Settings"
          aria-expanded={settingsOpen}
          aria-controls="settings-menu"
          className="nav-item relative grid shrink-0 place-items-center rounded-full"
          data-open={settingsOpen ? "" : undefined}
          style={{
            width: sizeOf(PAGES.length + 1),
            height: sizeOf(PAGES.length + 1),
          }}
          {...focusProps(PAGES.length + 1)}
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
            <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="17" r="2" />
          </svg>
          <span className="nav-tip">Settings</span>
        </button>
          </>
        )}
      >
        {settingsOpen && (
          <SettingsMenu
            onClose={() => setSettingsOpen(false)}
            onHome={() => {
              closeGallery();
              setContactOpen(false);
              setAboutOpen(false);
              setActive("home");
              travelTo("home");
            }}
          />
        )}
      </Dock>
      {galleryOpen && (
        // Opened by the address (back from a project's page), or in place
        // of the about page, it is there at once rather than fading in.
        <ProjectGallery
          onClose={closeGallery}
          instant={chosen === null || swapped}
        />
      )}
      {aboutOpen && (
        <AboutPanel onClose={() => setAboutOpen(false)} instant={swapped} />
      )}
      {contactOpen && <ContactPanel onClose={() => setContactOpen(false)} />}
    </>
  );
}
