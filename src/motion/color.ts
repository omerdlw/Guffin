import {
  LADDER_HAZE_RUNGS,
  LADDER_RUNGS,
  MATTER,
  PHI,
  POINTS,
  TINT_CHROMA,
  TINT_LIGHTNESS,
  TINT_READ_WIDTH,
  TINT_RUNG,
  TINT_WHITE,
} from "./constants";
import { Signal, Value } from "./engine";
import { arrival, CURVE, departure, HAZE_CAP, response } from "./time";
import type {
  Css,
  CurveName,
  Engine,
  Look,
  MatterName,
  Shade,
  Tint,
  Written,
} from "./types";
import {
  cubic,
  haze,
  ms,
  round,
  rungName,
  step,
  tintCss,
  tintOf,
  toGamma,
  uncached,
} from "./utils";

export const neutral = (): Look => ({
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
  brightness: 1,
  saturate: 1,
  clipTop: 0,
  clipRight: 0,
  clipBottom: 0,
  clipLeft: 0,
});

export function blend(into: Look, shade: Shade): Look {
  if (shade.opacity !== undefined) into.opacity *= shade.opacity;
  if (shade.x !== undefined) into.x += shade.x;
  if (shade.y !== undefined) into.y += shade.y;
  if (shade.scale !== undefined) into.scale *= shade.scale;
  if (shade.rotate !== undefined) into.rotate += shade.rotate;
  if (shade.blur !== undefined) into.blur += shade.blur;
  if (shade.brightness !== undefined) into.brightness *= shade.brightness;
  if (shade.saturate !== undefined) into.saturate *= shade.saturate;
  if (shade.clipTop !== undefined)
    into.clipTop = Math.max(into.clipTop, shade.clipTop);
  if (shade.clipRight !== undefined)
    into.clipRight = Math.max(into.clipRight, shade.clipRight);
  if (shade.clipBottom !== undefined)
    into.clipBottom = Math.max(into.clipBottom, shade.clipBottom);
  if (shade.clipLeft !== undefined)
    into.clipLeft = Math.max(into.clipLeft, shade.clipLeft);
  return into;
}

export function css(look: Look): Css {
  const transform: string[] = [];
  if (round(look.x) !== 0 || round(look.y) !== 0)
    transform.push(`translate3d(${round(look.x)}px, ${round(look.y)}px, 0)`);
  if (round(look.scale) !== 1) transform.push(`scale(${round(look.scale)})`);
  if (round(look.rotate) !== 0)
    transform.push(`rotate(${round(look.rotate)}deg)`);

  const filter: string[] = [];
  const blur = Math.min(look.blur, HAZE_CAP);
  if (blur > 0.05) filter.push(`blur(${round(blur)}px)`);
  if (round(look.brightness) !== 1)
    filter.push(`brightness(${round(look.brightness)})`);
  if (round(look.saturate) !== 1)
    filter.push(`saturate(${round(look.saturate)})`);

  const cut = [
    look.clipTop,
    look.clipRight,
    look.clipBottom,
    look.clipLeft,
  ].map((side) => round(Math.min(1, Math.max(0, side)) * 100));

  return {
    opacity: String(round(Math.min(1, Math.max(0, look.opacity)))),
    transform: transform.length > 0 ? transform.join(" ") : "none",
    filter: filter.length > 0 ? filter.join(" ") : "none",
    clipPath: cut.some((side) => side > 0)
      ? `inset(${cut.map((side) => `${side}%`).join(" ")})`
      : "none",
  };
}

export const blank = (): Written => ({
  opacity: "",
  transform: "",
  filter: "",
  clipPath: "",
  willChange: "",
});

export function paint(el: HTMLElement, next: Written, written: Written) {
  const { style } = el;
  if (next.opacity !== written.opacity) style.opacity = next.opacity;
  if (next.transform !== written.transform) style.transform = next.transform;
  if (next.filter !== written.filter) style.filter = next.filter;
  if (next.clipPath !== written.clipPath) style.clipPath = next.clipPath;
  if (next.willChange !== written.willChange)
    style.willChange = next.willChange;
  return next;
}

export function sampleTint(src: string, retry = true): Promise<Tint | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => {
      try {
        if (!image.naturalWidth) return resolve(null);
        const height = Math.max(
          1,
          Math.round(
            (TINT_READ_WIDTH * image.naturalHeight) / image.naturalWidth,
          ),
        );
        const canvas = document.createElement("canvas");
        canvas.width = TINT_READ_WIDTH;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, TINT_READ_WIDTH, height);
        resolve(
          tintOf(context.getImageData(0, 0, TINT_READ_WIDTH, height).data),
        );
      } catch {
        resolve(null);
      }
    };
    image.onerror = () =>
      resolve(
        retry && /^https?:/.test(src) ? sampleTint(uncached(src), false) : null,
      );
    image.src = src;
  });
}

export function rgbOf({ l, c, h }: Tint): [number, number, number] {
  const angle = (h * Math.PI) / 180;
  const a = c * Math.cos(angle);
  const b = c * Math.sin(angle);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ].map((v) => Math.round(toGamma(v) * 255)) as [number, number, number];
}

class Grade {
  readonly target = new Signal<Tint | null>(null);
  private l: Value;
  private c: Value;
  private h: Value;
  private presence: Value;
  private queued = false;
  private seen = false;

  constructor(private engine: Engine) {
    const { clock } = engine;
    this.l = new Value(clock, TINT_LIGHTNESS);
    this.c = new Value(clock, TINT_CHROMA);
    this.h = new Value(clock, 0, 0.01);
    this.presence = new Value(clock, 0);
    for (const value of [this.l, this.c, this.h, this.presence])
      value.subscribe(this.queue);
  }

  get current(): Tint {
    return { l: this.l.current, c: this.c.current, h: this.h.current };
  }

  set(tint: Tint | null, { immediate = false } = {}) {
    this.target.set(tint);
    const quiet = immediate || this.engine.reduced.get();
    const drive = { tween: quiet ? 0 : step(TINT_RUNG), curve: CURVE.silk };
    if (!tint) {
      this.presence.to(0, drive);
      return;
    }
    if (!this.seen || this.presence.current === 0) {
      this.seen = true;
      this.h.set(tint.h);
      this.l.set(tint.l);
      this.c.set(tint.c);
    } else {
      const from = this.h.current;
      const delta = ((((tint.h - from) % 360) + 540) % 360) - 180;
      this.h.to(from + delta, drive);
      this.l.to(tint.l, drive);
      this.c.to(tint.c, drive);
    }
    this.presence.to(1, drive);
  }

  private queue = () => {
    if (this.queued) return;
    this.queued = true;
    this.engine.clock.once("render", () => {
      this.queued = false;
      if (typeof document === "undefined") return;
      const { style } = document.documentElement;
      style.setProperty("--tint", tintCss(this.current));
      const presence = this.presence.current;
      style.setProperty("--tint-presence", presence.toFixed(3));
      const { l, c, h } = this.current;
      const light = {
        l: TINT_WHITE + (l - TINT_WHITE) * presence,
        c: c * presence,
        h,
      };
      style.setProperty("--light", tintCss(light));
      style.setProperty("--grade", rgbOf(light).join(" "));
    });
  };
}

const grades = new WeakMap<Engine, Grade>();

export function gradeOf(engine: Engine): Grade {
  let grade = grades.get(engine);
  if (!grade) {
    grade = new Grade(engine);
    grades.set(engine, grade);
  }
  return grade;
}

export const tempoScale = (tempo: number) => PHI ** tempo;

function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rung of LADDER_RUNGS)
    out[`--step-${rungName(rung)}`] = ms(step(rung));
  for (const rung of LADDER_HAZE_RUNGS)
    out[`--haze-${rungName(rung)}`] = `${haze(rung).toFixed(2)}px`;
  for (const name of Object.keys(MATTER) as MatterName[]) {
    const matter = MATTER[name];
    out[`--arrive-${name}`] = ms(arrival(matter, 0));
    out[`--leave-${name}`] = ms(departure(matter, 0));
    out[`--touch-${name}`] = ms(response(matter, 0).period);
    out[`--curve-${name}`] = cubic(matter.curve);
  }
  for (const name of Object.keys(POINTS) as CurveName[])
    out[`--curve-${name}`] = cubic(name);
  return out;
}

export const tokenSheet = () =>
  `:root,[data-tempo]{${Object.entries(tokens())
    .map(([key, value]) => `${key}:${value}`)
    .join(";")}}`;
