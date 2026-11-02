import type { Clock, Frame } from "./clock";
import type { Curve } from "./curve";
import { springAt, type Spring } from "./spring";

export type Drive =
  | { tween: number; curve: Curve; delay?: number }
  | { spring: Spring; delay?: number };

type Motion =
  | {
      kind: "tween";
      from: number;
      to: number;
      start: number;
      duration: number;
      curve: Curve;
    }
  | {
      kind: "spring";
      target: number;
      start: number;
      offset: number;
      velocity: number;
      spring: Spring;
    };

// A number that moves on the engine clock. It only holds a frame task while it
// is moving, and a new target always starts from where it is, at its speed.
export class Value {
  private x: number;
  private v = 0;
  private goal: number;
  private motion: Motion | null = null;
  private settle: ((finished: boolean) => void) | null = null;
  private detach: (() => void) | null = null;
  private listeners = new Set<(value: number) => void>();

  constructor(
    private clock: Clock,
    initial = 0,
    private precision = 1e-3,
  ) {
    this.x = initial;
    this.goal = initial;
  }

  get current() {
    return this.x;
  }

  get velocity() {
    return this.v;
  }

  get target() {
    return this.goal;
  }

  get moving() {
    return this.motion !== null;
  }

  set(value: number) {
    this.halt(false);
    this.x = value;
    this.v = 0;
    this.goal = value;
    this.notify();
  }

  to(target: number, drive: Drive): Promise<boolean> {
    this.halt(false);
    this.goal = target;
    const start = this.clock.time + (drive.delay ?? 0);
    this.motion =
      "tween" in drive
        ? {
            kind: "tween",
            from: this.x,
            to: target,
            start,
            duration: drive.tween,
            curve: drive.curve,
          }
        : {
            kind: "spring",
            target,
            start,
            offset: this.x - target,
            velocity: this.v,
            spring: drive.spring,
          };
    return this.run();
  }

  push(impulse: number, spring: Spring): Promise<boolean> {
    const velocity = this.v + impulse / spring.mass;
    this.halt(false);
    this.v = velocity;
    this.motion = {
      kind: "spring",
      target: this.goal,
      start: this.clock.time,
      offset: this.x - this.goal,
      velocity,
      spring,
    };
    return this.run();
  }

  stop() {
    this.halt(false);
    this.v = 0;
    this.goal = this.x;
  }

  subscribe(listener: (value: number) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private run() {
    return new Promise<boolean>((resolve) => {
      this.settle = resolve;
      this.detach = this.clock.add("update", this.tick);
    });
  }

  private halt(finished: boolean) {
    this.detach?.();
    this.detach = null;
    this.motion = null;
    const settle = this.settle;
    this.settle = null;
    settle?.(finished);
  }

  private land(value: number) {
    this.x = value;
    this.v = 0;
    this.halt(true);
    this.notify();
  }

  private tick = ({ time, delta }: Frame) => {
    const motion = this.motion;
    if (!motion) return;
    const t = time - motion.start;
    if (t < 0) return;

    if (motion.kind === "tween") {
      const p = motion.duration > 0 ? Math.min(1, t / motion.duration) : 1;
      if (p >= 1) return this.land(motion.to);
      const x = motion.from + (motion.to - motion.from) * motion.curve(p);
      this.v = delta > 0 ? (x - this.x) / delta : 0;
      this.x = x;
    } else {
      const [offset, velocity] = springAt(
        motion.spring,
        motion.offset,
        motion.velocity,
        t,
      );
      if (
        Math.abs(offset) < this.precision &&
        Math.abs(velocity) < this.precision * 10
      )
        return this.land(motion.target);
      this.x = motion.target + offset;
      this.v = velocity;
    }
    this.notify();
  };

  private notify() {
    for (const listener of Array.from(this.listeners)) listener(this.x);
  }
}
