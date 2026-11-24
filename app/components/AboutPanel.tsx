"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import BlockHeading from "./BlockHeading";
import { PROJECTS } from "./projects";
import { travelTo } from "./villageStore";
import { VILLAGES, type Village } from "./villages";
import { EMAIL_HREF, GITHUB, LINKEDIN } from "./contact";

/*
 * About: a page over the world, opened from the dock. Words only: a hello,
 * a few numbers, what I work on, the path so far, the tools, and how to
 * get in touch. Everything countable is counted from the villages and the
 * projects, so the page stays in step with the rest of the site.
 */

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

/** Every village, newest first. */
const PATH = [...VILLAGES].sort((a, b) => {
  const x = startOf(a.dates);
  const y = startOf(b.dates);
  return x === y ? 0 : y > x ? 1 : -1;
});

const KIND_LABEL: Record<Village["kind"], string> = {
  Education: "Education",
  Experience: "Internship",
  Team: "Design team",
  Project: "Project",
};

const ofKind = (kind: Village["kind"]) => VILLAGES.filter((v) => v.kind === kind);
const NOW = ofKind("Experience").filter((v) => v.dates.includes("Present"));
const QUEENS = VILLAGES.find((v) => v.id === "queens");

const NUMBERS = [
  { value: ofKind("Experience").length, label: "Internships" },
  { value: PROJECTS.length, label: "Projects" },
  { value: ofKind("Team").length, label: "Design team" },
  { value: QUEENS ? yearOf(QUEENS.dates) : "2024", label: "At Queen's since" },
];

/** What I work on: one card each. */
const AREAS = [
  {
    title: "Full-stack web apps",
    text: "React and Next.js up front, Express, Flask and Postgres behind. Autosave and publishing APIs at Playtoon, a driver qualification platform at GoFleet.",
  },
  {
    title: "Drones that fly themselves",
    text: "Python drone-control scripts on ROS2 and PX4 with the Queen's Aerospace Design Team.",
  },
  {
    title: "AI and machine learning",
    text: "Neural networks written from scratch in Java and NumPy, and apps built on Gemini, like Wayfinder and Get-Into.Tech.",
  },
  {
    title: "CAD and mechanical design",
    text: "Where the degree started: modelling parts and assemblies, like a V8 engine block with its crankshaft and pistons.",
  },
];

/** Every tool used anywhere, most used first. */
const TOOLBOX = (() => {
  const counts = new Map<string, number>();
  const add = (name: string) => counts.set(name, (counts.get(name) ?? 0) + 1);
  VILLAGES.forEach((v) => v.tools.forEach((t) => add(t.name)));
  PROJECTS.filter((p) => !p.village).forEach((p) => p.tools.forEach((t) => add(t.name)));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
})();

/**
 * Each tool's badge colour, after its brand: [background, text]. Anything
 * not listed gets a neutral slate.
 */
const BRAND: Record<string, [string, string]> = {
  React: ["#20232a", "#61dafb"],
  Java: ["#ed8b00", "#ffffff"],
  Python: ["#3776ab", "#ffffff"],
  TypeScript: ["#3178c6", "#ffffff"],
  JavaScript: ["#f7df1e", "#000000"],
  Flask: ["#000000", "#ffffff"],
  "Gemini API": ["#8e75b2", "#ffffff"],
  "Next.js": ["#000000", "#ffffff"],
  Appwrite: ["#fd366e", "#ffffff"],
  AssemblyAI: ["#2545d3", "#ffffff"],
  Docker: ["#2496ed", "#ffffff"],
  Dwolla: ["#f5a623", "#000000"],
  ElevenLabs: ["#000000", "#ffffff"],
  Express: ["#404d59", "#ffffff"],
  Git: ["#f05032", "#ffffff"],
  Leaflet: ["#199900", "#ffffff"],
  NumPy: ["#013243", "#ffffff"],
  OpenCV: ["#5c3ee8", "#ffffff"],
  PostgreSQL: ["#4169e1", "#ffffff"],
  PX4: ["#2c3e50", "#ffffff"],
  Redis: ["#dc382d", "#ffffff"],
  "Redux Toolkit": ["#764abc", "#ffffff"],
  ROS2: ["#22314e", "#ffffff"],
  shadcn: ["#000000", "#ffffff"],
  Supabase: ["#3ecf8e", "#000000"],
};

function badgeStyle(name: string) {
  const [bg, fg] = BRAND[name] ?? ["#475569", "#ffffff"];
  return { "--badge-bg": bg, "--badge-fg": fg } as CSSProperties;
}

/**
 * A gradient that follows the pointer. On entering, the gradient points
 * away from the side the pointer came in from; while it moves, the colours
 * slide along with it and a soft light sits under it. Written straight to
 * the element's CSS variables, so nothing re-renders.
 */
function where(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  return {
    el: event.currentTarget,
    x: ((event.clientX - box.left) / box.width) * 100,
    y: ((event.clientY - box.top) / box.height) * 100,
  };
}

const GLOW = {
  onPointerEnter(event: PointerEvent<HTMLElement>) {
    const { el, x, y } = where(event);
    // From the entry point towards the middle, as a CSS angle (0deg = up).
    const angle = (Math.atan2(50 - y, 50 - x) * 180) / Math.PI + 90;
    el.style.setProperty("--glow-angle", `${angle}deg`);
    el.style.setProperty("--glow-x", `${x}%`);
    el.style.setProperty("--glow-y", `${y}%`);
  },
  onPointerMove(event: PointerEvent<HTMLElement>) {
    const { el, x, y } = where(event);
    el.style.setProperty("--glow-x", `${x}%`);
    el.style.setProperty("--glow-y", `${y}%`);
  },
};

const LINKS = [
  { label: "Email", href: EMAIL_HREF },
  { label: "LinkedIn", href: LINKEDIN },
  { label: "GitHub", href: GITHUB },
];

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
        {/* Hello */}
        <header className="about-hero">
          {/* The links sit under the name, exactly as wide as it. */}
          <div className="about-namecard">
            <h2 id="about-title" className="about-title">
              <BlockHeading parts={[{ text: "Hi, I'm", fill: "ink" }, { text: "Jason." }]} />
            </h2>
            <div className="about-links">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  {...GLOW}
                  className="glow"
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  {link.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 17 17 7M8 7h9v9" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
          <p className="about-lead">
            A Mechanical Engineering student at Queen&apos;s who ended up writing more code
            than CAD. I like building things people actually use, from drone scripts to
            web apps.
          </p>
          {NOW.length > 0 && (
            <p className="about-now">
              <span className="about-now-dot" aria-hidden="true" />
              Right now: {NOW.map((v) => v.role.replace(/ Intern$/, " intern") + " at " + v.name.replace(/ Corporation$/, "")).join(" and ")}
              , {NOW[0].place}.
            </p>
          )}
        </header>

        {/* Numbers */}
        <dl className="about-numbers">
          {NUMBERS.map((n) => (
            <div key={n.label}>
              <dt>{n.label}</dt>
              <dd>{n.value}</dd>
            </div>
          ))}
        </dl>

        <div className="about-split">
          {/* The path */}
          <section className="about-block" aria-labelledby="about-path">
            <h3 id="about-path" className="about-label">
              The path so far
            </h3>
            <ol className="about-path">
              {PATH.map((village) => (
                <li key={village.id} style={{ "--dot": village.color } as CSSProperties}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      travelTo(village.id);
                    }}
                    aria-label={`${village.name}, ${KIND_LABEL[village.kind]}, ${village.dates}. Go there in the world.`}
                  >
                    <span className="about-path-when">
                      {yearOf(village.dates)} · {KIND_LABEL[village.kind]}
                    </span>
                    <strong>{village.name}</strong>
                    <span className="about-path-role">{village.role}</span>
                    <span className="about-path-go" aria-hidden="true">
                      Visit
                      <svg viewBox="0 0 24 24">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <div className="about-side">
            {/* Tools */}
            <section className="about-block" aria-labelledby="about-tools">
              <h3 id="about-tools" className="about-label">
                Toolbox
              </h3>
              <ul className="about-tools">
                {TOOLBOX.map((tool) => (
                  <li key={tool.name} style={badgeStyle(tool.name)}>
                    {tool.name}
                  </li>
                ))}
              </ul>
            </section>

            {/* What I work on */}
            <section className="about-block" aria-labelledby="about-areas">
              <h3 id="about-areas" className="about-label">
                What I work on
              </h3>
              <ul className="about-areas">
                {AREAS.map((area) => (
                  <li key={area.title} {...GLOW} className="glow">
                    <h4>{area.title}</h4>
                    <p>{area.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </article>
    </section>
  );
}
