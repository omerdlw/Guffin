export const RADIUS = {
  mark: 3,
  thumb: 10,
  inset: 12,
  tile: 14,
  card: 18,
  panel: 24,
  sheet: 28,
  shell: 32,
} as const;

export const nested = (outer: number, padding: number) =>
  Math.max(0, outer - padding);
