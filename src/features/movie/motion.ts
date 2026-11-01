import { GRAMMAR, landed, size } from "@/motion/stage";

const TITLE = GRAMMAR.opening.base;
const RULE = TITLE + size(1);
const TAGLINE = RULE + size(0);
const OVERVIEW = TAGLINE + size(-1);
const OVERVIEW_WINDOW = size(1);
const OVERVIEW_SWEEP = size(-2);
const OVERVIEW_LANDED = OVERVIEW + OVERVIEW_WINDOW + OVERVIEW_SWEEP + landed(2);

export const SCENE = {
  ...GRAMMAR,
  rule: { at: RULE, run: size(4) },
  tagline: { at: TAGLINE, cap: size(-1), run: size(2), window: size(1) },
  overview: {
    at: OVERVIEW,
    by: "line",
    cap: size(-1),
    run: size(2),
    sweep: OVERVIEW_SWEEP,
    window: OVERVIEW_WINDOW,
  },
  buttons: { at: RULE },
  card: { name: size(0), photo: size(-1), role: size(0) + size(-2) },
  action: { content: size(-1), run: size(2) },
  row: { line: size(2), value: size(0) },
  opening: {
    base: TITLE,
    end: OVERVIEW_LANDED,
    length: OVERVIEW_LANDED - TITLE + size(1),
  },
  stars: { at: size(0), gap: size(-2), run: size(1) },
  layers: { ...GRAMMAR.layers, overview: GRAMMAR.layers.prose },
} as const;
