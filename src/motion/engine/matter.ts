import type { CurveName } from "./curve";
import { PHI, step } from "./ladder";
import type { Spring } from "./spring";
import type { EnterVerb, LeaveVerb } from "./verbs";

// A part says what it is made of, never how long it takes. Its weight puts it
// on a rung; the page's tempo moves that rung; the ladder turns it into time.
export interface Matter {
  rung: number;
  mass: number;
  damping: number;
  curve: CurveName;
  enter: EnterVerb;
  leave: LeaveVerb;
}

export const MATTER = {
  light: {
    rung: 1,
    mass: PHI ** -2,
    damping: 1,
    curve: "fade",
    enter: "glow",
    leave: "fade",
  },
  ink: {
    rung: 2,
    mass: PHI ** -1,
    damping: 0.9,
    curve: "silk",
    enter: "rise",
    leave: "fade",
  },
  paper: {
    rung: 2,
    mass: 1,
    damping: 0.86,
    curve: "pour",
    enter: "lift",
    leave: "sink",
  },
  glass: {
    rung: 1,
    mass: PHI ** -1,
    damping: 1,
    curve: "expo",
    enter: "clear",
    leave: "fog",
  },
  plate: {
    rung: 4,
    mass: PHI ** 2,
    damping: 1,
    curve: "pour",
    enter: "develop",
    leave: "cool",
  },
  metal: {
    rung: 3,
    mass: PHI ** 3,
    damping: 0.72,
    curve: "expo",
    enter: "settle",
    leave: "sink",
  },
} as const satisfies Record<string, Matter>;

export type MatterName = keyof typeof MATTER;

// Leaving takes two rungs less than arriving, and never more than LEAVE_CAP:
// a page must let go faster than it took to arrive.
export const LEAVE_DROP = 2;
export const LEAVE_CAP = 2;

// A hand on a part (pointer, drag) answers three rungs faster than the part
// arrived: the same material, at the speed of touch.
export const RESPONSE_DROP = 3;

export const arrival = (matter: Matter, tempo: number) =>
  step(matter.rung + tempo);

export const departure = (matter: Matter, tempo: number) =>
  step(Math.min(matter.rung + tempo - LEAVE_DROP, LEAVE_CAP));

export const response = (matter: Matter, tempo: number): Spring => ({
  period: step(matter.rung + tempo - RESPONSE_DROP),
  damping: matter.damping,
  mass: matter.mass,
});
