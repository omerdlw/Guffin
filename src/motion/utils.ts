import {
  type NavigationTrip,
  pathOf,
} from "@omerdlw/base-framework/modules/navigation";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import type { TargetAndTransition } from "motion/react";
import type { CSSProperties } from "react";
import {
  BEAT,
  EPSILON,
  EXPOSE_BAND,
  EXPOSE_EDGE,
  FILM_PAGE,
  KIT_TAKES_A_HAND,
  KIT_WIPE_EDGE,
  MARQUEE_DEVELOP_RUNG,
  MARQUEE_REST_RUNG,
  PHI,
  POINTS,
  PROJECTION_KEYWORDS,
  REDUCED_MOTION_QUERY,
  SCOPE_SEPARATOR,
  SCREEN_DIM,
  SCREEN_THROUGH,
  TEMPO_RANGE,
  TINT_CHROMA,
  TINT_HUES,
  TINT_LIGHTNESS,
  TINT_MIN_CHROMA,
  TRAIL_DROP,
  TRAVEL,
} from "./constants";
import type {
  Beat,
  Css,
  CursorSpring,
  Curve,
  CurveName,
  Ease,
  MarqueeEdges,
  MarqueeFrame,
  Mass,
  Pointer,
  ProgressWindow,
  Rect,
  Role,
  SpringTune,
  State,
  Step,
  TimeSpring,
  Tint,
  Viewport,
} from "./types";

export function rectOf(el: HTMLElement): Rect {
  const box = el.getBoundingClientRect();
  return {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    radius: Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
  };
}

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export function placeShell(shell: HTMLElement, rect: Rect) {
  const { style } = shell;
  style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  style.width = `${rect.width}px`;
  style.height = `${rect.height}px`;
  style.borderRadius = `${rect.radius}px`;
}

export const round = (value: number) => Math.round(value * 1000) / 1000;

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

export function tintOf(pixels: ArrayLike<number>): Tint | null {
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

export const uncached = (src: string) =>
  `${src}${src.includes("?") ? "&" : "?"}tint`;

export const toGamma = (v: number) => {
  const x = Math.min(1, Math.max(0, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
};

export const tintCss = ({ l, c, h }: Tint) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${(((h % 360) + 360) % 360).toFixed(1)})`;

export const rungName = (rung: number) =>
  rung < 0 ? `n${-rung}` : String(rung);

export const ms = (seconds: number) =>
  `calc(${Math.round(seconds * 1000)}ms * var(--tempo, 1))`;

export const tune = (stiffness: number, ratio: number): SpringTune => ({
  damping: 2 * ratio * Math.sqrt(stiffness),
  stiffness,
});

export const spring = (x = 0): CursorSpring => ({ v: 0, x });

export function pullSpring(
  s: CursorSpring,
  to: number,
  dt: number,
  { damping, stiffness }: SpringTune,
) {
  s.v += ((to - s.x) * stiffness - s.v * damping) * dt;
  s.x += s.v * dt;
}

export const unitClamp = (n: number) => Math.max(0, Math.min(n, 1));

export function layerOf(from: Element): HTMLElement | null {
  for (let node: Element | null = from; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position === "static") continue;
    if (Number.parseInt(style.zIndex, 10) >= Z_INDEX.DOCK_BACKDROP) {
      return node instanceof HTMLElement ? node : null;
    }
  }
  return null;
}

export const sameViewport = (a: Viewport, b: Viewport) =>
  a.width === b.width && a.height === b.height;

export const samePointer = (a: Pointer, b: Pointer) =>
  a.x === b.x && a.y === b.y && a.active === b.active;

export function setMask(el: HTMLElement, image: string) {
  el.style.setProperty("mask-image", image);
  el.style.setProperty("-webkit-mask-image", image);
}

export function clearMask(el: HTMLElement) {
  el.style.removeProperty("mask-image");
  el.style.removeProperty("-webkit-mask-image");
}

export function shine(light: HTMLElement, edge: number, level: number) {
  setMask(
    light,
    `linear-gradient(90deg, transparent ${edge - EXPOSE_BAND}%, #000 ${edge - EXPOSE_EDGE * 0.4}%, transparent ${edge + 3}%)`,
  );
  light.style.opacity = level.toFixed(3);
}

export const speed = (depth: number) => PHI ** (-depth / 2);

export const parallax = (depth: number) => 1 - speed(depth);

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const withinWindow = (progress: number, [from, to]: ProgressWindow) =>
  clamp((progress - from) / (to - from), 0, 1);

export function staggered(
  progress: number,
  window: ProgressWindow,
  i: number,
  n: number,
  share: number,
) {
  const [from, to] = window;
  const span = to - from;
  const run = span * share;
  const start = from + (n > 1 ? i / (n - 1) : 0) * (span - run);
  return clamp((progress - start) / run, 0, 1);
}

export function wipe(host: HTMLElement, reached: number) {
  if (reached <= 0) {
    clearMask(host);
    host.style.opacity = "0";
    return;
  }
  host.style.removeProperty("opacity");
  if (reached >= 1) {
    clearMask(host);
    return;
  }
  const edge = (100 + KIT_WIPE_EDGE) * reached;
  setMask(
    host,
    `linear-gradient(90deg, #000 ${edge - KIT_WIPE_EDGE}%, transparent ${edge}%)`,
  );
}

export function handsOf(host: HTMLElement) {
  const found = Array.from(
    host.querySelectorAll<HTMLElement>(KIT_TAKES_A_HAND),
  );
  const own = found.filter(
    (el) => !found.some((other) => other !== el && other.contains(el)),
  );
  return own.length > 0 ? own : [host];
}

export const step = (rung: number) => BEAT * PHI ** rung;

export const marqueeHold = (tempo = 0) =>
  step(MARQUEE_DEVELOP_RUNG + tempo) + step(MARQUEE_REST_RUNG + tempo);

export const within = (
  progress: number,
  [from, to]: readonly [number, number],
) => clamp((progress - from) / (to - from), 0, 1);

export function balance(widths: number[], gap: number, count: number) {
  const n = widths.length;
  const span = (from: number, to: number) => {
    let total = gap * (to - from - 1);
    for (let i = from; i < to; i++) total += widths[i];
    return total;
  };
  const cost = Array.from({ length: count + 1 }, () =>
    Array<number>(n + 1).fill(Infinity),
  );
  const cut = Array.from({ length: count + 1 }, () => Array<number>(n + 1));
  cost[0][0] = 0;
  for (let j = 1; j <= count; j++)
    for (let i = j; i <= n; i++)
      for (let t = j - 1; t < i; t++) {
        const worst = Math.max(cost[j - 1][t], span(t, i));
        if (worst < cost[j][i]) {
          cost[j][i] = worst;
          cut[j][i] = t;
        }
      }
  const breaks: number[] = [];
  for (let j = count, i = n; j > 0; j--) {
    breaks.unshift(cut[j][i]);
    i = cut[j][i];
  }
  return { breaks, width: cost[count][n] };
}

export function pictureIn(
  frame: MarqueeFrame,
  image: { width: number; height: number },
  [fx, fy]: readonly [number, number],
): MarqueeFrame {
  const scale = Math.max(
    frame.width / image.width,
    frame.height / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    left: frame.left + (frame.width - width) * fx,
    top: frame.top + (frame.height - height) * fy,
    width,
    height,
  };
}

export function coverOf(
  context: CanvasRenderingContext2D,
  frame: MarqueeFrame,
  edges: MarqueeEdges,
) {
  const across = context.createLinearGradient(
    frame.left,
    0,
    frame.left + frame.width,
    0,
  );
  const mirrored = [...edges.side.slice(0, -1)]
    .reverse()
    .map(([at, cover]) => [100 - at, cover] as const);
  for (const [at, cover] of [...edges.side, ...mirrored])
    across.addColorStop(at / 100, `rgb(0 0 0 / ${cover / 100})`);
  const down = context.createLinearGradient(
    0,
    frame.top,
    0,
    frame.top + frame.height,
  );
  for (const [at, cover] of edges.bottom)
    down.addColorStop(at / 100, `rgb(0 0 0 / ${cover / 100})`);
  return { across, down };
}

export function pull(
  mass: Mass,
  tx: number,
  ty: number,
  dt: number,
  stiffness: number,
  damping: number,
) {
  mass.vx += ((tx - mass.x) * stiffness - mass.vx * damping) * dt;
  mass.vy += ((ty - mass.y) * stiffness - mass.vy * damping) * dt;
  mass.x += mass.vx * dt;
  mass.y += mass.vy * dt;
}

export function parsePosition(position: string): [number, number] {
  const [x = "center", y = "center"] = position.trim().split(/\s+/);
  const read = (value: string) =>
    value.endsWith("%")
      ? Number.parseFloat(value) / 100
      : (PROJECTION_KEYWORDS[value] ?? 0.5);
  return [read(x), read(y)];
}

export const dissolve = (progress: number) =>
  progress * progress * (3 - 2 * progress);

export const changesPage = (trip: NavigationTrip) =>
  pathOf(trip.to) !== pathOf(trip.from);

export function styleOf(initial: Css): CSSProperties {
  return {
    opacity: Number(initial.opacity),
    transform: initial.transform,
    filter: initial.filter,
    clipPath: initial.clipPath,
  };
}

export const topOf = (el: HTMLElement) => {
  const box = el.getBoundingClientRect();
  return Math.round(box.top + scrollY) + box.left / 1e5;
};

export function subscribeReducedMotion(change: () => void) {
  const media = matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

export const readReducedMotion = () => matchMedia(REDUCED_MOTION_QUERY).matches;

export const reducedMotionOnServer = () => false;

export function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function lines(spans: readonly HTMLElement[]) {
  const tops: number[] = [];
  return spans.map((span) => {
    const top = span.offsetTop;
    let line = tops.findIndex((at) => Math.abs(at - top) < 2);
    if (line === -1) line = tops.push(top) - 1;
    return line;
  });
}

export const trailWindow = (role: Role, tempo: number) =>
  step(role.matter.rung + tempo - TRAIL_DROP);

export function steps<P extends string>(beats: readonly Beat<P>[]): Step<P>[] {
  return beats.map((beat) =>
    typeof beat === "string"
      ? { parts: [beat] }
      : "rest" in beat
        ? { rest: beat.rest, with: beat.with }
        : { parts: [...beat] },
  );
}

export function passThrough(run: number): TargetAndTransition {
  return {
    opacity: 0,
    scale: SCREEN_THROUGH,
    transition: {
      duration: run,
      opacity: { duration: run, ease: SCREEN_DIM },
      scale: { duration: run, ease: POINTS.dolly },
    },
  };
}

export const keyOf = (name: string, scope: string | null) =>
  scope === null ? name : `${name}\u0000${scope}`;

export const scopeOfKey = (key: string) => {
  const at = key.indexOf("\u0000");
  return at === -1 ? null : key.slice(at + 1);
};

export const inScope = (scope: string | null, outer: string | null) =>
  outer === null
    ? scope === null
    : scope !== null &&
      (scope === outer || scope.startsWith(outer + SCOPE_SEPARATOR));

export function liftOf(
  depth: number,
  moving: boolean,
  quiet: boolean,
  softened: boolean,
) {
  if (depth !== 0 && !quiet) return "transform, opacity, filter";
  if (!moving) return "";
  return softened ? "transform, opacity, filter" : "transform, opacity";
}

export const haze = (rung: number) => PHI ** rung;

export const reach = (rung: number) => TRAVEL * PHI ** rung;

export const tempo = (value: number) => clamp(value, -TEMPO_RANGE, TEMPO_RANGE);

export const trail = (index: number, window: number) =>
  index <= 0 ? 0 : window * (1 - PHI ** -index);

export function bezier(x1: number, y1: number, x2: number, y2: number): Curve {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const x = (t: number) => ((ax * t + bx) * t + cx) * t;
  const y = (t: number) => ((ay * t + by) * t + cy) * t;
  const slope = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  function solve(v: number) {
    let t = v;
    for (let i = 0; i < 8; i++) {
      const error = x(t) - v;
      if (Math.abs(error) < EPSILON) return t;
      const d = slope(t);
      if (Math.abs(d) < EPSILON) break;
      t -= error / d;
    }
    let lo = 0;
    let hi = 1;
    t = v;
    for (let i = 0; i < 40; i++) {
      const at = x(t);
      if (Math.abs(at - v) < EPSILON) return t;
      if (v > at) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  return (v) => (v <= 0 ? 0 : v >= 1 ? 1 : y(solve(v)));
}

export function elapsed(curve: Curve, eased: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (curve(mid) < eased) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const cubic = (name: CurveName) =>
  `cubic-bezier(${POINTS[name].join(", ")})`;

export function springAt(
  spring: TimeSpring,
  offset: number,
  velocity: number,
  t: number,
): State {
  const omega = (2 * Math.PI) / spring.period;
  const zeta = spring.damping;

  if (zeta < 1) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const a = offset;
    const b = (velocity + zeta * omega * offset) / wd;
    const decay = Math.exp(-zeta * omega * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return [
      decay * (a * cos + b * sin),
      decay *
        ((b * wd - zeta * omega * a) * cos - (a * wd + zeta * omega * b) * sin),
    ];
  }

  if (zeta === 1) {
    const a = offset;
    const b = velocity + omega * offset;
    const decay = Math.exp(-omega * t);
    return [decay * (a + b * t), decay * (b - omega * (a + b * t))];
  }

  const root = omega * Math.sqrt(zeta * zeta - 1);
  const r1 = -zeta * omega + root;
  const r2 = -zeta * omega - root;
  const c2 = (velocity - r1 * offset) / (r2 - r1);
  const c1 = offset - c2;
  const e1 = Math.exp(r1 * t);
  const e2 = Math.exp(r2 * t);
  return [c1 * e1 + c2 * e2, r1 * c1 * e1 + r2 * c2 * e2];
}

export function springForce({ period, damping, mass }: TimeSpring) {
  const omega = (2 * Math.PI) / period;
  return {
    type: "spring",
    stiffness: mass * omega ** 2,
    damping: 2 * damping * mass * omega,
    mass,
  } as const;
}

export const lit = (p: number) => clamp(p * PHI, 0, 1);

export const left = (p: number) => 1 - p;

const veil = (rung: number) => `blur(${haze(rung).toFixed(2)}px)`;

export const hazy = (rung = 3) => ({ opacity: 0, filter: veil(rung) }) as const;

export const tween = (duration: number, ease: Ease, delay = 0) =>
  ({
    type: "tween",
    duration,
    ease,
    ...(delay > 0 ? { delay } : {}),
  }) as const;

export function layoutTop(element: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

export const isFilmPage = (href: string): boolean =>
  FILM_PAGE.test(pathOf(href));
