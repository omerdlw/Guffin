import { describe, expect, it } from "vitest";
import { channelIndices, channelSpread, rimShift } from "./optics";

describe("optics", () => {
  it("pulls hardest at the outline and not past the bezel", () => {
    expect(rimShift(0)).toBe(1);
    expect(rimShift(1)).toBe(0);
    expect(rimShift(2)).toBe(0);
  });

  it("gathers the bend at the outline", () => {
    expect(rimShift(0.25)).toBeLessThan(0.4);
    expect(rimShift(0.1)).toBeGreaterThan(rimShift(0.25));
  });

  it("spreads blue past red by the Abbe number", () => {
    const [red, green, blue] = channelIndices(1.5, 20);
    expect(red).toBeLessThan(green);
    expect(blue).toBeGreaterThan(green);
    expect(blue - red).toBeCloseTo(0.5 / 20, 5);
    const [r, g, b] = channelSpread(1.5, 20);
    expect(r).toBeLessThan(1);
    expect(g).toBe(1);
    expect(b).toBeGreaterThan(1);
  });
});
