import { describe, expect, it } from "vitest";
import { pressOrigin, squeeze } from "./liquid-touch";

describe("squeeze", () => {
  it("gives a small control at most 6%", () => {
    expect(squeeze(40, 40)).toBeCloseTo(0.94, 5);
  });
  it("gives a wide control the same few px, not the same share", () => {
    expect(squeeze(400, 40)).toBeCloseTo(0.98, 5);
    expect(squeeze(800, 48)).toBeCloseTo(0.99, 5);
  });
  it("survives an empty box", () => {
    expect(squeeze(0, 0)).toBeCloseTo(0.94, 5);
  });
});

describe("pressOrigin", () => {
  const rect = { height: 40, left: 100, top: 50, width: 120 };
  it("is the point pressed, from the top left", () => {
    expect(pressOrigin(rect, 130, 70)).toEqual({ ox: 30, oy: 20 });
  });
  it("stays inside the control", () => {
    expect(pressOrigin(rect, 90, 200)).toEqual({ ox: 0, oy: 40 });
  });
});
