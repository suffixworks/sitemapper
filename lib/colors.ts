// Depth accent colors + the per-node color swatches (from the prototype).

export const DEPTH_COLORS = [
  "#E0A63C", // d0
  "#4C7DB5", // d1
  "#3E9B8E", // d2
  "#B5688A", // d3
  "#7B8B47", // d4
  "#8460C0", // d5
];

export const SWATCHES = [
  "#E0A63C",
  "#4C7DB5",
  "#3E9B8E",
  "#B5688A",
  "#7B8B47",
  "#8460C0",
  "#D9534F",
  "#5A6270",
];

export const EDGE_COLOR = "#B4BECE";
export const EDGE_COLOR_HOT = "#4C46E5"; // --accent

export function depthColor(depth: number): string {
  return DEPTH_COLORS[((depth % DEPTH_COLORS.length) + DEPTH_COLORS.length) % DEPTH_COLORS.length];
}

/** Explicit per-node color wins; otherwise fall back to the depth color. */
export function colorForNode(color: string | null | undefined, depth: number): string {
  return color || depthColor(depth);
}
