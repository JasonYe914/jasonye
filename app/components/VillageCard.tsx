"use client";

import { useSyncExternalStore } from "react";
import Emblem from "./Emblem";
import { VILLAGES, villageById } from "./villages";
import { villageStore } from "./villageStore";

/**
 * The card for whatever the chicken is beside, and the full sheet for a
 * village once it is opened with E or a tap.
 */
export default function VillageCard() {
  const { focus, sheet } = useSyncExternalStore(
    villageStore.subscribe,
    villageStore.get,
    villageStore.server,
  );

  const open = sheet ? villageById(sheet) : null;
  if (open) return <Sheet id={open.id} />;

  const village = focus ? villageById(focus.villageId) : null;
  if (!focus || !village) return <div className="sr-only" aria-live="polite" />;

  const title = focus.spot ? focus.spot.title : village.name;
  const text = focus.spot
    ? focus.spot.text
    : focus.onPlaza
      ? village.summary
      : `${village.role} · ${village.dates}`;

  return (
    <div aria-live="polite">
      <button
        type="button"
        className="village-card chrome"
        onClick={() => villageStore.openSheet(village.id)}
      >
        <Emblem id={village.id} color={village.color} size={40} />
        <span className="village-card-body">
          <span className="village-card-title">{title}</span>
          <span className="village-card-text">{text}</span>
        </span>
        <span className="village-card-foot">
          <span>
            {village.short} · {focus.visited} of {focus.total} visited
          </span>
          <span>
            <kbd>E</kbd> details
          </span>
        </span>
      </button>
    </div>
  );
}

function Sheet({ id }: { id: string }) {
  const village = villageById(id);
  if (!village) return null;
  return (
    <aside className="village-sheet chrome" aria-label={`${village.name} details`}>
      <header className="village-sheet-head">
        <Emblem id={village.id} color={village.color} size={48} />
        <div>
          <h2>{village.name}</h2>
          <p>{village.role}</p>
          <p className="village-sheet-meta">
            {village.dates} · {village.place}
          </p>
        </div>
        <button
          type="button"
          className="village-sheet-close"
          onClick={() => villageStore.closeSheet()}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <p className="village-sheet-summary">{village.summary}</p>

      {village.metrics.length > 0 && (
        <dl className="village-sheet-numbers">
          {village.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {village.boards.map((board) =>
        board.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={board.caption} src={board.src} alt={board.alt} className="village-sheet-media" />
        ) : (
          <div key={board.caption} className="village-sheet-media is-empty">
            <span>{board.caption}</span>
            <small>{board.detail}</small>
          </div>
        ),
      )}

      {village.points.length > 0 && (
        <ul className="village-sheet-points">
          {village.points.map((point) => (
            <li key={point.label}>{point.text}</li>
          ))}
        </ul>
      )}

      {village.tools.length > 0 && (
        <ul className="village-sheet-tools" aria-label="Built with">
          {village.tools.map((tool) => (
            <li key={tool.name} data-core={tool.core ? "" : undefined}>
              {tool.name}
            </li>
          ))}
        </ul>
      )}

      {village.links && village.links.length > 0 && (
        <p className="village-sheet-links">
          {village.links.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </p>
      )}

      <p className="village-sheet-hint">
        <kbd>Esc</kbd> or any movement key to close
      </p>
    </aside>
  );
}

/** Every village as plain text, for screen readers and search engines. */
export function VillageIndex() {
  return (
    <div className="sr-only">
      <h2>Experience and projects</h2>
      {VILLAGES.map((village) => (
        <article key={village.id}>
          <h3>{village.name}</h3>
          <p>
            {village.role}, {village.dates}, {village.place}
          </p>
          <p>{village.summary}</p>
          <ul>
            {village.metrics.map((metric) => (
              <li key={metric.label}>{metric.detail}</li>
            ))}
            {village.points.map((point) => (
              <li key={point.label}>{point.text}</li>
            ))}
          </ul>
          {village.tools.length > 0 && (
            <p>Built with {village.tools.map((tool) => tool.name).join(", ")}.</p>
          )}
        </article>
      ))}
    </div>
  );
}
