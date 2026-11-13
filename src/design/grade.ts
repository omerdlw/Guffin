"use client";

import { useEffect } from "react";
import type { AmbientPalette } from "@omerdlw/base-framework/ambient";
import { Signal } from "@/motion/engine";

export interface Tint {
  l: number;
  c: number;
  h: number;
}

export type Grading = string | Tint | null;

declare module "@omerdlw/base-framework/navigation" {
  interface NavigationPayload {
    grade?: string | null;
    palette?: AmbientPalette | null;
  }
}

const TINT_LIGHTNESS = 0.74;

const TINT_CHROMA = 0.1;

const TINT_WHITE = 0.985;

const TINT_WHITE_PAPER = 0.22;

const TINT_HUES = 24;

const TINT_MIN_CHROMA = 0.02;

const TINT_READ_WIDTH = 48;

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

function write(tint: Tint | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { style } = root;
  const paper = root.dataset.theme === "light";
  const white = paper ? TINT_WHITE_PAPER : TINT_WHITE;
  const presence = tint ? 1 : 0;
  const seen: Tint = tint
    ? paper
      ? { l: tint.l - 0.24, c: tint.c * 1.3, h: tint.h }
      : tint
    : { l: TINT_LIGHTNESS, c: TINT_CHROMA, h: 0 };
  const light = {
    l: white + (seen.l - white) * presence,
    c: seen.c * presence,
    h: seen.h,
  };
  style.setProperty("--tint", tintCss(seen));
  style.setProperty("--tint-presence", String(presence));
  style.setProperty("--light", tintCss(light));
  style.setProperty("--grade", rgbOf(light).join(" "));
}

export const grade = new Signal<Tint | null>(null);

grade.subscribe(write);

if (typeof document !== "undefined")
  new MutationObserver(() => write(grade.get())).observe(
    document.documentElement,
    { attributeFilter: ["data-theme"], attributes: true },
  );

export function useGrade(value: Grading | undefined) {
  const key = typeof value === "object" && value ? value.h : value;
  useEffect(() => {
    if (value === undefined) return;
    if (value === null || typeof value === "object") {
      grade.set(value);
      return;
    }
    let live = true;
    void sampledTint(value).then((tint) => {
      if (live && tint) grade.set(tint);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-samples only when the grade's hue changes
  }, [key]);
}
