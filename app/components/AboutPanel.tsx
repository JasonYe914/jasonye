"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { travelTo } from "./villageStore";
import { VILLAGES, type Village } from "./villages";

/*
 * About: a flat page over the world, opened from the dock. One grid: the
 * words (a big title, a short intro and the path) down the left, and a
 * mosaic of pictures beside them. On narrow screens the pictures fall
 * below the words.
 *
 * The path is read from the villages, so it stays in step with the world.
 */

const INTRO =
  "I'm Jason, a Mechanical Engineering student at Queen's who ended up writing more code than CAD. I like building things people actually use, from drone scripts to web apps.";

/**
 * The pictures, in two rows beside the words: a squarer one then a wide
 * one on top, a wide one then a squarer one below, so the seams stagger.
 * `area` names each one's grid cell, and `focus` which part of it to keep
 * when it is cropped. A picture with `fill` is shown whole instead, on its
 * own flat background colour, so nothing of it is cut off.
 *
 * The engine picture in /about is a copy made for this page: un-slanted
 * (the world's copy is pre-slanted to lie on its floor), with its CAD grid,
 * which faded out partway, redrawn evenly to the edges, and framed tall
 * enough that any cell crops only grid.
 */
type Photo = {
  area: string;
  src: string;
  focus: string;
  alt: string;
  fill?: string;
};

const PHOTOS: Photo[] = [
  {
    area: "a",
    src: "/about/engine-iso.png",
    focus: "center",
    alt: "Isometric view of a V8 engine block modelled in CAD, its translucent block showing the pistons and crankshaft",
  },
  {
    area: "b",
    src: "/villages/queens/building.jpg",
    focus: "center 55%",
    alt: "The glass front of an engineering building at Queen's at dusk",
  },
  {
    area: "c",
    src: "/villages/qadt/logo.png",
    focus: "center",
    fill: "rgb(18 47 79)",
    alt: "The Queen's Aerospace Design Team logo",
  },
  {
    area: "d",
    src: "/villages/queens/campus.jpg",
    focus: "78% center",
    alt: "Aerial view of the Queen's campus and stadium by Lake Ontario",
  },
];

const KIND_LABEL: Record<Village["kind"], string> = {
  Education: "Education",
  Experience: "Internship",
  Team: "Design team",
  Project: "Project",
};

const MONTHS = "JanFebMarAprMayJunJulAugSepOctNovDec";

/** Start of a "Sep 2025 – Present" range, as a sortable number; undated
 *  entries count as newest, since they are still in progress. */
function startOf(dates: string) {
  const [month, year] = dates.split(/\s+/);
  const value = Number(year) * 12 + MONTHS.indexOf(month) / 3;
  return Number.isFinite(value) ? value : Infinity;
}

/** The year a stop began, or "TBD". */
function yearOf(dates: string) {
  return dates.match(/\d{4}/)?.[0] ?? "TBD";
}

/** Every village, newest first: one line each. */
const PATH = [...VILLAGES].sort((a, b) => {
  const x = startOf(a.dates);
  const y = startOf(b.dates);
  return x === y ? 0 : y > x ? 1 : -1;
});

export default function AboutPanel({
  onClose,
  instant = false,
}: {
  onClose: () => void;
  /** Show at once, without fading in: for taking the gallery's place. */
  instant?: boolean;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Keep keys from walking the chicken while the page is open.
    event.stopPropagation();
    if (event.key === "Escape") onClose();
  }

  return (
    <section
      ref={root}
      id="about-panel"
      className={instant ? "gallery about gallery-instant" : "gallery about"}
      aria-labelledby="about-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className="gallery-head">
        <button
          type="button"
          className="gallery-close"
          onClick={onClose}
          aria-label="Close about"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <article className="about-sheet">
        <div className="about-words">
          <h2 id="about-title" className="about-title">
            About me
          </h2>
          <p className="about-lead">{INTRO}</p>

          <section aria-labelledby="about-path">
            <h3 id="about-path" className="about-label">
              Path
            </h3>
            <ol className="about-path">
              {PATH.map((village) => (
                <li key={village.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      travelTo(village.id);
                    }}
                    aria-label={`${village.name}, ${KIND_LABEL[village.kind]}, ${village.dates}. Go there in the world.`}
                  >
                    <span className="about-year">{yearOf(village.dates)}</span>
                    <strong>{village.name}</strong>
                    <span className="about-kind">{KIND_LABEL[village.kind]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {PHOTOS.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            className="about-photo"
            data-area={photo.area}
            style={{
              gridArea: photo.area,
              objectPosition: photo.focus,
              ...(photo.fill && {
                objectFit: "contain",
                background: photo.fill,
                padding: "5%",
              }),
            }}
            loading="lazy"
          />
        ))}
      </article>
    </section>
  );
}
