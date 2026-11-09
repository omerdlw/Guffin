import {
  ENGINE_FIRST_DELTA,
  ENGINE_MAX_DELTA,
  ENGINE_PHASES,
  ENGINE_REDUCED,
  ENGINE_REST,
} from "./constants";
import type {
  Clock,
  ClockOptions,
  Drive,
  Engine,
  EngineOptions,
  Frame,
  Motion,
  MouseSample,
  Phase,
  Pointer,
  Source,
  Task,
  TimeSpring,
  Viewport,
} from "./types";
import { samePointer, sameViewport, springAt } from "./utils";

export class Signal<T> implements Source<T> {
  private listeners = new Set<(value: T) => void>();

  constructor(
    private value: T,
    private equal: (a: T, b: T) => boolean = Object.is,
  ) {}

  get = () => this.value;

  set(value: T) {
    if (this.equal(this.value, value)) return;
    this.value = value;
    for (const listener of Array.from(this.listeners)) listener(value);
  }

  subscribe = (listener: (value: T) => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

function rethrow(error: unknown) {
  queueMicrotask(() => {
    throw error;
  });
}

function createClock({ manual = false }: ClockOptions = {}): Clock {
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
    ENGINE_PHASES.some(
      (phase) => tasks[phase].size > 0 || onces[phase].length > 0,
    );

  function run(delta: number) {
    time += delta;
    const frame: Frame = { time, delta };
    for (const phase of ENGINE_PHASES) {
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
      last === null
        ? ENGINE_FIRST_DELTA
        : Math.min((now - last) / 1000, ENGINE_MAX_DELTA);
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
      for (const phase of ENGINE_PHASES) tasks[phase].clear();
      onces = { read: [], update: [], render: [] };
    },
  };

  return clock;
}

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

  push(impulse: number, spring: TimeSpring): Promise<boolean> {
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

function createEngine(options: EngineOptions = {}): Engine {
  const clock = options.clock ?? createClock();
  const browser = typeof window !== "undefined";

  const scroll = new Signal(browser ? window.scrollY : 0);
  const viewport = new Signal<Viewport>(
    browser
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 },
    sameViewport,
  );
  const pointer = new Signal<Pointer>(ENGINE_REST, samePointer);
  const reduced = new Signal(
    browser ? matchMedia(ENGINE_REDUCED).matches : false,
  );
  const layout = new Signal(0);
  const cleanup: (() => void)[] = [];

  if (browser) {
    const listen = <K extends keyof WindowEventMap>(
      type: K,
      handler: (event: WindowEventMap[K]) => void,
    ) => {
      window.addEventListener(type, handler, { passive: true });
      cleanup.push(() => window.removeEventListener(type, handler));
    };

    if (options.scroll) {
      const source = options.scroll;
      scroll.set(source.get());
      cleanup.push(source.subscribe((y) => scroll.set(y)));
    } else listen("scroll", () => scroll.set(window.scrollY));

    listen("resize", () =>
      viewport.set({ width: window.innerWidth, height: window.innerHeight }),
    );

    listen("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const { width, height } = viewport.get();
      if (width === 0 || height === 0) return;
      pointer.set({
        x: (event.clientX / width) * 2 - 1,
        y: (event.clientY / height) * 2 - 1,
        active: true,
      });
    });

    const away = (event: MouseEvent) => {
      if (event.relatedTarget === null) pointer.set(ENGINE_REST);
    };
    document.addEventListener("mouseout", away);
    cleanup.push(() => document.removeEventListener("mouseout", away));

    if (!options.reduced) {
      const media = matchMedia(ENGINE_REDUCED);
      const change = () => reduced.set(media.matches);
      media.addEventListener("change", change);
      cleanup.push(() => media.removeEventListener("change", change));
    }

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => layout.set(layout.get() + 1));
      observer.observe(document.documentElement);
      cleanup.push(() => observer.disconnect());
    }
  }

  return {
    clock,
    scroll,
    viewport,
    pointer,
    reduced: options.reduced ?? reduced,
    layout,
    dispose() {
      for (const stop of cleanup) stop();
      if (!options.clock) clock.dispose();
    },
  };
}

let shared: Engine | null = null;

export function sharedEngine(): Engine {
  shared ??= createEngine();
  return shared;
}

const pointer: MouseSample = { at: 0, present: false, x: 0, y: 0 };

let users = 0;

const move = (event: PointerEvent) => {
  if (event.pointerType !== "mouse") return;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.present = true;
  pointer.at = performance.now();
};
const leave = () => {
  pointer.present = false;
};

export function watchPointer(): () => void {
  if (users++ === 0) {
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
  }
  return () => {
    if (--users > 0) return;
    window.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("mouseleave", leave);
  };
}

export function pointerFromCentre(): [number, number] {
  if (!pointer.present) return [0, 0];
  return [
    (pointer.x / window.innerWidth) * 2 - 1,
    (pointer.y / window.innerHeight) * 2 - 1,
  ];
}

export function pointerSample(): Readonly<MouseSample> {
  return pointer;
}
