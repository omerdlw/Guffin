"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "@omerdlw/base-framework/tokens";
import { CURVE, elapsed } from "../curve";
import { PHI, clamp, haze, step } from "../ladder";
import { useAnyStage, useEngine, usePartOf, useScrollDriver } from "../react";
import { PATIENCE } from "../stage";
import { Value } from "../value";

// A title card: before the page plays, its name stands alone in the middle of
// the room, and the picture the page is about shows through the letters. The
// card holds the curtain; when the curtain rises the camera dives into the
// name, the letters open up around it and pass, and the picture they were
// cut from is the page's own, developing behind them.
//
// The picture inside the letters is the page's picture, in the page's own
// frame and with the page's own edges, so when the letters have gone by there
// is no seam: what was seen through them is what the backdrop becomes.
//
// The whole card is one canvas, painted in one pass per frame: the letters,
// the picture cut to them, the rim of light and the page's edges. Nothing is
// clipped, masked or blurred by the browser's own layers while it moves (each
// of those is a window-sized surface painted again every frame); the browser
// only fades and softens the finished canvas.
//
// Time is the engine's. The card's own life before the curtain (it develops,
// then rests) is two rungs; after it, the part's arrival is the dive: it is
// taken back to time (as `Bloom` does) and the dive, the spread of the letters
// and their fade are windows of it. The card is cast in `plate`, with
// `enter: "still"`, and the opening gives it a beat of its own with a rest
// after it, taken only while the card is on stage (`rest: n, with: part`).

// The card develops out of focus, then rests: both on the ladder.
const DEVELOP_RUNG = 2;
const REST_RUNG = 1;

// How long the curtain waits for the card, from the stage's start: the
// picture's patience, then the card's life. Beyond it the page opens without.
export const marqueeHold = (tempo = 0) =>
  step(DEVELOP_RUNG + tempo) + step(REST_RUNG + tempo);
export const marqueePatience = (tempo = 0) => PATIENCE + marqueeHold(tempo);

// Where each plays in the part's arrival, as shares of it (0 → 1).
const DIVE = [0.04, 0.6] as const;
const EDGES = [0, 0.4] as const;
const SPREAD = [0.02, 0.58] as const;
const FADE = [0.3, 0.66] as const;
const GLARE = [0.18, 0.62] as const;

// The dive's reach, in times the name's own size, never less than DIVE_MIN.
// The camera drifts a little closer while the card rests.
const DIVE_REACH = 2.6;
const DIVE_MIN = 10;
const DIVE_MAX = 40;
const DRIFT = 0.035;

// Tracking, in em: loose as the card comes into focus, settled while it
// rests, and wide as the letters open.
const TRACK_REST = 0.03;
const TRACK_FOCUS = 0.07;
const TRACK_OPEN = 0.46;

// The picture inside the letters follows the hand, against it, a little.
const SLIP = 12;

// How big the name is allowed to be: its share of the width and of the
// height, and the most lines it may be set in.
const MEASURE = 0.78;
const MEASURE_NARROW = 0.9;
const NARROW = 640;
const HEIGHT = 0.46;
const SIZE = 0.36;
const LEADING = 0.94;
const LINES = 3;
const REFERENCE = 100;

// How far the name may come to the edge of the picture it is cut from.
const MARGIN = 0.06;

// The card is painted at the screen's density, never finer than this.
const DENSITY = 2;

// The room's light, from the picture's own colours (the ambient module's):
// a light of its own hue along the edge of the letters and behind them, and a
// middle tone the letters are brought a little toward, so that where the
// picture is pure white or black the name is still seen to be cut from it.
const RIM = "--ambient-vibrant-90";
const WASH = "--ambient-dominant-70";
const RIM_LEVEL = 0.55;
const WASH_LEVEL = 0.18;
const GLOW = `radial-gradient(58% 46% at 50% 48%, color-mix(in oklch, var(--ambient-vibrant-70, white) 24%, transparent), transparent 72%)`;

// The light is read from the page this often, not every frame.
const LIGHT_EVERY = 250;

// Under the dock's own layers.
const LAYER = Z_INDEX.DOCK_BACKDROP - 20;

const within = (progress: number, [from, to]: readonly [number, number]) =>
  clamp((progress - from) / (to - from), 0, 1);

// While the card stands it is the only thing in the room: the page behind it
// is not there to be pointed at, pressed or selected, so the layer takes the
// hand (the dock is above it). Wheel and keys still reach the page.
const OUTPUT: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: LAYER,
  userSelect: "none",
  WebkitUserSelect: "none",
};

interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

// How much of the picture the page's edges cover, as (position %, cover %).
export interface Edges {
  side: readonly (readonly [number, number])[];
  bottom: readonly (readonly [number, number])[];
}

interface Letter {
  char: string;
  // Where its left edge is, from the middle of its line.
  x: number;
}

interface Line {
  letters: Letter[];
  baseline: number;
}

interface Card {
  lines: Line[];
  size: number;
  font: string;
  // The middle of the name: what the camera dives into.
  x: number;
  y: number;
  // The viewport the card was set for, and the picture in the page's frame.
  width: number;
  height: number;
  ratio: number;
  frame: Frame;
  picture: Frame;
  image: HTMLImageElement;
}

// The least widest line when the words are broken into `count` lines.
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

function setName(
  text: string,
  family: string,
  width: number,
  height: number,
  [top, bottom]: readonly [number, number],
) {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return null;
  context.font = `700 ${REFERENCE}px ${family}`;
  const track = TRACK_REST * REFERENCE;
  const measure = (word: string) =>
    context.measureText(word).width + word.length * track;
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const widths = words.map(measure);
  const gap = measure(" ");
  const cap = context.measureText("H").actualBoundingBoxAscent / REFERENCE;

  const target = width * (width < NARROW ? MEASURE_NARROW : MEASURE);
  // The name lies on the picture, so it is never taller than the picture is.
  const room = Math.min(height * HEIGHT, (bottom - top) * (1 - 2 * MARGIN));
  let best: { size: number; lines: string[] } | null = null;
  for (let count = 1; count <= Math.min(LINES, words.length); count++) {
    const { breaks, width: widest } = balance(widths, gap, count);
    const size = Math.min(
      (target / widest) * REFERENCE,
      height * SIZE,
      room / (count * LEADING),
    );
    // Another line is worth it only when the name gets clearly larger.
    if (best && size < best.size * 1.15) continue;
    best = {
      size,
      lines: breaks.map((from, i) =>
        words.slice(from, breaks[i + 1] ?? words.length).join(" "),
      ),
    };
  }
  if (!best) return null;

  const pitch = best.size * LEADING;
  // The middle of the window, brought up only as far as the picture needs.
  const block = (best.lines.length - 1) * pitch + cap * best.size;
  const margin = (bottom - top) * MARGIN;
  const low = top + margin + block / 2;
  const high = bottom - margin - block / 2;
  const y = low > high ? (top + bottom) / 2 : clamp(height * 0.485, low, high);
  const first = y - ((best.lines.length - 1) * pitch) / 2;

  // Each letter on its own, so the tracking can open: where a letter starts is
  // what the line measures up to its end, less the letter, kerning included.
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

function pictureIn(
  frame: Frame,
  image: { width: number; height: number },
  [fx, fy]: readonly [number, number],
): Frame {
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

// The page's edges as gradients over the picture's frame, to take the
// picture away with: they cover what the page's own mask hides.
function coverOf(
  context: CanvasRenderingContext2D,
  frame: Frame,
  edges: Edges,
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

const readLight = () => {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) => style.getPropertyValue(name).trim() || "#fff";
  return { rim: color(RIM), wash: color(WASH) };
};

export interface MarqueeProps {
  part: string;
  text: string;
  // The picture. Only shown, never read back, so a light copy of the page's
  // own will do: it is never larger on the card than the screen is.
  src: string;
  // Where the page's backdrop rests on its picture (0 → 1), as `position`.
  focus?: readonly [number, number];
  // How the page's own mask covers the picture's edges: the card shows the
  // picture whole and takes those edges as it dives.
  edges: Edges;
  // The page's backdrop: the card sits in its frame, found next to the card.
  target?: string;
  // Whether the room is quiet: the page has put its own picture up, which is
  // the heaviest thing it does. The card waits for it to stand, so that nothing
  // it shows is dropped by that work.
  quiet?: boolean;
  // The display face, as the page's title is set.
  className?: string;
}

export function Marquee({
  part,
  text,
  src,
  focus = [0.5, 0.2],
  edges,
  target = "[data-cursor-stage]",
  quiet = true,
  className,
}: MarqueeProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const driver = useScrollDriver();
  const host = useRef<HTMLElement | null>(null);
  const [skipped, skip] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [held, hold] = useState(false);
  const [gone, setGone] = useState(false);

  const live = useRef({ enter: 0, leave: 0, gone: false });
  const els = useRef<{
    glow?: HTMLElement;
    canvas?: HTMLCanvasElement;
  }>({});
  const [values] = useState(() => ({
    lit: new Value(engine.clock),
    drift: new Value(engine.clock),
    rest: new Value(engine.clock),
    x: new Value(engine.clock, 0, 0.01),
    y: new Value(engine.clock, 0, 0.01),
  }));
  const card$ = useRef<Card | null>(null);
  const draw$ = useRef<() => void>(() => {});
  const edges$ = useRef(edges);

  useEffect(() => {
    edges$.current = edges;
  });

  const props = usePartOf(stage, part, {
    css: false,
    patience: marqueePatience(stage.tempo),
    ready: held,
    render: (_look, state) => {
      live.current.enter = state.enter;
      live.current.leave = state.leave;
      draw$.current();
    },
  });
  const attach = props.ref;
  const ref = useCallback(
    (el: HTMLElement | null) => {
      host.current = el;
      return attach(el);
    },
    [attach],
  );

  // Whether there is a card at all: not under reduced motion. (No picture, no
  // card: see below.)
  useEffect(() => {
    if (engine.reduced.get()) skip(true);
  }, [engine]);

  // A page opens at its top. Most are opened from far down another page, and
  // the browser has not yet taken the new page back up when this one mounts
  // (nor, on a reload, has it let go of the old place), so the card holds the
  // page at its top until a hand takes it: any scroll the page makes by
  // itself before then is put back.
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

  // The name, set for the window and the picture laid in the backdrop's frame.
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
        ratio: Math.min(window.devicePixelRatio || 1, DENSITY),
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
      // Decoded before the card is shown, so its first frame is not the
      // frame that pays for it.
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
    // A picture that does not come is not waited for.
    const patience = setTimeout(() => {
      if (alive && !ready) skip(true);
    }, PATIENCE * 1000);
    const unwatch = engine.viewport.subscribe(measure);
    return () => {
      alive = false;
      clearTimeout(patience);
      unwatch();
      image.onload = image.onerror = null;
    };
  }, [engine, skipped, src, text, focus, target]);

  // The card's life before the curtain: it develops, rests, and then the
  // curtain may rise. A hand on the page ends the rest.
  useEffect(() => {
    if (skipped || !card || !quiet || held) return;
    let alive = true;
    const quick = () => {
      if (alive) hold(true);
    };
    const events = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    for (const type of events) addEventListener(type, quick, { passive: true });

    const tempo = stage.tempo;
    void values.drift.to(1, {
      tween: step(5 + tempo),
      curve: CURVE.linear,
    });
    void (async () => {
      const developed = await values.lit.to(1, {
        tween: step(DEVELOP_RUNG + tempo),
        curve: CURVE.silk,
      });
      if (!developed || !alive) return;
      const rested = await values.rest.to(1, {
        tween: step(REST_RUNG + tempo),
        curve: CURVE.linear,
      });
      if (rested && alive) hold(true);
    })();
    return () => {
      alive = false;
      for (const type of events) removeEventListener(type, quick);
    };
  }, [skipped, card, quiet, held, stage, values]);

  // A hand before the card has even stood: no card.
  useEffect(() => {
    if (skipped || (card && quiet)) return;
    const quick = () => skip(true);
    const events = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
    for (const type of events) addEventListener(type, quick, { passive: true });
    return () => {
      for (const type of events) removeEventListener(type, quick);
    };
  }, [skipped, card, quiet]);

  // The picture slips against the hand.
  useEffect(() => {
    if (!card || gone) return;
    const spring = { period: step(1), damping: 1, mass: 1 };
    const follow = () => {
      const hand = engine.pointer.get();
      void values.x.to(hand.active ? hand.x : 0, { spring });
      void values.y.to(hand.active ? hand.y : 0, { spring });
    };
    follow();
    return engine.pointer.subscribe(follow);
  }, [engine, card, gone, values]);

  // Everything the card shows, drawn from the card's own life and the part's.
  useEffect(() => {
    let queued = false;
    let context: CanvasRenderingContext2D | null = null;
    let surface: HTMLCanvasElement | null = null;
    let cover: ReturnType<typeof coverOf> | null = null;
    let covered: Card | null = null;
    let light = { rim: "#fff", wash: "#fff" };
    let sampled = -Infinity;

    const draw = () => {
      queued = false;
      const set = card$.current;
      const { glow, canvas } = els.current;
      if (!set || !glow || !canvas) return;
      if (canvas !== surface) {
        surface = canvas;
        context = canvas.getContext("2d");
        covered = null;
      }
      if (!context) return;
      if (covered !== set) {
        covered = set;
        cover = coverOf(context, set.frame, edges$.current);
      }

      const { enter, leave } = live.current;
      const u = enter <= 0 ? 0 : enter >= 1 ? 1 : elapsed(CURVE.pour, enter);
      const developed = values.lit.current;
      const dive = CURVE.dolly(within(u, DIVE));
      const open = CURVE.silk(within(u, SPREAD));
      const away = CURVE.fade(within(u, FADE));
      const glare = Math.sin(Math.PI * within(u, GLARE));
      const edge = CURVE.silk(within(u, EDGES));

      const reach = clamp(
        (DIVE_REACH * set.height) / set.size,
        DIVE_MIN,
        DIVE_MAX,
      );
      const scale = (1 + DRIFT * values.drift.current) * reach ** dive;
      const track =
        (TRACK_REST + TRACK_FOCUS * (1 - developed) + TRACK_OPEN * open) *
        set.size;

      // The backdrop is arriving on the same clock, in `plate`, with the
      // `develop` verb: dark, soft and a little large. As the letters go the
      // picture in them takes on exactly that, so the one is handed to the
      // other without the picture leaving focus on its way.
      const left = 1 - clamp(enter, 0, 1);
      const dark = 1 - left * (1 - PHI ** -3);
      const size = 1 + left * PHI ** -2;
      const settle = 1 + (size - 1) * away;
      const slip = 1 - dive;
      const { frame, picture } = set;

      const now = performance.now();
      if (now - sampled > LIGHT_EVERY) {
        light = readLight();
        sampled = now;
      }

      const ratio = set.ratio;
      const c = context;
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      c.clearRect(0, 0, set.width, set.height);
      c.font = set.font;
      c.textBaseline = "alphabetic";
      c.textAlign = "left";

      // What the camera dives into: the middle of the name.
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

      // The letters, then the picture only where they are.
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
        -values.x.current * SLIP * slip,
        -values.y.current * SLIP * slip,
      );
      c.translate(mx, my);
      c.scale(settle, settle);
      c.translate(-mx, -my);
      c.drawImage(
        set.image,
        picture.left,
        picture.top,
        picture.width,
        picture.height,
      );
      c.restore();

      // The letters toward the room's middle tone, while they stand: what the
      // dive hands over is the picture as it is.
      const wash = WASH_LEVEL * (1 - dive);
      if (wash > 0.002) {
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha = wash;
        c.fillStyle = light.wash;
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.globalAlpha = 1;
      }

      // The room's light along the letters' edge, inside the picture's frame.
      c.globalCompositeOperation = "source-over";
      c.save();
      c.beginPath();
      c.rect(frame.left, frame.top, frame.width, frame.height);
      c.clip();
      zoom();
      c.lineWidth = 1 / scale;
      c.lineJoin = "round";
      c.strokeStyle = light.rim;
      c.globalAlpha = RIM_LEVEL;
      letters((char, x, y) => c.strokeText(char, x, y));
      c.restore();

      // The page's own edges, as the card takes them on.
      if (edge > 0.001 && cover) {
        c.globalCompositeOperation = "destination-out";
        c.globalAlpha = edge;
        c.fillStyle = cover.across;
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.fillStyle = cover.down;
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      }

      const present = (1 - away) * (1 - leave);
      const soft =
        (1 - developed) * haze(4) +
        dive * haze(3) * (1 - away) +
        left * haze(6) * away;
      const level = (1 + glare * 0.4) * (1 - away * (1 - dark));
      canvas.style.opacity = (developed * present).toFixed(3);
      canvas.style.filter =
        soft > 0.2 || glare > 0.01
          ? `blur(${soft.toFixed(2)}px) brightness(${level.toFixed(3)})`
          : "";
      glow.style.opacity = (
        0.9 *
        developed *
        (1 - CURVE.silk(within(u, [0, 0.5]))) *
        (1 - leave)
      ).toFixed(3);
      glow.style.transform = `scale(${(1 + dive * 1.6).toFixed(3)})`;

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
    const stops = [values.lit, values.drift, values.x, values.y].map((value) =>
      value.subscribe(() => draw$.current()),
    );
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
      <div
        {...props}
        aria-hidden="true"
        className={className}
        hidden
        ref={ref}
      />
      {shown
        ? createPortal(
            <div aria-hidden="true" style={OUTPUT}>
              <div
                ref={(el) => {
                  els.current.glow = el ?? undefined;
                }}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: GLOW,
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
