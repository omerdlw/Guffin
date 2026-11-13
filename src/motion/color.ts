import type { AmbientPalette } from "@omerdlw/base-framework/ambient";
import { type Engine, Signal, Value } from "./engine";
import { PHI, round } from "./math";
import {
  arrival,
  CURVE,
  type CurveName,
  departure,
  haze,
  MATTER,
  type MatterName,
  POINTS,
  response,
  step,
} from "./time";

export interface Look {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  blur: number;
  brightness: number;
  saturate: number;
  clipTop: number;
  clipRight: number;
  clipBottom: number;
  clipLeft: number;
}

export type Shade = Partial<Look>;

export interface Css {
  opacity: string;
  transform: string;
  filter: string;
  clipPath: string;
}

export type Written = Css & { willChange: string };

export interface Tint {
  l: number;
  c: number;
  h: number;
}

declare module "@omerdlw/base-framework/navigation" {
  interface NavigationPayload {
    grade?: string | null;
    palette?: AmbientPalette | null;
  }
}

const TINT_LIGHTNESS = 0.74;

const TINT_CHROMA = 0.1;

const TINT_RUNG = 3;

const TINT_WHITE = 0.985;

const TINT_WHITE_PAPER = 0.22;

const TINT_HUES = 24;

const TINT_MIN_CHROMA = 0.02;

const TINT_READ_WIDTH = 48;

const LADDER_RUNGS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;

const LADDER_HAZE_RUNGS = [-1, 0, 1, 2, 3, 4, 5, 6] as const;

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

function oklab(r: number, g: number, b: number): [number, number, number] {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb,
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb,
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb,
  );
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function tintOf(pixels: ArrayLike<number>): Tint | null {
  const a = new Float64Array(TINT_HUES);
  const b = new Float64Array(TINT_HUES);
  const weight = new Float64Array(TINT_HUES);
  let total = 0;
  const count = Math.floor(pixels.length / 4);

  for (let i = 0; i < pixels.length; i += 4) {
    const [l, pa, pb] = oklab(
      pixels[i] / 255,
      pixels[i + 1] / 255,
      pixels[i + 2] / 255,
    );
    if (l < 0.2 || l > 0.95) continue;
    const chroma = Math.hypot(pa, pb);
    if (chroma < 0.03) continue;
    const hue = (Math.atan2(pb, pa) / (2 * Math.PI) + 1) % 1;
    const slice = Math.min(TINT_HUES - 1, Math.floor(hue * TINT_HUES));
    const w = chroma * chroma;
    a[slice] += pa * w;
    b[slice] += pb * w;
    weight[slice] += w;
    total += w;
  }
  if (count === 0 || total / count < TINT_MIN_CHROMA ** 2) return null;

  let best = 0;
  let most = -1;
  for (let slice = 0; slice < TINT_HUES; slice++) {
    const sum =
      weight[(slice + TINT_HUES - 1) % TINT_HUES] +
      weight[slice] +
      weight[(slice + 1) % TINT_HUES];
    if (sum > most) {
      most = sum;
      best = slice;
    }
  }
  let sa = 0;
  let sb = 0;
  for (const slice of [
    (best + TINT_HUES - 1) % TINT_HUES,
    best,
    (best + 1) % TINT_HUES,
  ]) {
    sa += a[slice];
    sb += b[slice];
  }
  const h = ((Math.atan2(sb, sa) * 180) / Math.PI + 360) % 360;
  return { l: TINT_LIGHTNESS, c: TINT_CHROMA, h };
}

const uncached = (src: string) => `${src}${src.includes("?") ? "&" : "?"}tint`;

const toGamma = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

const tintCss = ({ l, c, h }: Tint) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${(((h % 360) + 360) % 360).toFixed(1)})`;

const rungName = (rung: number) => (rung < 0 ? `n${-rung}` : String(rung));

const ms = (seconds: number) =>
  `calc(${Math.round(seconds * 1000)}ms * var(--tempo, 1))`;

const cubic = (name: CurveName) => `cubic-bezier(${POINTS[name].join(", ")})`;

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

export function css(look: Look, radius = ""): Css {
  const transform: string[] = [];
  if (round(look.x) !== 0 || round(look.y) !== 0)
    transform.push(`translate3d(${round(look.x)}px, ${round(look.y)}px, 0)`);
  if (round(look.scale) !== 1) transform.push(`scale(${round(look.scale)})`);
  if (round(look.rotate) !== 0)
    transform.push(`rotate(${round(look.rotate)}deg)`);

  const filter: string[] = [];
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
      ? `inset(${cut.map((side) => `${side}%`).join(" ")}${radius ? ` round ${radius}` : ""})`
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

function sampleTint(src: string, retry = true): Promise<Tint | null> {
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

const tints = new Map<string, Promise<Tint | null>>();

export function sampledTint(src: string): Promise<Tint | null> {
  let tint = tints.get(src);
  if (!tint) {
    tint = sampleTint(src).then((found) => {
      if (!found) tints.delete(src);
      return found;
    });
    tints.set(src, tint);
  }
  return tint;
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
    if (typeof document !== "undefined")
      new MutationObserver(this.queue).observe(document.documentElement, {
        attributeFilter: ["data-theme"],
        attributes: true,
      });
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
      const root = document.documentElement;
      const { style } = root;
      const paper = root.dataset.theme === "light";
      const seen = (tint: Tint): Tint =>
        paper ? { l: tint.l - 0.24, c: tint.c * 1.3, h: tint.h } : tint;
      const white = paper ? TINT_WHITE_PAPER : TINT_WHITE;
      style.setProperty("--tint", tintCss(seen(this.current)));
      const presence = this.presence.current;
      style.setProperty("--tint-presence", presence.toFixed(3));
      const { l, c, h } = seen(this.current);
      const light = {
        l: white + (l - white) * presence,
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
