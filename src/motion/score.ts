import { blend, css, neutral } from "./color";
import { CUE_LEAD, EVEN_DROP, MATTER, STAIRS_DROP } from "./constants";
import { arrival, departure, ENTER } from "./time";
import type {
  Beat,
  Cadence,
  Casting,
  Cue,
  LeaveVerb,
  Matter,
  Plan,
  Role,
  Score,
  ScoreInput,
  Step,
} from "./types";
import { tempo as clampTempo, step, steps, trail, trailWindow } from "./utils";

export const lead = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - CUE_LEAD);

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
    tempo: clampTempo(input.tempo ?? 0),
    roles,
    opening,
    sections,
    ordered: input.ordered ?? false,
  };
}

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
