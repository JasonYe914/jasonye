import type { Project } from "./projects";

/*
 * Each project's picture, shared by the gallery and its own page. Until a
 * real image exists (a board with `src`), a sketch of one stands in on a
 * faint drafting grid, in the shape that suits its subject: a wide
 * screenshot, a tall phone capture, a squarer photo.
 */

/** The project's main picture: its first image, or a sketch of one. */
export default function ProjectMedia({
  project,
  className,
}: {
  project: Project;
  className?: string;
}) {
  const { kind, aspect } = project.media;
  const board = project.boards[project.media.board ?? 0];
  const classes = className ? `gallery-media ${className}` : "gallery-media";

  // A real image sits on the plain well; only the sketches get the grid.
  if (board?.src) {
    return (
      <div className={classes} data-kind="image" style={{ aspectRatio: aspect }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={board.src} alt={board.alt} className="media-shot" />
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
