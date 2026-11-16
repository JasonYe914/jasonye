"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import ProjectMedia from "./ProjectMedia";
import { PROJECTS, type Project } from "./projects";

/*
 * Every project as a picture and a button, opened from the Projects button
 * in the dock. The details live on each project's own page. The cards sit
 * in lanes of different widths, and each picture takes a shape that suits
 * its subject, so the seams between cards never line up across the page.
 */

/** Each lane's share of the width, left to right, for each lane count. */
const WIDTHS: Record<1 | 2 | 3, number[]> = {
  3: [1.3, 0.8, 1],
  2: [1.2, 1],
  1: [1],
};
/** A card's name strip and button, as a share of a lane's width, for balancing lanes. */
const BUTTON = 0.2;

/**
 * Deals the projects into lanes in order, each into whichever lane is
 * shortest so far, so the lanes end at about the same height.
 */
function arrange(count: 1 | 2 | 3) {
  const widths = WIDTHS[count];
  const heights = widths.map(() => 0);
  const lanes: Project[][] = widths.map(() => []);
  for (const project of PROJECTS) {
    const lane = heights.indexOf(Math.min(...heights));
    lanes[lane].push(project);
    heights[lane] += widths[lane] / project.media.aspect + BUTTON * widths[lane];
  }
  return { widths: widths.map((w) => `${w}fr`).join(" "), lanes };
}

const WIDE = "(min-width: 1100px)";
const MEDIUM = "(min-width: 700px)";

function subscribeToWidth(onChange: () => void) {
  const queries = [matchMedia(WIDE), matchMedia(MEDIUM)];
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () =>
    queries.forEach((query) => query.removeEventListener("change", onChange));
}

function laneCount(): 1 | 2 | 3 {
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
  const count = useSyncExternalStore<1 | 2 | 3>(
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
        <h2 id="gallery-title">Projects</h2>
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
        <h3 className="gallery-card-name">{project.name}</h3>
      </div>
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
