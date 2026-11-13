import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Clock,
  type Engine,
  type Frame,
  type Phase,
  Signal,
} from "./engine";
import { Passage } from "./passage";
import { step } from "./time";

function manualClock(): Clock {
  const tasks: Record<Phase, Set<(frame: Frame) => void>> = {
    read: new Set(),
    update: new Set(),
    render: new Set(),
  };
  let onces: Record<Phase, ((frame: Frame) => void)[]> = {
    read: [],
    update: [],
    render: [],
  };
  let time = 0;
  const clock = {
    get time() {
      return time;
    },
    rate: 1,
    add(phase: Phase, task: (frame: Frame) => void) {
      tasks[phase].add(task);
      return () => {
        tasks[phase].delete(task);
      };
    },
    once(phase: Phase, task: (frame: Frame) => void) {
      onces[phase].push(task);
    },
    advance(delta: number) {
      time += delta;
      const frame = { time, delta };
      for (const phase of ["read", "update", "render"] as Phase[]) {
        for (const task of Array.from(tasks[phase])) task(frame);
        const queue = onces[phase];
        onces = { ...onces, [phase]: [] };
        for (const task of queue) task(frame);
      }
    },
    dispose() {},
  };
  return clock as unknown as Clock;
}

function setup(reduced = false) {
  const clock = manualClock();
  const engine = {
    clock,
    reduced: new Signal(reduced),
  } as unknown as Engine;
  const passage = new Passage(engine);
  const run = (seconds: number) => {
    const frames = Math.ceil(seconds * 60);
    for (let i = 0; i < frames; i++) clock.advance(1 / 60);
  };
  return { passage, run };
}

describe("Passage", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("covers the page and settles as covered", async () => {
    const { passage, run } = setup();
    const closed = passage.close();
    expect(passage.phase.get()).toBe("closing");
    run(step(0) + 0.1);
    await closed;
    expect(passage.phase.get()).toBe("covered");
    expect(passage.cover.current).toBeCloseTo(1, 2);
  });

  it("returns the same promise for a second close while closing", () => {
    const { passage } = setup();
    expect(passage.close()).toBe(passage.close());
  });

  it("lifts when asked and ends clear", async () => {
    const { passage, run } = setup();
    void passage.close({ quick: true });
    run(step(-2) + 0.1);
    await Promise.resolve();
    passage.lift();
    expect(passage.phase.get()).toBe("lifting");
    run(step(2) + 0.1);
    await Promise.resolve();
    expect(passage.phase.get()).toBe("clear");
    expect(passage.cover.current).toBeCloseTo(0, 2);
  });

  it("does nothing when lifted while clear", () => {
    const { passage } = setup();
    passage.lift();
    expect(passage.phase.get()).toBe("clear");
  });

  it("gives a route without an opening a short grace, then lifts", async () => {
    const { passage, run } = setup();
    void passage.close({ quick: true });
    passage.land();
    run(step(-2) + 0.1);
    await Promise.resolve();
    expect(passage.phase.get()).toBe("covered");
    vi.advanceTimersByTime(step(1) * 1000 + 10);
    expect(passage.phase.get()).toBe("lifting");
  });

  it("keeps the veil for a page that opens with a scene of its own", async () => {
    const { passage, run } = setup();
    void passage.close({ quick: true, keep: true });
    passage.land();
    run(step(-2) + 0.1);
    await Promise.resolve();
    vi.advanceTimersByTime(step(1) * 1000 + 10);
    expect(passage.phase.get()).toBe("covered");
    vi.advanceTimersByTime(step(5) * 1000);
    expect(passage.phase.get()).toBe("lifting");
  });

  it("lets a replacement trip close again before an abandoned one lifts", async () => {
    const { passage, run } = setup();
    void passage.close();
    run(step(0) + 0.1);
    await Promise.resolve();
    passage.abandon();
    void passage.close();
    vi.advanceTimersByTime(step(-3) * 1000 + 50);
    expect(passage.phase.get()).toBe("covered");
  });

  it("lifts an abandoned trip after the debounce", async () => {
    const { passage, run } = setup();
    void passage.close();
    run(step(0) + 0.1);
    await Promise.resolve();
    passage.abandon();
    vi.advanceTimersByTime(step(-3) * 1000 + 50);
    expect(passage.phase.get()).toBe("lifting");
  });

  it("closes again from a lift in progress without finishing the lift", async () => {
    const { passage, run } = setup();
    void passage.close({ quick: true });
    run(step(-2) + 0.1);
    await Promise.resolve();
    passage.lift();
    run(0.3);
    passage.close();
    expect(passage.phase.get()).toBe("closing");
    run(step(0) + 0.1);
    await Promise.resolve();
    expect(passage.phase.get()).toBe("covered");
  });

  it("answers a reduced-motion reader with the quiet rung", async () => {
    const { passage, run } = setup(true);
    void passage.close();
    run(step(-1) + 0.05);
    await Promise.resolve();
    expect(passage.phase.get()).toBe("covered");
  });
});
