"use client";

import {
  type ElementType,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { preload } from "react-dom";
import { clearMask, setMask, topOf } from "./dom";
import { Signal, Value } from "./engine";
import { clamp, PHI } from "./math";
import {
  OwnedScope,
  ScopeGeneration,
  ScopeProvider,
  useAnyStage,
  useEngine,
  usePartOf,
  useScope,
  useSectionOf,
} from "./react";
import { letters, words } from "./render";
import { childScope } from "./stage";
import { CURVE, elapsed, reach, step } from "./time";

export interface CountProps {
  part: string;
  value: number;
  format: (value: number) => string;
  index?: number;
  className?: string;
  hover?: boolean;
}

export interface DeckProps<K extends string> {
  views: Record<K, ReactNode>;
  shown: K;
  cue?: string;
  className?: string;
  viewClassName?: string;
  onSwitch?: (view: K) => void;
}

type ProgressWindow = readonly [from: number, to: number];

export interface HeaderProps {
  part: string;
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  nameClassName?: string;
  progress?: number;
}

interface RoomProps {
  black?: boolean;
  grain?: boolean;
  grainClassName?: string;
}

export interface SwapProps {
  id: string;
  cue: string;
  as?: ElementType;
  className?: string;
  now?: boolean;
  intro?: string;
  children: ReactNode;
}

const KIT_RECOUNT_RUNG = 1;

const KIT_LAMP = [0, 0.3] as const;

const KIT_NAME = [0.1, 0.65] as const;

const KIT_RULE = [0.3, 0.85] as const;

const KIT_ACTIONS = [0.5, 1] as const;

const KIT_WIPE = [0.25, 0.85] as const;

const KIT_WIPE_EDGE = 32;

const KIT_ROOM = "0.5rem";

const KIT_LETTER_SHARE = 0.45;

const KIT_ACTION_SHARE = 0.5;

const KIT_TAKES_A_HAND =
  'button, a[href], [role="tab"], [role="combobox"], [role="switch"]';

const KIT_WASH = [
  "radial-gradient(70% 55% at 22% 38%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-a), transparent), transparent 70%)",
  "radial-gradient(60% 50% at 88% 92%, color-mix(in oklch, var(--tint, transparent) var(--wash-tint-b), transparent), transparent 70%)",
  "radial-gradient(65% 50% at 15% 0%, color-mix(in oklab, var(--ambient-top, transparent) var(--wash-top), transparent), transparent 72%)",
  "radial-gradient(60% 55% at 100% 20%, color-mix(in oklab, var(--ambient-right, transparent) var(--wash-right), transparent), transparent 72%)",
  "radial-gradient(70% 50% at 0% 100%, color-mix(in oklab, var(--ambient-left, transparent) var(--wash-left), transparent), transparent 72%)",
  "radial-gradient(60% 45% at 85% 100%, color-mix(in oklab, var(--ambient-bottom, transparent) var(--wash-bottom), transparent), transparent 72%)",
].join(", ");

const KIT_SHEEN =
  "radial-gradient(60% 45% at 16% 0%, rgb(255 255 255 / var(--sheen-a)), transparent 70%)";

const KIT_GLASS = [
  "radial-gradient(ellipse 125% 105% at 50% 45%, transparent 60%, rgb(var(--vignette-rgb) / var(--vignette-a)))",
  "linear-gradient(to right, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 6%, transparent 94%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
  "linear-gradient(to bottom, rgb(var(--vignette-rgb) / var(--vignette-edge)), transparent 8%, transparent 92%, rgb(var(--vignette-rgb) / var(--vignette-edge)))",
].join(", ");

const KIT_HOUSE_LEVEL = 1 / PHI;

const KIT_HOUSE_RUNG = 1;

const KIT_GRAIN_TILE = "/grain.png";

const KIT_TILE = 512;

const KIT_SETTLE_RUNG = 1;

const withinWindow = (progress: number, [from, to]: ProgressWindow) =>
  clamp((progress - from) / (to - from), 0, 1);

function staggered(
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

function wipe(host: HTMLElement, reached: number) {
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

function handsOf(host: HTMLElement) {
  const found = Array.from(
    host.querySelectorAll<HTMLElement>(KIT_TAKES_A_HAND),
  );
  const own = found.filter(
    (el) => !found.some((other) => other !== el && other.contains(el)),
  );
  return own.length > 0 ? own : [host];
}

const house = new Signal(0);

export const houseDown = () => house.get() > 0;

function show(): () => void {
  house.set(house.get() + 1);
  let shown = true;
  return () => {
    if (!shown) return;
    shown = false;
    house.set(house.get() - 1);
  };
}

export function Count({
  part,
  value,
  format,
  index,
  className,
  hover = false,
}: CountProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const text = useRef<HTMLSpanElement>(null);
  const arrived = useRef(0);
  const again = useRef<Value | null>(null);

  const draw = () => {
    const replay = again.current?.moving ? again.current.current : 1;
    const shown = Math.round(value * Math.min(arrived.current, replay));
    if (text.current) text.current.textContent = format(shown);
  };

  const props = usePartOf(stage, part, {
    index,
    css: true,
    render: (_look, state) => {
      arrived.current = state.quiet ? 1 : state.enter;
      draw();
    },
  });

  const recount = () => {
    if (!hover || arrived.current < 1 || engine.reduced.get()) return;
    const replay = (again.current ??= new Value(engine.clock));
    if (replay.moving) return;
    replay.set(0);
    const stop = replay.subscribe(draw);
    void replay
      .to(1, { tween: step(KIT_RECOUNT_RUNG), curve: CURVE.expo })
      .then(() => {
        stop();
        draw();
      });
  };

  return (
    <span
      {...props}
      className={className}
      onPointerEnter={hover ? recount : undefined}
    >
      <span ref={text}>{format(value)}</span>
    </span>
  );
}

export function Deck<K extends string>({
  views,
  shown,
  cue,
  className,
  viewClassName,
  onSwitch,
}: DeckProps<K>) {
  const stage = useAnyStage();
  const base = childScope(useScope(), useId());
  const [visible, setVisible] = useState(shown);
  const [first] = useState(shown);
  const [generations, setGenerations] = useState<Partial<Record<K, number>>>(
    {},
  );
  const switching = useRef(false);
  const last = useRef(shown);
  const wanted = useRef(shown);
  const latest = useRef(onSwitch);

  useEffect(() => {
    wanted.current = shown;
    latest.current = onSwitch;
  });

  const scopeOf = (view: K) => `${base}${view}`;

  useEffect(() => {
    if (shown === visible || switching.current) return;
    switching.current = true;
    void stage.dismiss(scopeOf(visible)).then(() => {
      switching.current = false;
      setVisible(wanted.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per cue; stage is stable per mount
  }, [shown, visible]);

  useLayoutEffect(() => {
    if (last.current === visible) return;
    last.current = visible;
    latest.current?.(visible);
    if (cue) {
      stage.recue(cue, scopeOf(visible));
      return;
    }
    stage.reset(scopeOf(visible));
    setGenerations((current) => ({
      ...current,
      [visible]: (current[visible] ?? 0) + 1,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per cue; stage is stable per mount
  }, [visible]);

  const trigger = useSectionOf(stage, cue ?? "", scopeOf(first));
  const keys = Object.keys(views) as K[];

  return (
    <div className={className}>
      {keys.map((key) => (
        <ScopeProvider key={key} value={scopeOf(key)}>
          <OwnedScope value={Boolean(cue)}>
            <ScopeGeneration value={generations[key] ?? 0}>
              <div
                className={viewClassName}
                hidden={key !== visible}
                ref={cue && key === first ? trigger : undefined}
              >
                {views[key]}
              </div>
            </ScopeGeneration>
          </OwnedScope>
        </ScopeProvider>
      ))}
    </div>
  );
}

function come(el: HTMLElement, t: number, rung: number | null, travel: number) {
  if (t >= 1) {
    el.style.removeProperty("opacity");
    el.style.removeProperty("filter");
    el.style.removeProperty("transform");
    return;
  }
  const eased = CURVE.silk(t);
  el.style.opacity = clamp(eased * PHI, 0, 1).toFixed(3);
  if (rung === null) el.style.removeProperty("filter");
  else el.style.filter = "none";
  el.style.transform = `translate3d(0, ${((1 - eased) * travel).toFixed(2)}px, 0)`;
}

export function Header({
  part,
  title,
  icon,
  actions,
  className,
  nameClassName,
  progress,
}: HeaderProps) {
  const stage = useAnyStage();
  const lamp = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  const hands = useRef<HTMLDivElement>(null);

  const play = (progress: number) => {
    if (lamp.current)
      come(lamp.current, withinWindow(progress, KIT_LAMP), 3, reach(-3));

    if (name.current) {
      const spelled =
        name.current.querySelectorAll<HTMLElement>("[data-letter]");
      spelled.forEach((letter, i) =>
        come(
          letter,
          staggered(progress, KIT_NAME, i, spelled.length, KIT_LETTER_SHARE),
          null,
          reach(-3),
        ),
      );
    }

    const drawn = CURVE.silk(withinWindow(progress, KIT_RULE));
    if (line.current)
      line.current.style.transform = `scaleX(${drawn.toFixed(4)})`;
    if (spark.current) {
      spark.current.style.opacity = (
        drawn <= 0 || drawn >= 1 ? 0 : Math.sin(Math.PI * drawn) ** 0.5
      ).toFixed(3);
      spark.current.style.transform = `translateX(${(drawn * 100).toFixed(3)}%)`;
    }

    const host = hands.current;
    if (host) {
      wipe(
        host,
        CURVE.glide(withinWindow(elapsed(CURVE.silk, progress), KIT_WIPE)),
      );
      const pieces = handsOf(host);
      pieces.forEach((piece, i) =>
        come(
          piece,
          staggered(progress, KIT_ACTIONS, i, pieces.length, KIT_ACTION_SHARE),
          2,
          reach(-3),
        ),
      );
    }
  };

  const props = usePartOf(stage, part, {
    css: true,
    render: (_look, state) => {
      play(state.quiet ? (state.enter > 0 ? 1 : 0) : state.enter);
    },
  });

  const spoken = words(title);
  const meter =
    progress === undefined ? null : Math.max(0, Math.min(1, progress));

  return (
    <div {...props} className={className ?? "relative z-10 mb-4"}>
      <div className="flex min-h-8 w-full items-center gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          {icon ? (
            <span
              className="flex shrink-0"
              data-print=""
              ref={lamp}
              style={{ color: "var(--light, currentColor)", opacity: 0 }}
            >
              {icon}
            </span>
          ) : null}
          <h2
            aria-label={title}
            className={nameClassName}
            ref={name}
            style={{ position: "relative" }}
          >
            {spoken.map((word, i) => (
              <span aria-hidden="true" key={i}>
                <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                  {letters(word).map((letter, j) => (
                    <span
                      data-letter=""
                      data-print=""
                      key={j}
                      style={{ display: "inline-block", opacity: 0 }}
                    >
                      {letter}
                    </span>
                  ))}
                </span>
                {i < spoken.length - 1 ? " " : null}
              </span>
            ))}
          </h2>
        </div>
        <div
          aria-hidden={meter === null ? "true" : undefined}
          aria-valuemax={meter === null ? undefined : 100}
          aria-valuemin={meter === null ? undefined : 0}
          aria-valuenow={meter === null ? undefined : Math.round(meter * 100)}
          className="relative h-2 min-w-6 flex-1"
          role={meter === null ? undefined : "progressbar"}
        >
          <div
            className={
              meter === null
                ? "absolute inset-x-0 top-1/2 h-px"
                : "absolute inset-x-0 top-1/2 h-1 -translate-y-1/2"
            }
          >
            <div
              className={
                meter === null
                  ? "absolute inset-0 origin-left"
                  : "absolute inset-0 origin-left overflow-hidden rounded-full"
              }
              data-print=""
              ref={line}
              style={{
                transform: "scaleX(0)",
                background:
                  "color-mix(in oklch, var(--light, #fcfcfb) 20%, transparent)",
              }}
            >
              {meter === null ? null : (
                <div
                  className="h-full rounded-full transition-[width] duration-settle ease-out-quint"
                  style={{
                    width: `${(meter * 100).toFixed(2)}%`,
                    background:
                      "color-mix(in oklch, var(--light, #fcfcfb) 75%, transparent)",
                  }}
                />
              )}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-full"
              ref={spark}
              style={{ opacity: 0 }}
            >
              <span
                className="absolute -top-px right-full h-[3px] w-16"
                style={{
                  background:
                    "linear-gradient(to right, transparent, color-mix(in oklch, var(--light, #fcfcfb) 90%, transparent))",
                }}
              />
            </div>
          </div>
        </div>
        {actions ? (
          <div
            className="min-w-0"
            data-print=""
            ref={hands}
            style={{ margin: `-${KIT_ROOM}`, opacity: 0, padding: KIT_ROOM }}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function useHouseDown() {
  return useSyncExternalStore(house.subscribe, houseDown, () => false);
}

export function useShowing(on = true) {
  useEffect(() => (on ? show() : undefined), [on]);
}

function HouseLights() {
  const engine = useEngine();
  const veil = useRef<HTMLDivElement>(null);
  const down = useHouseDown();
  const level = useRef<Value | null>(null);

  useEffect(() => {
    const el = veil.current;
    if (!el) return;
    const value = (level.current ??= new Value(engine.clock));
    const stop = value.subscribe((v) => {
      el.style.opacity = v.toFixed(3);
    });
    void value.to(down ? KIT_HOUSE_LEVEL : 0, {
      tween: engine.reduced.get() ? 0 : step(KIT_HOUSE_RUNG),
      curve: CURVE.silk,
    });
    return stop;
  }, [down, engine]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 bg-page"
      ref={veil}
      style={{ opacity: 0 }}
    />
  );
}

function Grain({ className }: { className?: string }) {
  preload(KIT_GRAIN_TILE, { as: "image", fetchPriority: "high" });

  return (
    <div
      aria-hidden="true"
      className={className ?? "pointer-events-none fixed inset-0 z-0 size-full"}
      style={{
        backgroundImage: `url(${KIT_GRAIN_TILE})`,
        backgroundSize: `${KIT_TILE / 2}px`,
      }}
    />
  );
}

export function Room({
  black = false,
  grain = true,
  grainClassName,
}: RoomProps) {
  return (
    <>
      {black ? null : (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: KIT_WASH, opacity: "var(--tint-presence, 0)" }}
        />
      )}
      {black || !grain ? null : <Grain className={grainClassName} />}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
        style={{ background: black ? KIT_GLASS : `${KIT_SHEEN}, ${KIT_GLASS}` }}
      />
      <HouseLights />
    </>
  );
}

export function Swap({
  id,
  cue,
  as: Tag = "div",
  className,
  now = false,
  intro,
  children,
}: SwapProps) {
  const stage = useAnyStage();
  const engine = useEngine();
  const base = childScope(useScope(), useId());
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ id, scope: `${base}0` });
  const [held, setHeld] = useState<ReactNode>(children);
  const swapping = useRef(false);
  const latest = useRef({ id, children });
  const turns = useRef(0);
  const settle = useRef<Value | null>(null);
  const first = `${base}0`;
  const placed = () => (box.current ? topOf(box.current) : undefined);

  useEffect(() => {
    latest.current = { id, children };
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps -- syncs held content after every render; guarded
  useLayoutEffect(() => {
    if (id === shown.id && held !== children) setHeld(children);
  });

  useEffect(() => {
    if (id === shown.id || swapping.current) return;
    swapping.current = true;
    const el = box.current;
    if (el) {
      el.style.height = `${el.offsetHeight}px`;
      el.style.overflow = "clip";
    }
    void stage.dismiss(shown.scope).then(() => {
      turns.current += 1;
      swapping.current = false;
      setShown({ id: latest.current.id, scope: `${base}${turns.current}` });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per shown item; stage is stable per mount
  }, [id, shown.id]);

  useLayoutEffect(() => {
    if (shown.scope === first) {
      if (now && !intro) stage.cue(cue, first, placed());
      return;
    }
    stage.cue(cue, shown.scope);
    const el = box.current;
    if (!el) return;
    const from = el.offsetHeight;
    el.style.height = "";
    const to = el.offsetHeight;
    el.style.height = `${from}px`;
    const height = (settle.current ??= new Value(engine.clock));
    height.set(from);
    const stop = height.subscribe((h) => {
      el.style.height = `${h}px`;
    });
    void height
      .to(to, {
        tween: engine.reduced.get() ? 0 : step(KIT_SETTLE_RUNG + stage.tempo),
        curve: CURVE.silk,
      })
      .then(() => {
        stop();
        el.style.height = "";
        el.style.overflow = "";
      });
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount, like the cue it plays
  }, [shown.scope]);

  useEffect(() => {
    if (now && intro) stage.cue(intro, first, placed());
  }, [now, intro, stage, first]);

  const trigger = useSectionOf(
    stage,
    intro && shown.scope === first ? intro : cue,
    shown.scope,
  );
  const content = id === shown.id ? children : held;

  return (
    <div ref={box}>
      <ScopeProvider value={shown.scope}>
        <OwnedScope value>
          <Tag className={className} key={shown.scope} ref={trigger}>
            {content}
          </Tag>
        </OwnedScope>
      </ScopeProvider>
    </div>
  );
}
