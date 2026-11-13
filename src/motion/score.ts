import { blend, css, type Css, neutral } from "./color";
import { PHI } from "./math";
import {
  arrival,
  departure,
  ENTER,
  type EnterVerb,
  type LeaveVerb,
  MATTER,
  type Matter,
  type MatterName,
  step,
  tempo as clampTempo,
} from "./time";

export type Cadence = "trail" | "even" | "stairs" | "lines";

type Casting =
  | MatterName
  | {
      matter: MatterName;
      enter?: EnterVerb;
      leave?: LeaveVerb;
      depth?: number;
      drift?: number;
      cadence?: Cadence;
      beat?: number;
    };

type Beat<P extends string> = P | readonly P[] | { rest: number; with?: P };

interface Release {
  release: true;
}

interface ScoreInput<P extends string, S extends string> {
  margin?: string;
  tempo?: number;
  cast: Record<P, Casting>;
  opening: readonly (Beat<NoInfer<P>> | Release)[];
  sections?: Record<S, readonly Beat<NoInfer<P>>[]>;
  leave?: LeaveVerb;
  ordered?: boolean;
  tight?: boolean;
}

export interface Role {
  matter: Matter;
  enter: EnterVerb;
  leave: LeaveVerb;
  depth: number;
  drift: number;
  cadence: Cadence;
  beat: number;
  initial: Css;
}

export type Step<P extends string> =
  { parts: readonly P[] } | { rest: number; with?: P };

type OpeningStep<P extends string> = Step<P> | Release;

export interface Score<P extends string, S extends string> {
  margin: string | undefined;
  tempo: number;
  roles: Record<P, Role>;
  opening: readonly OpeningStep<P>[];
  sections: Record<S, readonly Step<P>[]>;
  ordered: boolean;
  tight: boolean;
}

interface Cue<P extends string> {
  parts: readonly P[];
  at: number;
  length: number;
}

export interface Plan<P extends string> {
  cues: Cue<P>[];
  length: number;
  after: number;
}

const CUE_LEAD = 3;

const TRAIL_DROP = 1;

const STAIRS_DROP = 4;

const EVEN_DROP = 5;

const LINES_RUNG = -1.5;

const trailWindow = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - TRAIL_DROP);

function steps<P extends string>(beats: readonly Beat<P>[]): Step<P>[];

function steps<P extends string>(
  beats: readonly (Beat<P> | Release)[],
): OpeningStep<P>[];

function steps<P extends string>(
  beats: readonly (Beat<P> | Release)[],
): OpeningStep<P>[] {
  return beats.map((beat) =>
    typeof beat === "string"
      ? { parts: [beat] }
      : "release" in beat
        ? { release: true }
        : "rest" in beat
          ? { rest: beat.rest, with: beat.with }
          : { parts: [...beat] },
  );
}

const trail = (index: number, window: number) =>
  index <= 0 ? 0 : window * (1 - PHI ** -index);

export const lead = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - CUE_LEAD);

export function spacing(
  role: Role,
  tempo: number,
  rank: number,
  count: number,
  cadence: Cadence,
  index = rank,
) {
  if (cadence === "lines") return Math.max(0, index) * step(tempo + role.beat);
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
    beat: entry.beat ?? LINES_RUNG,
    initial: css(blend(neutral(), ENTER[enter](0))),
  };
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

  const called = new Set<P>();
  for (const sequence of [opening, ...Object.values<Step<P>[]>(sections)])
    for (const item of sequence)
      if ("parts" in item) for (const part of item.parts) called.add(part);
  const uncalled = names.filter((name) => !called.has(name));
  if (uncalled.length > 0) opening.push({ parts: uncalled });

  return {
    margin: input.margin,
    tempo: clampTempo(input.tempo ?? 0),
    roles,
    opening,
    sections,
    ordered: input.ordered ?? false,
    tight: input.tight ?? false,
  };
}

export function plan<P extends string, S extends string>(
  score: Score<P, S>,
  sequence: readonly OpeningStep<P>[] = score.opening,
  pace = 0,
  staged: (part: P) => boolean = () => true,
): Plan<P> {
  const t = score.tempo + pace;
  const cues: Cue<P>[] = [];
  let at = 0;
  let length = 0;
  let released: number | null = null;
  for (const item of sequence) {
    if ("release" in item) {
      released ??= at;
      continue;
    }
    if ("rest" in item) {
      if (item.with === undefined || staged(item.with))
        at += step(item.rest + t);
      continue;
    }
    const roles = item.parts.map((part) => score.roles[part]);
    const run = Math.max(...roles.map((role) => arrival(role.matter, t)));
    cues.push({ parts: item.parts, at, length: run });
    if (score.tight && !item.parts.some(staged)) continue;
    length = Math.max(length, at + run);
    at += Math.max(...roles.map((role) => lead(role, t)));
  }
  return { cues, length, after: released ?? at };
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
