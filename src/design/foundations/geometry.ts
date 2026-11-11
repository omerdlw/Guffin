export const CONTROL = {
  xs: { glyph: 12, height: 24 },
  sm: { glyph: 14, height: 32 },
  chrome: { glyph: 16, height: 36 },
  md: { glyph: 16, height: 40 },
  lg: { glyph: 18, height: 48 },
} as const;

export type ControlSize = keyof typeof CONTROL;

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
