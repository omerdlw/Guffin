import { afterEach, describe, expect, it, vi } from "vitest";
import { drive, feel, spring } from "./glass-thumb";

describe("drive", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lands every spring exactly on its goal when it stops", () => {
    let now = 0;
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal("performance", { now: () => now });
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
      queue.push(fn);
      return queue.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const press = spring(0.98);
    const drawn: number[] = [];
    const loop = drive(
      () => [[press, 1, feel(260, 0.32)]],
      () => drawn.push(press.x),
      () => false,
    );
    loop.wake();
    let frames = 0;
    while (queue.length && frames < 2000) {
      now += 1000 / 60;
      queue.shift()!(now);
      frames += 1;
    }

    expect(queue.length).toBe(0);
    expect(drawn.at(-1)).toBe(1);
    expect(press.v).toBe(0);
  });
});
