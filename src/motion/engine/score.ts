import { blend, css, neutral, type Css } from "./look";
import { step, tempo as clampTempo } from "./ladder";
import {
  MATTER,
  arrival,
  departure,
  type Matter,
  type MatterName,
} from "./matter";
import { ENTER, type EnterVerb, type LeaveVerb } from "./verbs";

// A page writes a score: who is on stage, what each part is made of, in what
// order they come in. It never writes a duration; the engine owns time.

export type Casting =
  | MatterName
  | {
      matter: MatterName;
      enter?: EnterVerb;
      leave?: LeaveVerb;
      depth?: number;
      drift?: number;
    };

export type Beat<P extends string> = P | readonly P[] | { rest: number };

export interface ScoreInput<P extends string, S extends string> {
  tempo?: number;
  cast: Record<P, Casting>;
  opening: readonly Beat<NoInfer<P>>[];
  sections?: Record<S, readonly Beat<NoInfer<P>>[]>;
  leave?: LeaveVerb;
}

export interface Role {
  matter: Matter;
  enter: EnterVerb;
  leave: LeaveVerb;
  depth: number;
  drift: number;
  initial: Css;
}

export type Step<P extends string> = { parts: readonly P[] } | { rest: number };

export interface Score<P extends string, S extends string> {
  tempo: number;
  roles: Record<P, Role>;
  opening: readonly Step<P>[];
  sections: Record<S, readonly Step<P>[]>;
}

// The next beat may take the stage two rungs into this one: once the eye has
// found it, not once it has settled.
export const CUE_LEAD = 2;

// Siblings of one part trail across a window one rung shorter than the part.
export const TRAIL_DROP = 1;

export const lead = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - CUE_LEAD);

export const trailWindow = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - TRAIL_DROP);

function cast(casting: Casting, leave: LeaveVerb | undefined): Role {
  const entry = typeof casting === "string" ? { matter: casting } : casting;
  const matter: Matter = MATTER[entry.matter];
  const enter = entry.enter ?? matter.enter;
  return {
    matter,
    enter,
    leave: entry.leave ?? leave ?? matter.leave,
    depth: entry.depth ?? 0,
    drift: entry.drift ?? 0,
    initial: css(blend(neutral(), ENTER[enter](0))),
  };
}

function steps<P extends string>(beats: readonly Beat<P>[]): Step<P>[] {
  return beats.map((beat) =>
    typeof beat === "string"
      ? { parts: [beat] }
      : "rest" in beat
        ? { rest: beat.rest }
        : { parts: [...beat] },
  );
}

export function defineScore<
  const P extends string,
  const S extends string = never,
>(input: ScoreInput<P, S>): Score<P, S> {
  const names = Object.keys(input.cast) as P[];
  const roles = Object.fromEntries(
    names.map((name) => [name, cast(input.cast[name], input.leave)]),
  ) as Record<P, Role>;

  const opening = steps(input.opening);
  const sections = Object.fromEntries(
    Object.entries<readonly Beat<P>[]>(input.sections ?? {}).map(
      ([name, beats]) => [name, steps(beats)],
    ),
  ) as Record<S, Step<P>[]>;

  // A part on stage that no beat calls would wait in the dark forever; it
  // comes in with the last beat of the opening instead.
  const called = new Set<P>();
  for (const sequence of [opening, ...Object.values<Step<P>[]>(sections)])
    for (const item of sequence)
      if ("parts" in item) for (const part of item.parts) called.add(part);
  const uncalled = names.filter((name) => !called.has(name));
  if (uncalled.length > 0) opening.push({ parts: uncalled });

  return { tempo: clampTempo(input.tempo ?? 0), roles, opening, sections };
}

export interface Cue<P extends string> {
  parts: readonly P[];
  at: number;
  length: number;
}

export interface Plan<P extends string> {
  cues: Cue<P>[];
  length: number;
}

// The score on paper: when each beat would start if everything were ready.
export function plan<P extends string, S extends string>(
  score: Score<P, S>,
  sequence: readonly Step<P>[] = score.opening,
  pace = 0,
): Plan<P> {
  const t = score.tempo + pace;
  const cues: Cue<P>[] = [];
  let at = 0;
  let length = 0;
  for (const item of sequence) {
    if ("rest" in item) {
      at += step(item.rest + t);
      continue;
    }
    const roles = item.parts.map((part) => score.roles[part]);
    const run = Math.max(...roles.map((role) => arrival(role.matter, t)));
    cues.push({ parts: item.parts, at, length: run });
    length = Math.max(length, at + run);
    at += Math.max(...roles.map((role) => lead(role, t)));
  }
  return { cues, length };
}

export function leaveLength<P extends string, S extends string>(
  score: Score<P, S>,
  pace = 0,
): number {
  const roles = Object.values<Role>(score.roles);
  if (roles.length === 0) return 0;
  return Math.max(
    ...roles.map((role) => departure(role.matter, score.tempo + pace)),
  );
}
