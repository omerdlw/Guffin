import { POINTS, cubic, type CurveName } from "./curve";
import { PHI, haze, step } from "./ladder";
import {
  MATTER,
  arrival,
  departure,
  response,
  type MatterName,
} from "./matter";

// The ladder as CSS, so a hover written in a stylesheet keeps the same time as
// the engine. Every duration is multiplied by --tempo, which a stage sets to
// φ^tempo on its subtree: a slow page's CSS is slow too. A custom property is
// resolved where it is declared, so the tokens are declared again on every
// stage's root ([data-tempo]) to pick up its tempo.

export const RUNGS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

// Blur as a rung too: --haze-n1 (0.6px) … --haze-6 (17.9px).
const HAZE_RUNGS = [-1, 0, 1, 2, 3, 4, 5, 6] as const;

const rungName = (rung: number) => (rung < 0 ? `n${-rung}` : String(rung));

const ms = (seconds: number) =>
  `calc(${Math.round(seconds * 1000)}ms * var(--tempo, 1))`;

export const tempoScale = (tempo: number) => PHI ** tempo;

export function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rung of RUNGS) out[`--step-${rungName(rung)}`] = ms(step(rung));
  for (const rung of HAZE_RUNGS)
    out[`--haze-${rungName(rung)}`] = `${haze(rung).toFixed(2)}px`;
  for (const name of Object.keys(MATTER) as MatterName[]) {
    const matter = MATTER[name];
    out[`--arrive-${name}`] = ms(arrival(matter, 0));
    out[`--leave-${name}`] = ms(departure(matter, 0));
    out[`--touch-${name}`] = ms(response(matter, 0).period);
    out[`--curve-${name}`] = cubic(matter.curve);
  }
  for (const name of Object.keys(POINTS) as CurveName[])
    out[`--curve-${name}`] = cubic(name);
  return out;
}

export const tokenSheet = () =>
  `:root,[data-tempo]{${Object.entries(tokens())
    .map(([key, value]) => `${key}:${value}`)
    .join(";")}}`;
