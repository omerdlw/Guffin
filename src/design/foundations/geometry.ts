/**
 * Geometry: one height ladder for every interactive block, so controls placed
 * side by side share a baseline and a centre line. The CSS mirror is
 * `--spacing-control-*` in src/design/styles/tokens.css (`h-control-md`,
 * `size-control-md`).
 *
 * Each rung fixes the whole box, not only the height: inline padding, the gap
 * between a glyph and its label, the glyph size and the type step all travel
 * together, so a 40px control looks the same wherever it appears.
 *
 * | size   | height | padding | gap | glyph | type    | use                               |
 * | ------ | ------ | ------- | --- | ----- | ------- | --------------------------------- |
 * | xs     | 24     | 10      | 4   | 12    | label   | badges, inline chips              |
 * | sm     | 32     | 14      | 6   | 14    | meta    | compact toolbars, media controls  |
 * | chrome | 36     | 16      | 8   | 16    | control | dock and modal chrome             |
 * | md     | 40     | 16      | 8   | 16    | control | the default: buttons, dock action |
 * | lg     | 48     | 20      | 10  | 18    | body    | hero actions, touch-first rows    |
 */
export const CONTROL = {
  xs: { glyph: 12, height: 24 },
  sm: { glyph: 14, height: 32 },
  chrome: { glyph: 16, height: 36 },
  md: { glyph: 16, height: 40 },
  lg: { glyph: 18, height: 48 },
} as const;

export type ControlSize = keyof typeof CONTROL;

/** Corner radii in px; the CSS mirror is `--radius-*`. */
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

/**
 * The radius of a frame nested inside another, so both corners stay
 * concentric: the outer radius less the padding between them.
 */
export const nested = (outer: number, padding: number) =>
  Math.max(0, outer - padding);
