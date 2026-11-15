import { describe, expect, it } from "vitest";
import { findShape, radiusPx, type ShapeBox, type ShapeProbe } from "./shape";

interface Fake {
  box: ShapeBox;
  children?: Fake[];
  name: string;
  painted?: boolean;
  radius?: string;
}

const PROBE: ShapeProbe<Fake> = {
  children: (n) => n.children ?? [],
  painted: (n) => n.painted ?? false,
  radius: (n) => n.radius ?? "0px",
  rect: (n) => n.box,
};

const box = (left: number, top: number, w: number, h: number): ShapeBox => ({
  bottom: top + h,
  left,
  right: left + w,
  top,
});

describe("radiusPx", () => {
  it("reads percentages against the short side", () => {
    expect(radiusPx("50%", 40, 40)).toBe(20);
  });
  it("caps rounded-full at a circle", () => {
    expect(radiusPx("3.40282e+38px", 72, 72)).toBe(36);
  });
  it("takes the first of an elliptical pair", () => {
    expect(radiusPx("12px 4px", 100, 40)).toBe(12);
  });
  it("reads no corner as zero", () => {
    expect(radiusPx("0px", 10, 10)).toBe(0);
    expect(radiusPx("", 10, 10)).toBe(0);
  });
});

describe("findShape", () => {
  const avatar: Fake = {
    box: box(0, 0, 72, 72),
    name: "avatar",
    painted: true,
    radius: "3.40282e+38px",
  };

  it("finds the round avatar inside a bare link", () => {
    const link: Fake = {
      box: box(0, 0, 72, 72),
      children: [avatar],
      name: "a",
    };
    const shape = findShape(link, PROBE);
    expect(shape.node.name).toBe("avatar");
    expect(shape.radius).toBe(36);
  });

  it("keeps the link when the avatar shares it with a name", () => {
    const name: Fake = { box: box(80, 20, 120, 32), name: "span" };
    const link: Fake = {
      box: box(0, 0, 200, 72),
      children: [{ ...avatar }, name],
      name: "a",
    };
    expect(findShape(link, PROBE).node.name).toBe("a");
  });

  it("keeps a target that has corners of its own", () => {
    const pill: Fake = {
      box: box(0, 0, 90, 32),
      children: [{ box: box(0, 0, 90, 32), name: "inner", painted: true }],
      name: "pill",
      radius: "9999px",
    };
    const shape = findShape(pill, PROBE);
    expect(shape.node.name).toBe("pill");
    expect(shape.radius).toBe(16);
  });

  it("keeps a painted square target", () => {
    const tile: Fake = { box: box(0, 0, 40, 40), name: "tile", painted: true };
    expect(findShape(tile, PROBE).radius).toBe(0);
  });

  it("does not follow an overlay much larger than the target", () => {
    const halo: Fake = {
      box: box(-20, -20, 80, 80),
      name: "halo",
      painted: true,
    };
    const link: Fake = { box: box(0, 0, 40, 40), children: [halo], name: "a" };
    expect(findShape(link, PROBE).node.name).toBe("a");
  });

  it("walks down through bare wrappers", () => {
    const inner: Fake = {
      box: box(0, 0, 72, 72),
      children: [avatar],
      name: "span",
    };
    const link: Fake = { box: box(0, 0, 74, 74), children: [inner], name: "a" };
    expect(findShape(link, PROBE).node.name).toBe("avatar");
  });
});
