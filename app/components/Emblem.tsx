import type { SceneId } from "./villages";

/*
 * Each village's emblem: an original mark on a rounded square in the
 * village's colour. Drawn on a 64-unit grid.
 */

const STROKE = {
  fill: "none",
  stroke: "#fff",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Glyph({ id, color }: { id: SceneId; color: string }) {
  switch (id) {
    case "queens":
      return (
        <>
          <g transform="translate(32 32)" fill="#fff">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <rect
                key={angle}
                x="-3.5"
                y="-20"
                width="7"
                height="8"
                rx="1.5"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle r="14" />
          </g>
          <circle cx="32" cy="32" r="5.5" fill={color} />
        </>
      );
    case "playtoon":
      return (
        <>
          <g {...STROKE} strokeWidth="3.2">
            <path d="M32 27c-5-3-11-4-18-3v22c7-1 13 0 18 3 5-3 11-4 18-3V24c-7-1-13 0-18 3z" />
            <path d="M32 27v22" />
          </g>
          <circle cx="47" cy="15" r="7.5" fill="#fff" />
          <path d="M43.6 15.2l2.4 2.4 4.4-4.8" {...STROKE} stroke={color} strokeWidth="2.4" />
        </>
      );
    case "qadt":
      return (
        <>
          <g {...STROKE}>
            <path d="M23 23l18 18M41 23L23 41" strokeWidth="3.2" />
            <circle cx="19" cy="19" r="7" strokeWidth="2.6" />
            <circle cx="45" cy="19" r="7" strokeWidth="2.6" />
            <circle cx="19" cy="45" r="7" strokeWidth="2.6" />
            <circle cx="45" cy="45" r="7" strokeWidth="2.6" />
          </g>
          <rect x="25.5" y="25.5" width="13" height="13" rx="3.5" fill="#fff" />
        </>
      );
    case "getinto":
      return (
        <>
          <path
            d="M10 32c6-9 13.5-13 22-13s16 4 22 13c-6 9-13.5 13-22 13s-16-4-22-13z"
            {...STROKE}
            strokeWidth="3.2"
          />
          <circle cx="32" cy="32" r="8" fill="#fff" />
          <path d="M28.5 30.5v3M32 28v8M35.5 30.5v3" {...STROKE} stroke={color} strokeWidth="2" />
        </>
      );
    case "wayfinder":
      return (
        <>
          <path d="M16 46L28 32L40 44M28 32L44 25" {...STROKE} strokeWidth="3" />
          <path d="M44 31V11" {...STROKE} strokeWidth="3" />
          <path d="M44 11h11l-3 4.5 3 4.5H44z" fill="#fff" />
          <circle cx="16" cy="46" r="5" fill="#fff" />
          <circle cx="28" cy="32" r="5" fill="#fff" />
          <circle cx="40" cy="44" r="4.5" fill={color} stroke="#fff" strokeWidth="2.6" />
        </>
      );
    case "gofleet":
      return (
        <>
          <g {...STROKE} strokeWidth="3">
            <rect x="9" y="21" width="27" height="19" rx="2.5" />
            <path d="M36 27h9l6 7v6H36z" />
            <path d="M16.5 30.5l4 4 8-8" />
          </g>
          <circle cx="18" cy="43.5" r="4.2" fill="#fff" />
          <circle cx="43" cy="43.5" r="4.2" fill="#fff" />
        </>
      );
    case "zendu":
      return (
        <>
          <circle
            cx="32"
            cy="36"
            r="20"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeDasharray="3.5 4"
            opacity=".75"
          />
          <circle cx="32" cy="36" r="11" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".9" />
          <path
            d="M32 13c5.5 0 9.5 4 9.5 9.2 0 6.8-9.5 16.8-9.5 16.8s-9.5-10-9.5-16.8C22.5 17 26.5 13 32 13z"
            fill="#fff"
          />
          <circle cx="32" cy="22.5" r="3.4" fill={color} />
        </>
      );
    case "bankview":
      return (
        <g {...STROKE} strokeWidth="3">
          <circle cx="32" cy="32" r="19" />
          <circle cx="32" cy="32" r="6" />
          <path d="M32 26v-8M32 38v8M26 32h-8M38 32h8" />
        </g>
      );
  }
}

export default function Emblem({
  id,
  color,
  size = 40,
  className,
}: {
  id: SceneId;
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" fill={color} />
      <Glyph id={id} color={color} />
    </svg>
  );
}
