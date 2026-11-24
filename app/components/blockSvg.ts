import { GLYPH_H, addBlockText, blockTextWidth, type PathSink } from "./blockLetters";

/*
 * The block letters as SVG path data, for headings set in the page rather
 * than painted on the world's canvas. The letters draw through the same
 * calls as on the canvas; this records them as path commands.
 */

const n = (v: number) => +v.toFixed(4);

class SvgPath implements PathSink {
  d = "";
  private open = false;

  moveTo(x: number, y: number) {
    this.d += `M${n(x)} ${n(y)}`;
    this.open = true;
  }
  lineTo(x: number, y: number) {
    this.d += `L${n(x)} ${n(y)}`;
    this.open = true;
  }
  closePath() {
    this.d += "Z";
  }
  /** Clockwise, as the letters use it: a line to its start, then the arc. */
  arc(cx: number, cy: number, r: number, start: number, end: number) {
    const sweep = Math.min(end - start, 2 * Math.PI);
    const at = (a: number) => `${n(cx + r * Math.cos(a))} ${n(cy + r * Math.sin(a))}`;
    this.d += `${this.open ? "L" : "M"}${at(start)}`;
    this.open = true;
    // SVG can't draw a whole turn in one arc, so it goes in halves or less.
    const steps = Math.ceil(sweep / Math.PI - 1e-9) || 1;
    for (let i = 1; i <= steps; i++) {
      this.d += `A${n(r)} ${n(r)} 0 0 1 ${at(start + (sweep * i) / steps)}`;
    }
  }
  rect(x: number, y: number, w: number, h: number) {
    this.d += `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`;
    this.open = false;
  }
  /** Radii as the canvas reads them, shrunk together when they don't fit. */
  roundRect(x: number, y: number, w: number, h: number, radii: number | number[] = 0) {
    const r = typeof radii === "number" ? [radii] : radii;
    let [tl, tr, br, bl] =
      r.length === 1 ? [r[0], r[0], r[0], r[0]]
      : r.length === 2 ? [r[0], r[1], r[0], r[1]]
      : r.length === 3 ? [r[0], r[1], r[2], r[1]]
      : [r[0], r[1], r[2], r[3]];
    const scale = Math.min(1, w / (tl + tr || 1), w / (bl + br || 1), h / (tl + bl || 1), h / (tr + br || 1));
    [tl, tr, br, bl] = [tl, tr, br, bl].map((v) => v * scale);
    const corner = (rad: number, ex: number, ey: number) =>
      rad > 0 ? `A${n(rad)} ${n(rad)} 0 0 1 ${n(ex)} ${n(ey)}` : `L${n(ex)} ${n(ey)}`;
    this.d +=
      `M${n(x + tl)} ${n(y)}L${n(x + w - tr)} ${n(y)}` +
      corner(tr, x + w, y + tr) +
      `L${n(x + w)} ${n(y + h - br)}` +
      corner(br, x + w - br, y + h) +
      `L${n(x + bl)} ${n(y + h)}` +
      corner(bl, x, y + h - bl) +
      `L${n(x)} ${n(y + tl)}` +
      corner(tl, x + tl, y) +
      "Z";
    this.open = false;
  }
}

export type BlockSvg = {
  /** The letters, filled with the nonzero rule. */
  solid: string;
  /** A frame round the line less the cuts, for an even-odd clip. */
  clip: string;
  /** Width and height, in letter units (a letter is GLYPH_H tall). */
  width: number;
  height: number;
};

const built = new Map<string, BlockSvg>();

/** `text` on one line in the block letters, its top-left corner at (0, 0). */
export function blockSvg(text: string): BlockSvg {
  let shape = built.get(text);
  if (!shape) {
    const solid = new SvgPath();
    const cuts = new SvgPath();
    const width = blockTextWidth(text);
    cuts.rect(-1, -1, width + 2, GLYPH_H + 2);
    addBlockText(solid, cuts, text, 0, 0);
    shape = { solid: solid.d, clip: cuts.d, width, height: GLYPH_H };
    built.set(text, shape);
  }
  return shape;
}
