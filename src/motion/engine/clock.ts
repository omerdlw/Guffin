// One clock for everything that moves. Each frame reads the world, updates the
// physics, then renders, so no write ever forces a layout another read needs.
// Engine time only advances on frames and can be slowed as a whole.

export type Phase = "read" | "update" | "render";

export interface Frame {
  time: number;
  delta: number;
}

export type Task = (frame: Frame) => void;

export interface Clock {
  readonly time: number;
  rate: number;
  add(phase: Phase, task: Task): () => void;
  once(phase: Phase, task: Task): void;
  advance(delta: number): void;
  dispose(): void;
}

export interface ClockOptions {
  manual?: boolean;
}

const PHASES: readonly Phase[] = ["read", "update", "render"];
const MAX_DELTA = 1 / 20;
const FIRST_DELTA = 1 / 60;

function rethrow(error: unknown) {
  queueMicrotask(() => {
    throw error;
  });
}

export function createClock({ manual = false }: ClockOptions = {}): Clock {
  const tasks: Record<Phase, Set<Task>> = {
    read: new Set(),
    update: new Set(),
    render: new Set(),
  };
  let onces: Record<Phase, Task[]> = { read: [], update: [], render: [] };
  let time = 0;
  let last: number | null = null;
  let request: number | null = null;
  let disposed = false;

  const pending = () =>
    PHASES.some((phase) => tasks[phase].size > 0 || onces[phase].length > 0);

  function run(delta: number) {
    time += delta;
    const frame: Frame = { time, delta };
    for (const phase of PHASES) {
      for (const task of Array.from(tasks[phase])) {
        try {
          task(frame);
        } catch (error) {
          rethrow(error);
        }
      }
      const queue = onces[phase];
      onces = { ...onces, [phase]: [] };
      for (const task of queue) {
        try {
          task(frame);
        } catch (error) {
          rethrow(error);
        }
      }
    }
  }

  function tick(now: number) {
    request = null;
    if (disposed) return;
    const delta =
      last === null ? FIRST_DELTA : Math.min((now - last) / 1000, MAX_DELTA);
    last = now;
    run(delta * clock.rate);
    if (pending()) wake();
    else last = null;
  }

  function wake() {
    if (manual || disposed || request !== null) return;
    if (typeof requestAnimationFrame === "undefined") return;
    request = requestAnimationFrame(tick);
  }

  const clock: Clock = {
    get time() {
      return time;
    },
    rate: 1,
    add(phase, task) {
      tasks[phase].add(task);
      wake();
      return () => {
        tasks[phase].delete(task);
      };
    },
    once(phase, task) {
      onces[phase].push(task);
      wake();
    },
    advance(delta) {
      run(delta * clock.rate);
    },
    dispose() {
      disposed = true;
      if (request !== null && typeof cancelAnimationFrame !== "undefined")
        cancelAnimationFrame(request);
      request = null;
      for (const phase of PHASES) tasks[phase].clear();
      onces = { read: [], update: [], render: [] };
    },
  };

  return clock;
}
