// One pace for every page stage. TEMPO scales every enter (duration, delay,
// stagger, cue cadence); OPENING is how long view-gated roles wait for the
// hero's load timeline (unscaled seconds, ×TEMPO at runtime). Every hero's
// last load part starts at HERO, so all openings finish together.
export const TEMPO = 1.5;
export const HERO = 0.618;
export const OPENING = HERO + 0.236;
