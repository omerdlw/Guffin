export const PHI = (1 + Math.sqrt(5)) / 2;

export const round = (value: number) => Math.round(value * 1000) / 1000;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const within = (
  progress: number,
  [from, to]: readonly [number, number],
) => clamp((progress - from) / (to - from), 0, 1);
