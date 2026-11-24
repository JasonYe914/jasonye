import { useId } from "react";
import { blockSvg } from "./blockSvg";

/**
 * A heading set in the name's block letters (blockLetters.ts), as the name
 * and the villages' headings are on the floor, but standing upright.
 *
 * Each part is its own run of letters, so a heading can wrap between parts
 * on a narrow screen. A part is filled with the name's gradient ("name"),
 * which runs across it from left to right as it does across the name, or
 * in the page's ink ("ink"). The letters are 1em tall: set the size with
 * font-size. The words are read out from hidden text.
 */
export type BlockPart = { text: string; fill?: "name" | "ink" };

export default function BlockHeading({ parts }: { parts: BlockPart[] }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const words = parts.map((part) => part.text).join(" ");
  return (
    <>
      <span className="block-heading" aria-hidden="true">
        {parts.map((part, i) => {
          const shape = blockSvg(part.text);
          const pad = 0.1;
          const clip = `${id}-clip-${i}`;
          const ink = `${id}-ink-${i}`;
          return (
            <svg
              key={i}
              className="block-heading-run"
              viewBox={`${-pad} ${-pad} ${shape.width + 2 * pad} ${shape.height + 2 * pad}`}
              style={{ width: `${(shape.width + 2 * pad) / (shape.height + 2 * pad)}em` }}
              focusable="false"
            >
              <defs>
                <clipPath id={clip}>
                  <path d={shape.clip} clipRule="evenodd" />
                </clipPath>
                {part.fill !== "ink" && (
                  <linearGradient id={ink} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={shape.width} y2="0">
                    <stop offset="0" style={{ stopColor: "var(--name-1)" }} />
                    <stop offset="0.333" style={{ stopColor: "var(--name-2)" }} />
                    <stop offset="0.667" style={{ stopColor: "var(--name-3)" }} />
                    <stop offset="1" style={{ stopColor: "var(--name-4)" }} />
                  </linearGradient>
                )}
              </defs>
              <path
                d={shape.solid}
                clipPath={`url(#${clip})`}
                style={{ fill: part.fill === "ink" ? "var(--foreground)" : `url(#${ink})` }}
              />
            </svg>
          );
        })}
      </span>
      <span className="sr-only">{words}</span>
    </>
  );
}
