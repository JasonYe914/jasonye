"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import BlockHeading from "./BlockHeading";
import ProjectMedia from "./ProjectMedia";
import { PROJECTS, type Project } from "./projects";

/*
 * Every project as a picture and a button, opened from the Projects button
 * in the dock. The details live on each project's own page. The cards sit
 * in lanes of different widths, and each picture takes a shape that suits
 * its subject, so the seams between cards never line up across the page.
 */

type Lanes = 1 | 2 | 3 | 4;

/** Each lane's share of the width, left to right, for each lane count. */
const WIDTHS: Record<Lanes, number[]> = {
  4: [1.25, 0.85, 1.1, 0.9],
  3: [1.3, 0.8, 1],
  2: [1.2, 1],
  1: [1],
};
/** A card's name and button, as a share of a lane's width, for balancing lanes. */
const BUTTON = 0.16;

/**
 * Puts the projects into lanes so the lanes end as nearly level as they
 * can. The gallery ends on one straight line by stretching the cards of
 * any shorter lane, and a stretched card shows its picture smaller than
 * its frame, so the closer the lanes come out, the better every picture
 * fits. Cards are first dealt in order into whichever lane is shortest,
 * then moved and swapped between lanes while that brings the lanes
 * closer. Each lane keeps its cards in the gallery's order.
 */
function arrange(count: Lanes) {
  // The same lanes every time for a given count, so worked out only once.
  let arranged = ARRANGED.get(count);
  if (!arranged) {
    arranged = arrangeLanes(count);
    ARRANGED.set(count, arranged);
  }
  return arranged;
}

const ARRANGED = new Map<Lanes, ReturnType<typeof arrangeLanes>>();

function arrangeLanes(count: Lanes) {
  const widths = WIDTHS[count];
  const projects = PROJECTS.filter((p) => !p.featured);
  // A card's height in a lane, in the same units as the lane widths.
  const cardIn = (project: Project, lane: number) =>
    widths[lane] / project.media.aspect + BUTTON * widths[lane];

  const laneOf: number[] = [];
  const heights = widths.map(() => 0);
  projects.forEach((project, i) => {
    const lane = heights.indexOf(Math.min(...heights));
    laneOf[i] = lane;
    heights[lane] += cardIn(project, lane);
  });

  const spread = () => {
    const h = widths.map(() => 0);
    projects.forEach((project, i) => (h[laneOf[i]] += cardIn(project, laneOf[i])));
    return Math.max(...h) - Math.min(...h);
  };
  // Never empty a lane, so every lane always has a card to stretch.
  const counts = () => widths.map((_, lane) => laneOf.filter((l) => l === lane).length);
  let best = spread();
  for (let improved = true; improved; ) {
    improved = false;
    for (let i = 0; i < projects.length; i++) {
      for (let lane = 0; lane < widths.length; lane++) {
        // Move card i to another lane.
        const from = laneOf[i];
        if (lane !== from && counts()[from] > 1) {
          laneOf[i] = lane;
          const s = spread();
          if (s < best - 1e-6) {
            best = s;
            improved = true;
          } else laneOf[i] = from;
        }
        // Swap card i with each card in another lane.
        for (let j = i + 1; j < projects.length; j++) {
          if (laneOf[j] === laneOf[i]) continue;
          [laneOf[i], laneOf[j]] = [laneOf[j], laneOf[i]];
          const s = spread();
          if (s < best - 1e-6) {
            best = s;
            improved = true;
          } else [laneOf[i], laneOf[j]] = [laneOf[j], laneOf[i]];
        }
      }
    }
  }

  const lanes: Project[][] = widths.map(() => []);
  projects.forEach((project, i) => lanes[laneOf[i]].push(project));
  return { widths: widths.map((w) => `${w}fr`).join(" "), lanes };
}

const WIDEST = "(min-width: 1500px)";
const WIDE = "(min-width: 1100px)";
const MEDIUM = "(min-width: 700px)";

function subscribeToWidth(onChange: () => void) {
  const queries = [WIDEST, WIDE, MEDIUM].map((query) => matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", onChange));
}

function laneCount(): Lanes {
  if (matchMedia(WIDEST).matches) return 4;
  if (matchMedia(WIDE).matches) return 3;
  if (matchMedia(MEDIUM).matches) return 2;
  return 1;
}

export default function ProjectGallery({
  onClose,
  instant = false,
}: {
  onClose: () => void;
  /** Show at once, without fading in: for arriving back from a project. */
  instant?: boolean;
}) {
  const count = useSyncExternalStore<Lanes>(
    subscribeToWidth,
    laneCount,
    () => 3,
  );
  const { widths, lanes } = arrange(count);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // The world listens on the window for movement keys and would also
    // swallow the arrows, so keys pressed in here stop with the gallery.
    event.stopPropagation();
    if (event.key === "Escape") onClose();
  }

  return (
    <section
      ref={root}
      id="project-gallery"
      className={instant ? "gallery gallery-instant" : "gallery"}
      aria-labelledby="gallery-title"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <header className="gallery-head">
        <h2 id="gallery-title" className="gallery-title">
          <BlockHeading parts={[{ text: "Projects" }]} />
        </h2>
        <button
          type="button"
          className="gallery-close"
          onClick={onClose}
          aria-label="Close projects"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      {PROJECTS.filter((project) => project.featured).map((project) => (
        <Feature key={project.id} project={project} />
      ))}

      <div className="gallery-grid" style={{ gridTemplateColumns: widths }}>
        {lanes.map((lane, index) => (
          <div key={index} className="gallery-lane">
            {lane.map((project) => (
              <Card key={project.id} project={project} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * A project that matters most: across the whole gallery, its picture large
 * and what it is beside it, ahead of the lanes.
 */
function Feature({ project }: { project: Project }) {
  return (
    <article className="gallery-card gallery-feature">
      <div className="gallery-feature-media">
        <ProjectMedia project={project} />
      </div>
      <div className="gallery-feature-body">
        <p className="gallery-feature-kicker">Featured · {project.dates}</p>
        <h3 className="gallery-feature-name">{project.name}</h3>
        <p className="gallery-feature-summary">{project.summary}</p>
        {project.tools.length > 0 && (
          <ul className="gallery-feature-tools" aria-label="Built with">
            {project.tools.map((tool) => (
              <li key={tool.name}>{tool.name}</li>
            ))}
          </ul>
        )}
        <Link
          href={`/projects/${project.id}`}
          className="gallery-card-link"
          aria-label={`View project: ${project.name}`}
        >
          View project
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function Card({ project }: { project: Project }) {
  return (
    <article className="gallery-card">
      {/* The spacer holds the picture's own shape; the picture fills the
          frame, so the last card in a lane can stretch to the bottom. */}
      <div className="gallery-frame">
        <div
          className="gallery-sizer"
          style={{ aspectRatio: project.media.aspect }}
          aria-hidden="true"
        />
        <ProjectMedia project={project} />
      </div>
      <h3 className="gallery-card-name">{project.name}</h3>
      <Link
        href={`/projects/${project.id}`}
        className="gallery-card-link"
        aria-label={`View project: ${project.name}`}
      >
        View project
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
