/**
 * Shortest walks over the floor grid by Dijkstra's algorithm. Pure, so it can
 * be checked on its own.
 */

/** A tile, by grid position. */
export type Cell = { col: number; row: number };

/** The tiles a search may use: columns c0 to c1 - 1, rows r0 to r1 - 1. */
export type GridBounds = { c0: number; c1: number; r0: number; r1: number };

/** Searches over more tiles than this are refused. */
export const MAX_CELLS = 250_000;

/** The four steps a walker may take, one tile along an axis. */
const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Finds the cheapest walk from start to goal over open tiles, or null when
 * there is none. The result excludes the start tile and includes the goal.
 */
export function shortestPath(
  start: Cell,
  goal: Cell,
  bounds: GridBounds,
  blocked: (col: number, row: number) => boolean,
  cost: (col: number, row: number) => number = () => 1,
): Cell[] | null {
  const { c0, c1, r0, r1 } = bounds;
  const width = c1 - c0;
  const height = r1 - r0;
  if (width <= 0 || height <= 0 || width * height > MAX_CELLS) return null;
  const inside = (c: Cell) =>
    c.col >= c0 && c.col < c1 && c.row >= r0 && c.row < r1;
  if (!inside(start) || !inside(goal)) return null;
  if (start.col === goal.col && start.row === goal.row) return [];
  if (blocked(goal.col, goal.row)) return null;

  const n = width * height;
  const index = (col: number, row: number) => (row - r0) * width + (col - c0);
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const solid = new Int8Array(n);

  const costs: number[] = [];
  const cells: number[] = [];
  /** Adds a cell to the min-heap, sifting it up into place. */
  const push = (c: number, cell: number) => {
    let i = costs.length;
    costs.push(c);
    cells.push(cell);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (costs[parent] <= costs[i]) break;
      [costs[parent], costs[i]] = [costs[i], costs[parent]];
      [cells[parent], cells[i]] = [cells[i], cells[parent]];
      i = parent;
    }
  };
  /** Removes the cheapest cell from the min-heap and returns it. */
  const pop = (): number => {
    const top = cells[0];
    const lastCost = costs.pop() as number;
    const lastCell = cells.pop() as number;
    const size = costs.length;
    if (size > 0) {
      costs[0] = lastCost;
      cells[0] = lastCell;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < size && costs[l] < costs[m]) m = l;
        if (r < size && costs[r] < costs[m]) m = r;
        if (m === i) break;
        [costs[m], costs[i]] = [costs[i], costs[m]];
        [cells[m], cells[i]] = [cells[i], cells[m]];
        i = m;
      }
    }
    return top;
  };

  const s = index(start.col, start.row);
  const g = index(goal.col, goal.row);
  dist[s] = 0;
  push(0, s);
  while (cells.length > 0) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === g) break;
    const col = (u % width) + c0;
    const row = Math.floor(u / width) + r0;
    for (const [dc, dr] of STEPS) {
      const nc = col + dc;
      const nr = row + dr;
      if (nc < c0 || nc >= c1 || nr < r0 || nr >= r1) continue;
      const v = index(nc, nr);
      if (done[v]) continue;
      if (solid[v] === 0) solid[v] = blocked(nc, nr) ? 2 : 1;
      if (solid[v] === 2) continue;
      const next = dist[u] + cost(nc, nr);
      if (next < dist[v]) {
        dist[v] = next;
        prev[v] = u;
        push(next, v);
      }
    }
  }
  if (dist[g] === Infinity) return null;

  const path: Cell[] = [];
  for (let at = g; at !== s; at = prev[at]) {
    path.push({ col: (at % width) + c0, row: Math.floor(at / width) + r0 });
  }
  return path.reverse();
}
