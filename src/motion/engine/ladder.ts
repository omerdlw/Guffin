// The one time scale. Every duration, gap and spring period in the engine is a
// rung on this ladder; a page moves along it with its tempo, never off it.

export const PHI = (1 + Math.sqrt(5)) / 2;
export const BEAT = 0.5;
export const TRAVEL = 24;
export const TEMPO_RANGE = 3;

export const step = (rung: number) => BEAT * PHI ** rung;

// Softness is on the ladder too: `haze(n) = φⁿ` px of blur. The most any part
// is allowed to be out of focus at once is HAZE_CAP, however many forces add
// up, so depth stays a look and never becomes a cost.
export const haze = (rung: number) => PHI ** rung;
export const HAZE_CAP = haze(6);

export const rungOf = (seconds: number) =>
  Math.log(seconds / BEAT) / Math.log(PHI);

export const reach = (rung: number) => TRAVEL * PHI ** rung;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const tempo = (value: number) => clamp(value, -TEMPO_RANGE, TEMPO_RANGE);

// Each gap is φ⁻¹ of the one before, so any number of siblings lands inside
// the window: 0, 0.382w, 0.618w, 0.764w … → w.
export const trail = (index: number, window: number) =>
  index <= 0 ? 0 : window * (1 - PHI ** -index);
