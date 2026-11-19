import type { CSSProperties } from "react";
import type { Project } from "./projects";

/*
 * Each project's picture, shared by the gallery and its own page. Until a
 * real image exists (a board with `src`), a sketch of one stands in on a
 * faint drafting grid, in the shape that suits its subject: a wide
 * screenshot, a tall phone capture, a squarer photo.
 */

/**
 * Smaller copies of the largest pictures, so a phone's narrow card doesn't
 * download the full-size one: each source's copies, by width in pixels.
 */
const SMALLER: Record<string, { src: string; width: number }[]> = {
  "/projects/solitaire.jpg": [{ src: "/projects/solitaire-1200.jpg", width: 1200 }],
  "/projects/desmos.webp": [{ src: "/projects/desmos-800.webp", width: 800 }],
};

/** The full-size widths of the pictures that have smaller copies. */
const FULL_WIDTH: Record<string, number> = {
  "/projects/solitaire.jpg": 2400,
  "/projects/desmos.webp": 1565,
};

/** The project's main picture: its first image, or a sketch of one. */
export default function ProjectMedia({
  project,
  className,
  priority = false,
}: {
  project: Project;
  className?: string;
  /** Load at once, as the main picture of its page; otherwise only once near view. */
  priority?: boolean;
}) {
  const { kind, aspect } = project.media;
  const board = project.boards[project.media.board ?? 0];
  const classes = className ? `gallery-media ${className}` : "gallery-media";

  // A real image sits on the plain well; only the sketches get the grid.
  if (board?.src) {
    return (
      <div
        className={classes}
        data-kind="image"
        style={{ aspectRatio: aspect, "--aspect": aspect } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={board.src}
          srcSet={
            SMALLER[board.src]
              ? [
                  ...SMALLER[board.src].map((copy) => `${copy.src} ${copy.width}w`),
                  `${board.src} ${FULL_WIDTH[board.src]}w`,
                ].join(", ")
              : undefined
          }
          // Only a phone-width window may pick a smaller copy; anything
          // wider asks for the full width, so it always gets the original.
          sizes={SMALLER[board.src] ? `(max-width: 699px) 100vw, ${FULL_WIDTH[board.src]}px` : undefined}
          alt={board.alt}
          className="media-shot"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={classes}
      data-kind={kind}
      style={{ aspectRatio: aspect }}
      role="img"
      aria-label={board?.alt ?? `Placeholder for ${project.name}`}
    >
      {kind === "dash" && (
        <div className="ph-window">
          <div className="ph-bar">
            <i />
            <i />
            <i />
          </div>
          <div className="ph-body">
            <div className="ph-side">
              <b />
              <b />
              <b />
              <b />
            </div>
            <div className="ph-main">
              <b className="ph-title" />
              <div className="ph-tiles">
                <b />
                <b />
                <b />
              </div>
              <b className="ph-chart" />
            </div>
          </div>
        </div>
      )}
      {kind === "portrait" && (
        <div className="ph-phone">
          <b className="ph-notch" />
          <b className="ph-title" />
          <b className="ph-chart" />
          <b />
          <b />
          <b className="ph-short" />
        </div>
      )}
      {kind === "form" && (
        <div className="ph-dialog">
          <b className="ph-title" />
          <b />
          <b />
          <b className="ph-short" />
        </div>
      )}
      {kind === "photo" && (
        <svg className="ph-photo" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="6" y="10" width="36" height="28" rx="3" />
          <circle cx="17" cy="20" r="3.5" />
          <path d="m9 35 10-10 7 7 5-5 8 8" />
        </svg>
      )}
      <span className="ph-caption">{board?.caption ?? project.name}</span>
    </div>
  );
}
