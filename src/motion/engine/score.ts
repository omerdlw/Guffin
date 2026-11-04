import { blend, css, neutral, type Css } from "./look";
import { step, tempo as clampTempo, trail } from "./ladder";
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
      // How the copies of this part follow each other (see `Cadence`).
      cadence?: Cadence;
    };

// A rest may be taken only while a part is on stage (`with`): the pause that
// belongs to a title card is not paid by a page that has none.
export type Beat<P extends string> =
  P | readonly P[] | { rest: number; with?: P };

export interface ScoreInput<P extends string, S extends string> {
  tempo?: number;
  cast: Record<P, Casting>;
  opening: readonly Beat<NoInfer<P>>[];
  sections?: Record<S, readonly Beat<NoInfer<P>>[]>;
  leave?: LeaveVerb;
  // A page of sections laid side by side as well as down the page: those
  // reached together are taken in the order they lie, top to bottom.
  ordered?: boolean;
}

export interface Role {
  matter: Matter;
  enter: EnterVerb;
  leave: LeaveVerb;
  depth: number;
  drift: number;
  cadence: Cadence;
  initial: Css;
}

export type Step<P extends string> =
  { parts: readonly P[] } | { rest: number; with?: P };

export interface Score<P extends string, S extends string> {
  tempo: number;
  roles: Record<P, Role>;
  opening: readonly Step<P>[];
  sections: Record<S, readonly Step<P>[]>;
  ordered: boolean;
}

// The next beat may take the stage three rungs into this one: once the eye has
// found it, not once it has settled. Parts arrive one rung slower than they
// once did and the lead is one rung longer, so the beats start exactly when
// they always did and each overlaps the one before it by more.
export const CUE_LEAD = 3;

// Siblings of one part trail across a window one rung shorter than the part.
export const TRAIL_DROP = 1;

export const lead = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - CUE_LEAD);

export const trailWindow = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - TRAIL_DROP);

// How the copies of one part follow each other.
//   trail: each gap is φ⁻¹ of the one before (rows, cards): the last ones
//          bunch together so a long list still fits its window.
//   even:  the same gap between every copy (words, letters, lines): text is
//          read in order, so it is paced like speech, never bunched. The gap
//          is the window divided by the count, and never more than a
//          part of the matter's own, five rungs down.
//   stairs: one step after another, top to bottom (a column of rows, a stack
//          of buttons): the gap is the same between every copy, up to four
//          rungs down, and the whole flight never takes longer than one
//          arrival, so the last step is being taken as the first one lands.
export type Cadence = "trail" | "even" | "stairs";

export const STAIRS_DROP = 4;

export const EVEN_DROP = 5;

export function spacing(
  role: Role,
  tempo: number,
  rank: number,
  count: number,
  cadence: Cadence,
) {
  const window = trailWindow(role, tempo);
  if (cadence === "trail") return trail(rank, window);
  if (count <= 1) return 0;
  if (cadence === "stairs")
    return (
      rank *
      Math.min(
        step(role.matter.rung + tempo - STAIRS_DROP),
        arrival(role.matter, tempo) / (count - 1),
      )
    );
  const gap = Math.min(
    window / (count - 1),
    step(role.matter.rung + tempo - EVEN_DROP),
  );
  return rank * gap;
}

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
    cadence: entry.cadence ?? "trail",
    initial: css(blend(neutral(), ENTER[enter](0))),
  };
}

function steps<P extends string>(beats: readonly Beat<P>[]): Step<P>[] {
  return beats.map((beat) =>
    typeof beat === "string"
      ? { parts: [beat] }
      : "rest" in beat
        ? { rest: beat.rest, with: beat.with }
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

  return {
    tempo: clampTempo(input.tempo ?? 0),
    roles,
    opening,
    sections,
    ordered: input.ordered ?? false,
  };
}

export interface Cue<P extends string> {
  parts: readonly P[];
  at: number;
  length: number;
}

export interface Plan<P extends string> {
  cues: Cue<P>[];
  // When the last part has landed, from the start of the sequence.
  length: number;
  // When the next sequence may begin: the lead of the last beat.
  after: number;
}

// The score on paper: when each beat would start if everything were ready.
// `staged` says which parts are on stage; a rest that waits on a part which is
// not there is not taken. Left out, every part is taken to be.
export function plan<P extends string, S extends string>(
  score: Score<P, S>,
  sequence: readonly Step<P>[] = score.opening,
  pace = 0,
  staged: (part: P) => boolean = () => true,
): Plan<P> {
  const t = score.tempo + pace;
  const cues: Cue<P>[] = [];
  let at = 0;
  let length = 0;
  for (const item of sequence) {
    if ("rest" in item) {
      if (item.with === undefined || staged(item.with))
        at += step(item.rest + t);
      continue;
    }
    const roles = item.parts.map((part) => score.roles[part]);
    const run = Math.max(...roles.map((role) => arrival(role.matter, t)));
    cues.push({ parts: item.parts, at, length: run });
    length = Math.max(length, at + run);
    at += Math.max(...roles.map((role) => lead(role, t)));
  }
  return { cues, length, after: at };
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
