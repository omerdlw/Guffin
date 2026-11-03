import type { Engine } from "./engine";
import { PHI, haze, reach } from "./ladder";
import { blend, css, neutral, type Shade } from "./look";
import { MATTER, response, type Matter, type MatterName } from "./matter";
import { Value } from "./value";

// A force is anything that adds a shade to a part from outside its score:
// a hand on it, for now. The stage blends forces after the fields.
export interface Force {
  shade(): Shade;
  subscribe(listener: () => void): () => void;
}

// How a part answers a hand. Hover and press are two springs of the part's own
// matter; a press answers one rung faster than a hover, and lets go at the
// speed of the hover. A press is a breath taken in: the part sinks a little
// and softens (haze(0), one pixel at most), then comes back into focus as the
// hand lets go.
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

export type TouchVerb = keyof typeof TOUCH;

export interface TouchOptions {
  verb?: TouchVerb;
  matter?: MatterName | Matter;
  tempo?: number;
}

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

// A hand on an element that is not a part: the touch paints its transform and
// filter directly, and leaves everything else to the element's own styles.
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
