import { blend, css, neutral } from "./color";
import { MATTER, PHI } from "./constants";
import { Value } from "./engine";
import { response } from "./time";
import type {
  Engine,
  Force,
  Matter,
  Placement,
  Shade,
  TouchOptions,
  TouchVerb,
} from "./types";
import { clamp, haze, parallax, reach, speed } from "./utils";

export function depthShade(
  depth: number,
  scroll: number,
  viewport: number,
  { top, fixed }: Placement,
): Shade {
  if (depth === 0 || viewport === 0) return {};
  const y = fixed
    ? -scroll * speed(depth)
    : Math.max(0, scroll - Math.max(0, top - viewport)) * parallax(depth);
  if (depth < 0) return { y };
  const passed = clamp((scroll - (fixed ? 0 : top)) / viewport, 0, 1);
  return {
    y,
    brightness: 1 - passed * (1 - PHI ** -depth),
    blur: passed * depth * PHI,
  };
}

export const driftReach = (drift: number) => reach(-2) * drift;

export const TOUCH = {
  press: (_hover: number, press: number): Shade => ({
    scale: 1 - press * PHI ** -7,
    blur: press * haze(0),
  }),
  lift: (hover: number, press: number): Shade => ({
    y: -hover * reach(-3),
    scale: (1 + hover * PHI ** -8) * (1 - press * PHI ** -7),
    blur: press * haze(0),
  }),
  glow: (hover: number, press: number): Shade => ({
    brightness: 1 + hover * PHI ** -4,
    scale: 1 - press * PHI ** -7,
    blur: press * haze(0),
  }),
} as const;

export class Touch implements Force {
  private hover: Value;
  private press: Value;
  private verb: TouchVerb;
  private matter: Matter;
  private tempo: number;

  constructor(
    private engine: Engine,
    { verb = "press", matter = "paper", tempo = 0 }: TouchOptions = {},
  ) {
    this.verb = verb;
    this.matter = typeof matter === "string" ? MATTER[matter] : matter;
    this.tempo = tempo;
    this.hover = new Value(engine.clock, 0, 1e-3);
    this.press = new Value(engine.clock, 0, 1e-3);
  }

  shade(): Shade {
    if (this.engine.reduced.get()) return {};
    return TOUCH[this.verb](this.hover.current, this.press.current);
  }

  subscribe(listener: () => void) {
    const a = this.hover.subscribe(listener);
    const b = this.press.subscribe(listener);
    return () => {
      a();
      b();
    };
  }

  get moving() {
    return this.hover.moving || this.press.moving;
  }

  attach(el: HTMLElement) {
    const spring = response(this.matter, this.tempo);
    const quick = response(this.matter, this.tempo - 1);
    const hover = (on: boolean) => this.hover.to(on ? 1 : 0, { spring });
    const press = (on: boolean) =>
      this.press.to(on ? 1 : 0, { spring: on ? quick : spring });

    const off = () => {
      hover(false);
      press(false);
    };
    const handlers: [string, (event: Event) => void][] = [
      [
        "pointerenter",
        (event) => {
          if ((event as PointerEvent).pointerType !== "touch") hover(true);
        },
      ],
      ["pointerleave", off],
      ["pointercancel", off],
      ["pointerdown", () => press(true)],
      ["pointerup", () => press(false)],
      [
        "focus",
        () => {
          if (el.matches(":focus-visible")) hover(true);
        },
      ],
      ["blur", off],
      [
        "keydown",
        (event) => {
          if ((event as KeyboardEvent).key === "Enter") press(true);
        },
      ],
      ["keyup", () => press(false)],
    ];
    for (const [type, handler] of handlers) el.addEventListener(type, handler);
    return () => {
      for (const [type, handler] of handlers)
        el.removeEventListener(type, handler);
      this.hover.stop();
      this.press.stop();
    };
  }
}

export function touch(engine: Engine, el: HTMLElement, options?: TouchOptions) {
  const force = new Touch(engine, options);
  let queued = false;
  const draw = () => {
    queued = false;
    const { transform, filter } = css(blend(neutral(), force.shade()));
    el.style.transform = transform === "none" ? "" : transform;
    el.style.filter = filter === "none" ? "" : filter;
    el.style.willChange = force.moving ? "transform" : "";
  };
  const unsubscribe = force.subscribe(() => {
    if (queued) return;
    queued = true;
    engine.clock.once("render", draw);
  });
  const detach = force.attach(el);
  return () => {
    unsubscribe();
    detach();
  };
}
