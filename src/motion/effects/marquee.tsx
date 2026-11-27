"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@/design/foundations/z-index";
import { bezier, linear } from "../core/curve";
import { Value } from "../core/engine";
import { clamp, PHI, within } from "../core/math";
import { useEngine, useScrollDriver } from "../core/provider";

interface MarqueeFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface MarqueeEdges {
  side: readonly (readonly [number, number])[];
  bottom: readonly (readonly [number, number])[];
}

interface MarqueeLetter {
  char: string;
  x: number;
}

interface MarqueeLine {
  letters: MarqueeLetter[];
  baseline: number;
}

interface MarqueeCard {
  lines: MarqueeLine[];
  size: number;
  font: string;
  x: number;
  y: number;
  width: number;
  height: number;
  ratio: number;
  frame: MarqueeFrame;
  picture: MarqueeFrame;
  image: HTMLImageElement;
}

interface MarqueeProps {
  text: string;
  src: string;
  focus?: readonly [number, number];
  edges: MarqueeEdges;
  target?: string;
  quiet?: boolean;
  className?: string;
  frames?: readonly string[];
  onLift?: () => void;
}

const MARQUEE_BLEED = 2;
const MARQUEE_DEVELOP = 1.029;

const MARQUEE_REST = 0.636;

const MARQUEE_DRIFT_TIME = 4.36;

const MARQUEE_DIVE_TIME = 2.694;

const MARQUEE_FOLLOW = 0.809;

const MARQUEE_PATIENCE = 2.118;

const SILK = bezier(0.5, 0.05, 0.1, 1);

const GLIDE = bezier(0.65, 0, 0.35, 1);

const FADE = bezier(0.45, 0, 0.15, 1);

const MARQUEE_DIVE = [0.03, 0.76] as const;

const MARQUEE_EDGES = [0, 0.4] as const;

const MARQUEE_SPREAD = [0.02, 0.72] as const;

const MARQUEE_FADE = [0.4, 0.74] as const;

const MARQUEE_GLARE = [0.3, 0.74] as const;

const MARQUEE_UNSEEN = 0.004;

const MARQUEE_GLARE_GAIN = 0.4;

const MARQUEE_DIVE_REACH = 2.6;

const MARQUEE_DIVE_MIN = 10;

const MARQUEE_DIVE_MAX = 40;

const MARQUEE_DRIFT = 0.035;

const MARQUEE_TRACK_REST = 0.03;

const MARQUEE_TRACK_FOCUS = 0.07;

const MARQUEE_TRACK_OPEN = 0.46;

const MARQUEE_SLIP = 12;

const MARQUEE_MEASURE = 0.78;

const MARQUEE_MEASURE_NARROW = 0.9;

const MARQUEE_NARROW = 640;

const MARQUEE_HEIGHT = 0.46;

const MARQUEE_SIZE = 0.36;

const MARQUEE_LEADING = 0.94;

const MARQUEE_LINES = 3;

const MARQUEE_REFERENCE = 100;

const MARQUEE_MARGIN = 0.06;

const MARQUEE_DENSITY = 2;

const MARQUEE_RIM = "--ambient-vibrant-90";

const MARQUEE_WASH = "--ambient-dominant-70";

const MARQUEE_RIM_LEVEL = 0.55;

const MARQUEE_WASH_LEVEL = 0.18;

const MARQUEE_GLOW = `radial-gradient(58% 46% at 50% 48%, color-mix(in oklch, var(--ambient-vibrant-70, white) 24%, transparent), transparent 72%)`;

const MARQUEE_LIGHT_EVERY = 250;

const REEL_FRAMES = 6;

const REEL_FIRST_HOLD = 0.13;

const REEL_SLOWING = 1.13;

const REEL_BLEND = 0.55;

const REEL_SETTLE = 0.3;

const REEL_YIELD = [0, 0.12] as const;

const REEL_PATIENCE = 0.7;

const REEL_LEVEL = 0.28;

const REEL_CLEAR = [0, 0.32] as const;

const shuffled = <T,>(items: readonly T[]) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const REEL_HOLDS = Array.from(
  { length: REEL_FRAMES },
  (_, k) => REEL_FIRST_HOLD * REEL_SLOWING ** k,
);

const REEL_CUTS = REEL_HOLDS.map((_, i) =>
  REEL_HOLDS.slice(0, i + 1).reduce((sum, hold) => sum + hold, 0),
);

const pictureFile = (url: string) => url.slice(url.lastIndexOf("/"));

const MARQUEE_LAYER = Z_INDEX.DOCK_BACKDROP - 20;

const MARQUEE_OUTPUT: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: MARQUEE_LAYER,
  userSelect: "none",
  WebkitUserSelect: "none",
};

function balance(widths: number[], gap: number, count: number) {
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

function pictureIn(
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

// The picture is clipped to a fractional frame, so its edge pixels are only
// partly painted; a cover filled over the same rect only partly erases them and
// leaves a hairline. Fill past the frame (the gradients clamp to full cover).
function bleed(context: CanvasRenderingContext2D, frame: MarqueeFrame) {
  context.fillRect(
    frame.left - MARQUEE_BLEED,
    frame.top - MARQUEE_BLEED,
    frame.width + MARQUEE_BLEED * 2,
    frame.height + MARQUEE_BLEED * 2,
  );
}

function coverOf(
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

function setName(
  text: string,
  family: string,
  width: number,
  height: number,
  [top, bottom]: readonly [number, number],
) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return null;
  context.font = `700 ${MARQUEE_REFERENCE}px ${family}`;
  const track = MARQUEE_TRACK_REST * MARQUEE_REFERENCE;
  const measure = (word: string) =>
    context.measureText(word).width + word.length * track;
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const widths = words.map(measure);
  const gap = measure(" ");
  const cap =
    context.measureText("H").actualBoundingBoxAscent / MARQUEE_REFERENCE;

  const target =
    width * (width < MARQUEE_NARROW ? MARQUEE_MEASURE_NARROW : MARQUEE_MEASURE);
  const room = Math.min(
    height * MARQUEE_HEIGHT,
    (bottom - top) * (1 - 2 * MARQUEE_MARGIN),
  );
  let best: { size: number; lines: string[] } | null = null;
  for (let count = 1; count <= Math.min(MARQUEE_LINES, words.length); count++) {
    const { breaks, width: widest } = balance(widths, gap, count);
    const size = Math.min(
      (target / widest) * MARQUEE_REFERENCE,
      height * MARQUEE_SIZE,
      room / (count * MARQUEE_LEADING),
    );
    if (best && size < best.size * 1.15) continue;
    best = {
      size,
      lines: breaks.map((from, i) =>
        words.slice(from, breaks[i + 1] ?? words.length).join(" "),
      ),
    };
  }
  if (!best) return null;

  const pitch = best.size * MARQUEE_LEADING;
  const block = (best.lines.length - 1) * pitch + cap * best.size;
  const margin = (bottom - top) * MARQUEE_MARGIN;
  const low = top + margin + block / 2;
  const high = bottom - margin - block / 2;
  const y = low > high ? (top + bottom) / 2 : clamp(height * 0.485, low, high);
  const first = y - ((best.lines.length - 1) * pitch) / 2;

  const font = `700 ${best.size}px ${family}`;
  context.font = font;
  const lines = best.lines.map((line, row) => {
    const whole = context.measureText(line).width;
    let head = "";
    const letters = Array.from(line).map((char) => {
      head += char;
      return {
        char,
        x:
          context.measureText(head).width -
          context.measureText(char).width -
          whole / 2,
      };
    });
    return { letters, baseline: first + row * pitch + (cap * best.size) / 2 };
  });
  return { lines, size: best.size, font, x: width / 2, y };
}

const readLight = () => {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) => style.getPropertyValue(name).trim() || "#fff";
  return { rim: color(MARQUEE_RIM), wash: color(MARQUEE_WASH) };
};

export function Marquee({
  text,
  src,
  focus = [0.5, 0.2],
  edges,
  target = "[data-cursor-stage]",
  quiet = true,
  className,
  frames,
  onLift,
}: MarqueeProps) {
  const engine = useEngine();
  const driver = useScrollDriver();
  const host = useRef<HTMLElement | null>(null);
  const [skipped, skip] = useState(false);
  const [card, setCard] = useState<MarqueeCard | null>(null);
  const [held, hold] = useState(false);
  const [gone, setGone] = useState(false);
  const [reelIn, setReelIn] = useState(() => !frames?.length);

  const live = useRef({ gone: false });
  const els = useRef<{
    glow?: HTMLElement;
    canvas?: HTMLCanvasElement;
  }>({});
  const [values] = useState(() => ({
    enter: new Value(engine.clock),
    lit: new Value(engine.clock),
    drift: new Value(engine.clock),
    rest: new Value(engine.clock),
    x: new Value(engine.clock, 0, 0.01),
    y: new Value(engine.clock, 0, 0.01),
  }));
  const card$ = useRef<MarqueeCard | null>(null);
  const draw$ = useRef<() => void>(() => {});
  const edges$ = useRef(edges);
  const reel$ = useRef<HTMLImageElement[]>([]);
  const reelEnd$ = useRef(Infinity);
  const framesKey = frames?.join("|") ?? "";

  useEffect(() => {
    reelEnd$.current = Infinity;
    if (!framesKey) return;
    const seen = new Set([pictureFile(src)]);
    const unique = framesKey.split("|").filter((url) => {
      const file = pictureFile(url);
      if (seen.has(file)) return false;
      seen.add(file);
      return true;
    });
    const chosen = shuffled(unique).slice(0, REEL_FRAMES);
    const images = chosen.map((url) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.src = url;
      return image;
    });
    reel$.current = images;
    let alive = true;
    const settle = () => {
      if (alive) setReelIn(true);
    };
    const late = setTimeout(settle, REEL_PATIENCE * 1000);
    void Promise.allSettled(images.map((image) => image.decode())).then(settle);
    return () => {
      alive = false;
      clearTimeout(late);
      reel$.current = [];
      for (const image of images) image.src = "";
    };
  }, [framesKey, src]);

  const focus$ = useRef(focus);

  useEffect(() => {
    edges$.current = edges;
    focus$.current = focus;
  });

  const ref = useCallback((el: HTMLElement | null) => {
    host.current = el;
  }, []);

  useEffect(() => {
    if (engine.reduced.get()) skip(true);
  }, [engine]);

  const lift$ = useRef(onLift);
  const lifted = useRef(false);
  useEffect(() => {
    lift$.current = onLift;
  });
  const lift = useCallback(() => {
    if (lifted.current) return;
    lifted.current = true;
    lift$.current?.();
  }, []);

  useEffect(() => {
    if (skipped || gone) lift();
  }, [skipped, gone, lift]);

  useEffect(() => {
    if (!held || skipped) return;
    void values.enter.to(1, { tween: MARQUEE_DIVE_TIME, curve: linear });
    const at = setTimeout(lift, MARQUEE_FADE[0] * MARQUEE_DIVE_TIME * 1000);
    return () => clearTimeout(at);
  }, [held, skipped, values, lift]);

  useEffect(() => {
    if (skipped || gone) return;
    let pinned = true;
    const top = () => {
      if (!pinned || window.scrollY === 0) return;
      if (driver.active) driver.to(0, { immediate: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    const release = () => {
      pinned = false;
    };
    const events = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    top();
    addEventListener("scroll", top, { passive: true });
    for (const type of events)
      addEventListener(type, release, { passive: true });
    return () => {
      removeEventListener("scroll", top);
      for (const type of events) removeEventListener(type, release);
    };
  }, [driver, skipped, gone]);

  useEffect(() => {
    if (skipped) return;
    let alive = true;
    const image = new Image();
    let ready = false;
    let fonts = false;

    const measure = () => {
      const anchor = host.current;
      const backdrop = anchor?.parentElement?.querySelector(target);
      if (!ready || !fonts || !anchor || !backdrop) return;
      const box = backdrop.getBoundingClientRect();
      const frame = {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
      const width = window.innerWidth;
      const height = window.innerHeight;
      const name = setName(
        text,
        getComputedStyle(anchor).fontFamily,
        width,
        height,
        [Math.max(frame.top, 0), Math.min(frame.top + frame.height, height)],
      );
      if (!name || frame.width === 0 || frame.height === 0) return skip(true);
      const next = {
        ...name,
        width,
        height,
        ratio: Math.min(window.devicePixelRatio || 1, MARQUEE_DENSITY),
        frame,
        picture: pictureIn(
          frame,
          { width: image.naturalWidth, height: image.naturalHeight },
          focus,
        ),
        image,
      };
      card$.current = next;
      setCard(next);
    };

    image.onload = () => {
      void image
        .decode()
        .catch(() => {})
        .then(() => {
          ready = true;
          if (alive) measure();
        });
    };
    image.onerror = () => {
      if (alive) skip(true);
    };
    image.src = src;
    void document.fonts.ready.then(() => {
      fonts = true;
      if (alive) measure();
    });
    const patience = setTimeout(() => {
      if (alive && !ready) skip(true);
    }, MARQUEE_PATIENCE * 1000);
    const unwatch = engine.viewport.subscribe(measure);
    return () => {
      alive = false;
      clearTimeout(patience);
      unwatch();
      image.onload = image.onerror = null;
    };
  }, [engine, skipped, src, text, focus, target]);

  useEffect(() => {
    if (skipped || !card || !quiet || !reelIn || held) return;
    let alive = true;
    const quick = () => {
      if (alive) hold(true);
    };
    const events = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    for (const type of events) addEventListener(type, quick, { passive: true });

    void values.drift.to(1, { tween: MARQUEE_DRIFT_TIME, curve: linear });
    void (async () => {
      const developed = await values.lit.to(1, {
        tween: MARQUEE_DEVELOP,
        curve: SILK,
      });
      if (!developed || !alive) return;
      const rested = await values.rest.to(1, {
        tween: MARQUEE_REST,
        curve: linear,
      });
      if (rested && alive) hold(true);
    })();
    return () => {
      alive = false;
      for (const type of events) removeEventListener(type, quick);
    };
  }, [skipped, card, quiet, reelIn, held, values]);

  useEffect(() => {
    if (skipped || (card && quiet)) return;
    const quick = () => skip(true);
    const events = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    for (const type of events) addEventListener(type, quick, { passive: true });
    return () => {
      for (const type of events) removeEventListener(type, quick);
    };
  }, [skipped, card, quiet]);

  useEffect(() => {
    if (!card || gone) return;
    const spring = { period: MARQUEE_FOLLOW, damping: 1, mass: 1 };
    const follow = () => {
      const hand = engine.pointer.get();
      void values.x.to(hand.active ? hand.x : 0, { spring });
      void values.y.to(hand.active ? hand.y : 0, { spring });
    };
    follow();
    return engine.pointer.subscribe(follow);
  }, [engine, card, gone, values]);

  useEffect(() => {
    let queued = false;
    let context: CanvasRenderingContext2D | null = null;
    let out: CanvasRenderingContext2D | null = null;
    let surface: HTMLCanvasElement | null = null;
    let ink: HTMLCanvasElement | null = null;
    let outCover: ReturnType<typeof coverOf> | null = null;
    let fits = new WeakMap<HTMLImageElement, MarqueeFrame>();
    let cover: ReturnType<typeof coverOf> | null = null;
    let covered: MarqueeCard | null = null;
    let light = { rim: "#fff", wash: "#fff" };
    let sampled = -Infinity;

    const draw = () => {
      queued = false;
      const set = card$.current;
      const { glow, canvas } = els.current;
      if (!set || !glow || !canvas) return;
      if (canvas !== surface) {
        surface = canvas;
        out = canvas.getContext("2d");
        ink = document.createElement("canvas");
        context = ink.getContext("2d");
        covered = null;
      }
      if (!context || !out || !ink) return;
      if (covered !== set) {
        covered = set;
        ink.width = canvas.width;
        ink.height = canvas.height;
        cover = coverOf(context, set.frame, edges$.current);
        outCover = coverOf(out, set.frame, edges$.current);
        fits = new WeakMap();
      }

      const fitOf = (image: HTMLImageElement) => {
        if (image === set.image) return set.picture;
        let fit = fits.get(image);
        if (!fit) {
          fit = pictureIn(
            set.frame,
            { width: image.naturalWidth, height: image.naturalHeight },
            focus$.current,
          );
          fits.set(image, fit);
        }
        return fit;
      };

      const u = values.enter.current;
      const enter = u;
      const developed = values.lit.current;
      const dive = GLIDE(within(u, MARQUEE_DIVE));
      const open = SILK(within(u, MARQUEE_SPREAD));
      const away = FADE(within(u, MARQUEE_FADE));
      const glare = Math.sin(Math.PI * within(u, MARQUEE_GLARE));
      const edge = SILK(within(u, MARQUEE_EDGES));

      const reach = clamp(
        (MARQUEE_DIVE_REACH * set.height) / set.size,
        MARQUEE_DIVE_MIN,
        MARQUEE_DIVE_MAX,
      );
      const scale = (1 + MARQUEE_DRIFT * values.drift.current) * reach ** dive;
      const track =
        (MARQUEE_TRACK_REST +
          MARQUEE_TRACK_FOCUS * (1 - developed) +
          MARQUEE_TRACK_OPEN * open) *
        set.size;

      const left = 1 - clamp(enter, 0, 1);
      const dark = 1 - left * (1 - PHI ** -3);
      const size = 1 + left * PHI ** -2;
      const settle = 1 + (size - 1) * away;
      const slip = 1 - dive;
      const { frame } = set;

      const present = 1 - away;
      const alpha = developed * present;
      glow.style.opacity = (
        0.9 *
        developed *
        (1 - SILK(within(u, [0, 0.5])))
      ).toFixed(3);
      glow.style.transform = `scale(${(1 + dive * 1.6).toFixed(3)})`;
      if (alpha < MARQUEE_UNSEEN) {
        if (canvas.style.opacity !== "0") canvas.style.opacity = "0";
        if (away >= 1 && !live.current.gone) {
          live.current.gone = true;
          setGone(true);
        }
        return;
      }

      const now = performance.now();
      if (now - sampled > MARQUEE_LIGHT_EVERY) {
        light = readLight();
        sampled = now;
      }

      const clock = values.drift.current * MARQUEE_DRIFT_TIME;
      const reel = reel$.current;
      const frameAt = (slot: number) => {
        if (slot < 0) return null;
        if (slot >= reel.length || slot >= reelEnd$.current) return set.image;
        const image = reel[slot];
        if (image.complete && image.naturalWidth > 0) return image;
        reelEnd$.current = slot;
        return set.image;
      };
      let slot = REEL_CUTS.findIndex((at) => clock < at);
      if (slot < 0) slot = REEL_FRAMES;
      let to = frameAt(slot) ?? set.image;
      let from = frameAt(slot - 1);
      let mix = 1;
      if (from && from !== to) {
        const start = REEL_CUTS[slot - 1];
        const length =
          slot < REEL_FRAMES ? REEL_HOLDS[slot] * REEL_BLEND : REEL_SETTLE;
        mix = GLIDE(within(clock, [start, start + length]));
      }
      if (u > 0 && to !== set.image) {
        from = mix < 0.5 && from ? from : to;
        to = set.image;
        mix = GLIDE(within(u, REEL_YIELD));
      }
      if (mix >= 1 || from === to) from = null;
      const blending = from !== null && mix > MARQUEE_UNSEEN;
      const paint = (
        target: CanvasRenderingContext2D,
        image: HTMLImageElement,
      ) => {
        const fit = fitOf(image);
        target.drawImage(image, fit.left, fit.top, fit.width, fit.height);
      };

      const ratio = set.ratio;
      const c = context;
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      c.clearRect(0, 0, set.width, set.height);
      c.font = set.font;
      c.textBaseline = "alphabetic";
      c.textAlign = "left";

      const zoom = () => {
        c.translate(set.x, set.y);
        c.scale(scale, scale);
        c.translate(-set.x, -set.y);
      };
      const letters = (paint: (char: string, x: number, y: number) => void) => {
        for (const line of set.lines) {
          const n = line.letters.length;
          for (let i = 0; i < n; i++) {
            const { char, x } = line.letters[i];
            if (char !== " ")
              paint(char, set.x + x + (i - (n - 1) / 2) * track, line.baseline);
          }
        }
      };

      c.globalCompositeOperation = "source-over";
      c.save();
      zoom();
      c.fillStyle = "#000";
      letters((char, x, y) => c.fillText(char, x, y));
      c.restore();

      c.globalCompositeOperation = "source-in";
      c.save();
      const mx = frame.left + frame.width / 2;
      const my = frame.top + frame.height / 2;
      c.translate(
        -values.x.current * MARQUEE_SLIP * slip,
        -values.y.current * MARQUEE_SLIP * slip,
      );
      c.translate(mx, my);
      c.scale(settle, settle);
      c.translate(-mx, -my);
      paint(c, from ?? to);
      if (blending) {
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha = mix;
        paint(c, to);
        c.globalAlpha = 1;
      }
      c.restore();

      const wash = MARQUEE_WASH_LEVEL * (1 - dive);
      if (wash > 0.002) {
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha = wash;
        c.fillStyle = light.wash;
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.globalAlpha = 1;
      }

      c.globalCompositeOperation = "source-over";
      const rim = MARQUEE_RIM_LEVEL;
      if (rim > MARQUEE_UNSEEN) {
        c.save();
        c.beginPath();
        c.rect(frame.left, frame.top, frame.width, frame.height);
        c.clip();
        zoom();
        c.lineWidth = 1 / scale;
        c.lineJoin = "round";
        c.strokeStyle = light.rim;
        c.globalAlpha = rim;
        letters((char, x, y) => c.strokeText(char, x, y));
        c.restore();
      }

      if (edge > 0.001 && cover) {
        c.globalCompositeOperation = "destination-out";
        c.globalAlpha = edge;
        c.fillStyle = cover.across;
        bleed(c, frame);
        c.fillStyle = cover.down;
        bleed(c, frame);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      }

      const level = (1 + glare * MARQUEE_GLARE_GAIN) * (1 - away * (1 - dark));
      const flare =
        Math.abs(level - 1) > 0.005 ? `brightness(${level.toFixed(3)})` : "";
      if (canvas.style.filter !== flare) canvas.style.filter = flare;
      const o = out;
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.clearRect(0, 0, canvas.width, canvas.height);
      const backing =
        REEL_LEVEL * developed * (1 - SILK(within(u, REEL_CLEAR)));
      if (backing > MARQUEE_UNSEEN && outCover) {
        o.setTransform(ratio, 0, 0, ratio, 0, 0);
        o.save();
        o.beginPath();
        o.rect(frame.left, frame.top, frame.width, frame.height);
        o.clip();
        o.globalAlpha = backing;
        paint(o, from ?? to);
        if (blending) {
          o.globalCompositeOperation = "source-atop";
          o.globalAlpha = mix;
          paint(o, to);
        }
        o.restore();
        o.globalCompositeOperation = "destination-out";
        o.fillStyle = outCover.across;
        bleed(o, frame);
        o.fillStyle = outCover.down;
        bleed(o, frame);
        o.globalCompositeOperation = "source-over";
        o.setTransform(1, 0, 0, 1, 0, 0);
      }

      o.save();
      o.beginPath();
      o.rect(
        frame.left * ratio,
        frame.top * ratio,
        frame.width * ratio,
        frame.height * ratio,
      );
      o.clip();
      o.drawImage(ink, 0, 0);
      o.restore();
      canvas.style.opacity = alpha.toFixed(3);

      if (away >= 1 && !live.current.gone) {
        live.current.gone = true;
        setGone(true);
      }
    };
    draw$.current = () => {
      if (queued) return;
      queued = true;
      engine.clock.once("render", draw);
    };
    const stops = [
      values.enter,
      values.lit,
      values.drift,
      values.x,
      values.y,
    ].map((value) => value.subscribe(() => draw$.current()));
    draw$.current();
    return () => {
      for (const stop of stops) stop();
      draw$.current = () => {};
    };
  }, [engine, values, card]);

  useEffect(
    () => () => {
      for (const value of Object.values(values)) value.stop();
    },
    [values],
  );

  if (skipped) return null;

  const shown = card && !gone;

  return (
    <>
      <div aria-hidden="true" className={className} hidden ref={ref} />
      {shown
        ? createPortal(
            <div aria-hidden="true" style={MARQUEE_OUTPUT}>
              <div
                ref={(el) => {
                  els.current.glow = el ?? undefined;
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: MARQUEE_GLOW,
                  opacity: 0,
                  willChange: "opacity, transform",
                }}
              />
              <canvas
                height={Math.round(card.height * card.ratio)}
                ref={(el) => {
                  els.current.canvas = el ?? undefined;
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  willChange: "opacity, filter",
                }}
                width={Math.round(card.width * card.ratio)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
