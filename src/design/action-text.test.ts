import { describe, expect, it } from "vitest";
import { pieces, shapeOf } from "./action-text";

const keys = (text: string) => pieces(text).map((piece) => piece.key);

describe("shapeOf", () => {
  it("hides the numbers, whatever their length", () => {
    expect(shapeOf("More reviews (117)")).toBe("More reviews (#)");
    expect(shapeOf("More reviews (97)")).toBe(shapeOf("More reviews (117)"));
  });
  it("tells a different label from a different count", () => {
    expect(shapeOf("Add Review")).not.toBe(shapeOf("Edit Review"));
    expect(shapeOf("Inbox 3")).toBe(shapeOf("Inbox 7"));
  });
});

describe("pieces", () => {
  it("keeps words whole and splits numbers into digits", () => {
    expect(pieces("More reviews (117)")).toEqual([
      { digit: false, key: "t0", text: "More reviews (" },
      { digit: true, key: "n0:2", text: "1" },
      { digit: true, key: "n0:1", text: "1" },
      { digit: true, key: "n0:0", text: "7" },
      { digit: false, key: "t1", text: ")" },
    ]);
  });

  it("keys digits from the right, so the units stay put", () => {
    expect(keys("More reviews (97)")).toEqual(["t0", "n0:1", "n0:0", "t1"]);
    expect(keys("9")).toEqual(["n0:0"]);
    expect(keys("10")).toEqual(["n0:1", "n0:0"]);
  });

  it("numbers each run of digits", () => {
    expect(keys("1 of 12")).toEqual(["n0:0", "t0", "n1:1", "n1:0"]);
  });

  it("leaves a label without numbers whole", () => {
    expect(pieces("Seen")).toEqual([{ digit: false, key: "t0", text: "Seen" }]);
    expect(pieces("")).toEqual([]);
  });
});
