import { describe, expect, it } from "vitest";
import { compile, paced } from "./choreo";

const css = compile("t", {
  parts: {
    person: {
      hover: { duration: 0.6, opacity: 1 },
      slots: {
        folder: { hover: { tilt: 15, duration: 0.6 }, origin: "center bottom" },
        leaf: {
          hover: {
            x: "calc(-50% + var(--fan-x) * 1.4)",
            rotate: "calc(var(--fan-r) * 1.3)",
            scale: "calc(var(--fan-s) * 1.02)",
            bright: "var(--fan-lit)",
            duration: 0.6,
          },
        },
      },
    },
  },
});

describe("compile", () => {
  it("tips a panel about its horizontal axis", () => {
    expect(css).toContain("rotate: x 15deg");
    expect(css).toContain('[data-part="person"]:hover [data-slot="folder"]');
  });

  it("passes CSS expressions through", () => {
    expect(css).toContain("rotate: calc(var(--fan-r) * 1.3)");
    expect(css).toContain("scale: calc(var(--fan-s) * 1.02)");
    expect(css).toContain("translate: calc(-50% + var(--fan-x) * 1.4) 0");
    expect(css).toContain("filter: brightness(var(--fan-lit))");
  });

  it("waits a touch's delay and undoes it at rest", () => {
    const out = compile("u", {
      parts: {
        a: {
          follow: { of: ["opacity"], duration: 0.2 },
          hover: { opacity: 1, duration: 0.6, delay: 0.15 },
        },
      },
    });
    expect(out).toContain("transition-delay: 0ms");
    expect(out).toContain("transition-delay: 150ms");
  });

  it("keeps numeric rotation in degrees", () => {
    expect(
      compile("u", { parts: { a: { hover: { rotate: 5, duration: 1 } } } }),
    ).toContain("rotate: 5deg");
  });
});

describe("paced", () => {
  it("stretches entrances and their travel, never touch", () => {
    const out = paced(
      {
        parts: {
          a: {
            enter: {
              on: "view",
              from: { y: 8, x: "1em" },
              duration: 1,
              delay: 0.5,
              stagger: 0.1,
            },
            hover: { y: -8, duration: 0.6 },
            text: {
              by: "word",
              stagger: 0.05,
              enter: { on: "load", from: { y: 13 }, duration: 0.5 },
            },
            slots: {
              icon: { enter: { on: "view", from: { x: 21 }, duration: 0.4 } },
            },
          },
        },
      },
      { tempo: 2, reach: 1.5 },
    );
    const a = out.parts!.a!;
    expect(a.enter).toMatchObject({
      duration: 2,
      delay: 1,
      stagger: 0.2,
      from: { y: 12, x: "1em" },
    });
    expect(a.hover).toEqual({ y: -8, duration: 0.6 });
    expect(a.text).toMatchObject({
      stagger: 0.1,
      enter: { duration: 1, from: { y: 19.5 } },
    });
    expect(a.slots!.icon!.enter).toMatchObject({
      duration: 0.8,
      from: { x: 31.5 },
    });
  });
});
