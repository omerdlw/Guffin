export const RADIUS = {
  mark: 3,
  thumb: 8,
  inset: 10,
  tile: 12,
  card: 16,
  panel: 20,
  sheet: 24,
  shell: 26,
} as const;

export const nested = (outer: number, padding: number) =>
  Math.max(0, outer - padding);
