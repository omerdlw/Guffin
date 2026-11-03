import { CURVE } from "./curve";
import type { Engine } from "./engine";
import { step } from "./ladder";
import { Signal } from "./signal";
import { Value } from "./value";

// The color of the room comes from the picture. A tint is one hue at a fixed
// lightness and chroma in OKLCH, so every page's light has the same strength
// and only its color changes. It crossfades on the plate's settle rung and is
// published as --tint (a color) and --tint-presence (0…1) on the root, with
// the room's light as --light (a color) and --grade (its sRGB channels, for
// colors written as rgb(var(--grade) / alpha)).

export interface Tint {
  l: number;
  c: number;
  h: number;
}

export const TINT_LIGHTNESS = 0.74;
export const TINT_CHROMA = 0.1;
export const TINT_RUNG = 3;

const WHITE = 0.985;

const HUES = 24;
// Below this mean chroma a picture is grey enough to leave the room unlit.
const MIN_CHROMA = 0.02;
const READ_WIDTH = 48;

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

// The hue the picture leans toward: colorful mid-tones vote, weighted by their
// chroma, and the strongest neighborhood of hues wins.
export function tintOf(pixels: ArrayLike<number>): Tint | null {
  const a = new Float64Array(HUES);
  const b = new Float64Array(HUES);
  const weight = new Float64Array(HUES);
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
    const slice = Math.min(HUES - 1, Math.floor(hue * HUES));
    const w = chroma * chroma;
    a[slice] += pa * w;
    b[slice] += pb * w;
    weight[slice] += w;
    total += w;
  }
  if (count === 0 || total / count < MIN_CHROMA ** 2) return null;

  let best = 0;
  let most = -1;
  for (let slice = 0; slice < HUES; slice++) {
    const sum =
      weight[(slice + HUES - 1) % HUES] +
      weight[slice] +
      weight[(slice + 1) % HUES];
    if (sum > most) {
      most = sum;
      best = slice;
    }
  }
  let sa = 0;
  let sb = 0;
  for (const slice of [(best + HUES - 1) % HUES, best, (best + 1) % HUES]) {
    sa += a[slice];
    sb += b[slice];
  }
  const h = ((Math.atan2(sb, sa) * 180) / Math.PI + 360) % 360;
  return { l: TINT_LIGHTNESS, c: TINT_CHROMA, h };
}

// A picture the page is also showing without CORS can come back from the
// cache without its header; it is read once more under an address of its own.
const uncached = (src: string) => `${src}${src.includes("?") ? "&" : "?"}tint`;

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
          Math.round((READ_WIDTH * image.naturalHeight) / image.naturalWidth),
        );
        const canvas = document.createElement("canvas");
        canvas.width = READ_WIDTH;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, READ_WIDTH, height);
        resolve(tintOf(context.getImageData(0, 0, READ_WIDTH, height).data));
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

const toGamma = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

// A tint as sRGB channels, 0…255.
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

export const tintCss = ({ l, c, h }: Tint) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${(((h % 360) + 360) % 360).toFixed(1)})`;

export class Grade {
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
    // A first color, or one arriving out of darkness, takes its hue at once.
    if (!this.seen || this.presence.current === 0) {
      this.seen = true;
      this.h.set(tint.h);
      this.l.set(tint.l);
      this.c.set(tint.c);
    } else {
      // The short way round the hue circle.
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
      // The room's light: white in a dark room, the tint as it comes up.
      const { l, c, h } = this.current;
      const light = { l: WHITE + (l - WHITE) * presence, c: c * presence, h };
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
