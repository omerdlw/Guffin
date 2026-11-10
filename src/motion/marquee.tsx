"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MARQUEE_DENSITY,
  MARQUEE_DEVELOP_RUNG,
  MARQUEE_DIVE,
  MARQUEE_DIVE_MAX,
  MARQUEE_DIVE_MIN,
  MARQUEE_DIVE_REACH,
  MARQUEE_DRIFT,
  MARQUEE_EDGES,
  MARQUEE_FADE,
  MARQUEE_GLARE,
  MARQUEE_GLARE_GAIN,
  MARQUEE_GLOW,
  MARQUEE_HEIGHT,
  MARQUEE_LEADING,
  MARQUEE_LIGHT_EVERY,
  MARQUEE_LINES,
  MARQUEE_MARGIN,
  MARQUEE_MEASURE,
  MARQUEE_MEASURE_NARROW,
  MARQUEE_NARROW,
  MARQUEE_OUTPUT,
  MARQUEE_REFERENCE,
  MARQUEE_REST_RUNG,
  MARQUEE_RIM,
  MARQUEE_RIM_LEVEL,
  MARQUEE_SIZE,
  MARQUEE_SLIP,
  MARQUEE_SPREAD,
  MARQUEE_TRACK_FOCUS,
  MARQUEE_TRACK_OPEN,
  MARQUEE_TRACK_REST,
  MARQUEE_UNSEEN,
  MARQUEE_WASH,
  MARQUEE_WASH_LEVEL,
  PHI,
} from "./constants";
import { Value } from "./engine";
import { passageOf } from "./passage";
import { useAnyStage, useEngine, usePartOf, useScrollDriver } from "./react";
import { PATIENCE } from "./stage";
import { CURVE } from "./time";
import type { MarqueeCard, MarqueeProps } from "./types";
import {
  balance,
  clamp,
  coverOf,
  elapsed,
  marqueeHold,
  pictureIn,
  step,
  within,
} from "./utils";
export const marqueePatience = (tempo = 0) => PATIENCE + marqueeHold(tempo);

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
  const [card, setCard] = useState<MarqueeCard | null>(null);
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
  const card$ = useRef<MarqueeCard | null>(null);
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

  useEffect(() => {
    if (engine.reduced.get()) skip(true);
  }, [engine]);

  useEffect(() => {
    if (!skipped) passageOf(engine).keep();
  }, [engine, skipped]);

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
    }, PATIENCE * 1000);
    const unwatch = engine.viewport.subscribe(measure);
    return () => {
      alive = false;
      clearTimeout(patience);
      unwatch();
      image.onload = image.onerror = null;
    };
  }, [engine, skipped, src, text, focus, target]);

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
        tween: step(MARQUEE_DEVELOP_RUNG + tempo),
        curve: CURVE.silk,
      });
      if (!developed || !alive) return;
      const rested = await values.rest.to(1, {
        tween: step(MARQUEE_REST_RUNG + tempo),
        curve: CURVE.linear,
      });
      if (rested && alive) hold(true);
    })();
    return () => {
      alive = false;
      for (const type of events) removeEventListener(type, quick);
    };
  }, [skipped, card, quiet, held, stage, values]);

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
    const spring = { period: step(1), damping: 1, mass: 1 };
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
    let surface: HTMLCanvasElement | null = null;
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
      const dive = CURVE.glide(within(u, MARQUEE_DIVE));
      const open = CURVE.silk(within(u, MARQUEE_SPREAD));
      const away = CURVE.fade(within(u, MARQUEE_FADE));
      const glare = Math.sin(Math.PI * within(u, MARQUEE_GLARE));
      const edge = CURVE.silk(within(u, MARQUEE_EDGES));

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
      const { frame, picture } = set;

      const present = (1 - away) * (1 - leave);
      const alpha = developed * present;
      glow.style.opacity = (
        0.9 *
        developed *
        (1 - CURVE.silk(within(u, [0, 0.5]))) *
        (1 - leave)
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
      c.drawImage(
        set.image,
        picture.left,
        picture.top,
        picture.width,
        picture.height,
      );
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
      const rim = MARQUEE_RIM_LEVEL * (1 - dive);
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
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.fillStyle = cover.down;
        c.fillRect(frame.left, frame.top, frame.width, frame.height);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      }

      const level = (1 + glare * 0.4) * (1 - away * (1 - dark));
      if (Math.abs(level - 1) > 0.005) {
        c.globalCompositeOperation = "source-atop";
        c.globalAlpha =
          level < 1 ? 1 - level : Math.min(1, (level - 1) * MARQUEE_GLARE_GAIN);
        c.fillStyle = level < 1 ? "#000" : "#fff";
        c.fillRect(0, 0, set.width, set.height);
        c.globalAlpha = 1;
        c.globalCompositeOperation = "source-over";
      }
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
