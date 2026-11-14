import { describe, expect, it } from "vitest";
import { compile } from "./choreo";

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
            blur: 0,
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
    expect(css).toContain("filter: blur(0px) brightness(var(--fan-lit))");
  });

  it("keeps numeric rotation in degrees", () => {
    expect(
      compile("u", { parts: { a: { hover: { rotate: 5, duration: 1 } } } }),
    ).toContain("rotate: 5deg");
  });
});
