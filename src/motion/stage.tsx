"use client";

import {
  createContext,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type StageLight, useStageLight } from "@/design/ambient";
import {
  type Choreography,
  compile,
  type Curve,
  paced,
  type TextMoves,
  LEAVING,
} from "./choreo";
import { useScrollDriver } from "./react";
import type { ScrollFeel } from "./scroll";

interface StageRoles<P extends string, S extends string> {
  parts: readonly P[];
  sections?: readonly S[];
  scope?: string;
  motion?: Choreography<P, S>;
  scroll?: ScrollFeel;
  glide?: Glide;
  opening?: number;
  inset?: number;
  tempo?: number;
  reach?: number;
}

interface Glide {
  duration: number;
  ease: Curve;
}

const GlideContext = createContext<Glide | null>(null);

export const useGlide = () => useContext(GlideContext);

const TextContext = createContext<
  Partial<Record<string, TextMoves | undefined>>
>({});

const order = (index: number | undefined): CSSProperties | undefined =>
  index === undefined ? undefined : ({ "--i": index } as CSSProperties);

interface PartProps<P extends string> {
  name: P;
  as?: ElementType;
  className?: string;
  index?: number;
  children?: ReactNode;
}

interface SectionProps<S extends string> {
  cue: S;
  as?: ElementType;
  className?: string;
  now?: boolean;
  children?: ReactNode;
}

interface TextProps<P extends string> {
  part: P;
  text: string;
  index?: number;
  as?: ElementType;
  className?: string;
}

interface HeaderProps<P extends string> {
  part: P;
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  nameClassName?: string;
  progress?: number;
}

interface CountProps<P extends string> {
  part: P;
  value: number;
  format: (value: number) => string;
  index?: number;
  className?: string;
}

interface ExposeProps<P extends string> {
  part: P;
  text: string;
  index?: number;
  as?: ElementType;
  className?: string;
  truncate?: boolean;
}

interface SwapProps<S extends string> {
  id: string;
  cue: S;
  as?: ElementType;
  className?: string;
  now?: boolean;
  intro?: S;
  children: ReactNode;
}

interface DeckProps<K extends string, S extends string> {
  views: Record<K, ReactNode>;
  shown: K;
  cue?: S;
  className?: string;
  viewClassName?: string;
  onSwitch?: (view: K) => void;
}

interface WallStageProps<S extends string> {
  cue: S;
  wall: ReactNode;
  children: ReactNode;
}

type WallPhase = "page" | "wall";

interface WallState {
  phase: WallPhase;
  open: (from?: HTMLElement | null) => void;
  close: () => void;
}

const WALL_RETURN_MARGIN = 24;

const RULE_COLOR = "color-mix(in oklch, var(--grade) 20%, transparent)";

const METER_COLOR = "color-mix(in oklch, var(--grade) 75%, transparent)";

const WallContext = createContext<WallState | null>(null);

export const useWall = () => useContext(WallContext);

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']"));

export function Part({
  name,
  as: Tag = "div",
  className,
  index,
  children,
}: PartProps<string>) {
  return (
    <Tag className={className} data-part={name} style={order(index)}>
      {children}
    </Tag>
  );
}

export function Section({
  cue,
  as: Tag = "section",
  className,
  children,
}: SectionProps<string>) {
  return (
    <Tag className={className} data-section={cue}>
      {children}
    </Tag>
  );
}

function sequence(count: number, moves: TextMoves, seed: string): number[] {
  const order = moves.order ?? "forward";
  const at = Array.from({ length: count }, (_, i) => i);
  if (order === "center") {
    const middle = (count - 1) / 2;
    return at.map((i) => Math.round(Math.abs(i - middle)));
  }
  if (order === "random") {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++)
      hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    const next = () => {
      hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
    };
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [at[i], at[j]] = [at[j]!, at[i]!];
    }
  }
  return at;
}

function units(text: string, moves: TextMoves) {
  const solid = text.split(/\s+/).filter(Boolean);
  return moves.by === "word"
    ? solid.length
    : solid.reduce((sum, word) => sum + [...word].length, 0);
}

const counted = (
  text: string,
  moves: TextMoves | undefined,
  style?: CSSProperties,
): CSSProperties | undefined =>
  moves?.budget
    ? ({ ...style, "--n": units(text, moves) } as CSSProperties)
    : style;

function split(text: string, moves: TextMoves) {
  const words = text.split(/(\s+)/);
  const count = units(text, moves);
  const slot = sequence(count, moves, text);
  let w = 0;
  let c = 0;
  return words.map((word, key) => {
    if (/^\s+$/.test(word)) return word;
    const inner =
      moves.by === "char"
        ? [...word].map((char, at) => (
            <span
              data-c=""
              key={at}
              style={{ "--c": slot[c++] } as CSSProperties}
            >
              {char}
            </span>
          ))
        : word;
    const unit =
      moves.by === "word" ? (
        <span data-w="" style={{ "--w": slot[w++] } as CSSProperties}>
          {inner}
        </span>
      ) : (
        <span className="inline-block whitespace-nowrap">{inner}</span>
      );
    return moves.mask ? (
      <span data-m="" key={key}>
        {unit}
      </span>
    ) : (
      <span className="contents" key={key}>
        {unit}
      </span>
    );
  });
}

function Text({
  part,
  text,
  index,
  as: Tag = "span",
  className,
}: TextProps<string>) {
  const moves = useContext(TextContext)[part];
  if (!moves)
    return (
      <Tag className={className} data-part={part} style={order(index)}>
        {text}
      </Tag>
    );
  return (
    <Tag
      aria-label={text}
      className={className}
      data-part={part}
      style={counted(text, moves, order(index))}
    >
      <span aria-hidden="true">{split(text, moves)}</span>
    </Tag>
  );
}

export function Header({
  part,
  title,
  icon,
  actions,
  className,
  nameClassName,
  progress,
}: HeaderProps<string>) {
  const meter =
    progress === undefined ? null : Math.max(0, Math.min(1, progress));
  const moves = useContext(TextContext)[part];

  return (
    <div className={className ?? "relative z-10 mb-4"} data-part={part}>
      <div className="flex min-h-8 w-full flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          {icon ? (
            <span
              className="flex shrink-0"
              data-slot="icon"
              style={{ color: "var(--grade)" }}
            >
              {icon}
            </span>
          ) : null}
          {moves ? (
            <h2
              aria-label={title}
              className={nameClassName}
              style={counted(title, moves)}
            >
              <span aria-hidden="true">{split(title, moves)}</span>
            </h2>
          ) : (
            <h2 className={nameClassName}>{title}</h2>
          )}
        </div>
        <div
          aria-hidden={meter === null ? "true" : undefined}
          aria-valuemax={meter === null ? undefined : 100}
          aria-valuemin={meter === null ? undefined : 0}
          aria-valuenow={meter === null ? undefined : Math.round(meter * 100)}
          className="relative h-2 min-w-6 flex-1"
          data-slot="rule"
          role={meter === null ? undefined : "progressbar"}
        >
          <div
            className={
              meter === null
                ? "absolute inset-x-0 top-1/2 h-px"
                : "absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full"
            }
            style={{ background: RULE_COLOR }}
          >
            {meter === null ? null : (
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(meter * 100).toFixed(2)}%`,
                  background: METER_COLOR,
                }}
              />
            )}
          </div>
        </div>
        {actions ? (
          <div className="ml-auto min-w-0 max-w-full" data-slot="actions">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Expose({
  part,
  text,
  index,
  as: Tag = "span",
  className,
  truncate = false,
}: ExposeProps<string>) {
  const moves = useContext(TextContext)[part];
  const body = moves ? (
    <span aria-hidden="true">{split(text, moves)}</span>
  ) : (
    text
  );
  return (
    <Tag
      aria-label={moves ? text : undefined}
      className={className}
      data-part={part}
      style={counted(text, moves, {
        ...order(index),
        display: Tag === "span" ? "inline-block" : undefined,
      })}
    >
      {truncate ? <span className="block truncate">{body}</span> : body}
    </Tag>
  );
}

function Count({ part, value, format, index, className }: CountProps<string>) {
  return (
    <Expose
      className={className}
      index={index}
      part={part}
      text={format(value)}
    />
  );
}

const LEAVE_LIMIT_MS = 3000;

function Swap({
  id,
  cue,
  as: Tag = "div",
  className,
  children,
}: SwapProps<string>) {
  const [shown, setShown] = useState(id);
  const box = useRef<HTMLElement>(null);
  const held = useRef(children);

  useLayoutEffect(() => {
    if (id === shown) held.current = children;
  });

  useEffect(() => {
    const element = box.current;
    if (id === shown || !element) return;
    element.setAttribute("data-leaving", "");
    if (
      element.getClientRects().length === 0 ||
      !getComputedStyle(element).animationName.includes(LEAVING)
    ) {
      element.removeAttribute("data-leaving");
      setShown(id);
      return;
    }
    const done = () => setShown(id);
    const end = (event: AnimationEvent) => {
      if (event.target === element && event.animationName.endsWith(LEAVING))
        done();
    };
    element.addEventListener("animationend", end);
    const limit = setTimeout(done, LEAVE_LIMIT_MS);
    return () => {
      element.removeEventListener("animationend", end);
      clearTimeout(limit);
      element.removeAttribute("data-leaving");
    };
  }, [id, shown]);

  return (
    <div>
      <Tag className={className} data-section={cue} key={shown} ref={box}>
        {/* eslint-disable-next-line react-hooks/refs */}
        {id === shown ? children : held.current}
      </Tag>
    </div>
  );
}

function Deck<K extends string>({
  views,
  shown,
  className,
  viewClassName,
  onSwitch,
}: DeckProps<K, string>) {
  const last = useRef(shown);
  const latest = useRef(onSwitch);

  useEffect(() => {
    latest.current = onSwitch;
  });

  useLayoutEffect(() => {
    if (last.current === shown) return;
    last.current = shown;
    latest.current?.(shown);
  }, [shown]);

  return (
    <div className={className}>
      {(Object.keys(views) as K[]).map((key) => (
        <div
          className={viewClassName}
          data-section="view"
          hidden={key !== shown}
          key={key}
        >
          {views[key]}
        </div>
      ))}
    </div>
  );
}

function WallStage({ wall, children }: WallStageProps<string>) {
  const driver = useScrollDriver();
  const [phase, setPhase] = useState<WallPhase>("page");
  const anchor = useRef<HTMLElement | null>(null);

  const jump = useCallback(
    (top: number) => {
      if (driver.active) driver.to(top, { immediate: true });
      window.scrollTo({ top, behavior: "instant" });
    },
    [driver],
  );

  const open = useCallback((from: HTMLElement | null = null) => {
    anchor.current = from;
    setPhase("wall");
  }, []);

  const close = useCallback(() => setPhase("page"), []);

  useLayoutEffect(() => {
    if (phase === "wall") return jump(0);
    const from = anchor.current;
    if (!from?.isConnected) return;
    jump(
      from.getBoundingClientRect().top + window.scrollY - WALL_RETURN_MARGIN,
    );
  }, [phase, jump]);

  useEffect(() => {
    if (phase !== "wall") return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialogOpen()) close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [close, phase]);

  const value = useMemo(() => ({ phase, open, close }), [phase, open, close]);
  const hung = phase === "wall";

  return (
    <WallContext value={value}>
      <div hidden={hung}>{children}</div>
      {hung ? <div>{wall}</div> : null}
    </WallContext>
  );
}

const ROLES = "[data-part], [data-section]";

function afterFrame(task: () => void) {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (pending !== undefined) return;
    pending = setTimeout(() => {
      pending = undefined;
      task();
    }, 0);
  };
  schedule.cancel = () => clearTimeout(pending);
  return schedule;
}
const KEYFRAME_META = new Set([
  "offset",
  "computedOffset",
  "easing",
  "composite",
]);
const CURTAIN_LIMIT_MS = 12000;

const INSET = 0.16;

function useCue(
  root: { current: HTMLElement | null },
  on: boolean,
  opening: number,
  inset = INSET,
) {
  useEffect(() => {
    const element = root.current;
    if (!on || !element) return;

    let open = opening <= 0;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const held = new Set<Element>();
    const mark = (node: Element) => {
      if (open) node.setAttribute("data-seen", "");
      else held.add(node);
    };
    const start = () => {
      element.setAttribute("data-play", "");
      if (open || hold) return;
      hold = setTimeout(() => {
        open = true;
        held.forEach((node) => node.setAttribute("data-seen", ""));
        held.clear();
      }, opening * 1000);
    };

    const stopLift = whenLifted(element, start);

    const release = (node: Element) => {
      mark(node);
      seen.unobserve(node);
      near.unobserve(node);
      showing.delete(node);
    };
    const seen = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) release(entry.target);
      },
      { rootMargin: `0px 0px -${inset * 100}% 0px` },
    );
    const showing = new Set<Element>();
    const atEnd = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2;
    const settle = () => {
      if (showing.size && atEnd()) [...showing].forEach(release);
    };
    const settleLater = afterFrame(settle);
    const near = new IntersectionObserver((entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) showing.add(entry.target);
        else showing.delete(entry.target);
      settle();
    });
    window.addEventListener("scroll", settleLater, { passive: true });
    const watch = (node: Element) => {
      const observe = (target: Element) => {
        if (target.hasAttribute("data-seen")) return;
        seen.observe(target);
        near.observe(target);
      };
      if (node.matches(ROLES)) observe(node);
      node.querySelectorAll(ROLES).forEach(observe);
    };
    watch(element);

    const added = new MutationObserver((records) => {
      for (const record of records)
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) watch(node);
        });
    });
    added.observe(element, { childList: true, subtree: true });

    return () => {
      stopLift();
      clearTimeout(hold);
      seen.disconnect();
      near.disconnect();
      window.removeEventListener("scroll", settleLater);
      settleLater.cancel();
      added.disconnect();
    };
  }, [root, on, opening, inset]);
}

function whenLifted(element: HTMLElement, start: () => void) {
  let frame = 0;
  const play = () => {
    if (frame || element.querySelector("[data-curtain]")) return;
    curtain.disconnect();
    clearTimeout(limit);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(start);
    });
  };
  const curtain = new MutationObserver(play);
  curtain.observe(element, {
    attributeFilter: ["data-curtain"],
    childList: true,
    subtree: true,
  });
  const limit = setTimeout(() => {
    curtain.disconnect();
    if (!frame) start();
  }, CURTAIN_LIMIT_MS);
  play();
  return () => {
    cancelAnimationFrame(frame);
    curtain.disconnect();
    clearTimeout(limit);
  };
}

function useTouch(root: { current: HTMLElement | null }, on: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!on || !element) return;
    const touch = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      let host: Element | null = null;
      for (
        let node = event.target.closest("[data-part]");
        node && element.contains(node);
        node = node.parentElement?.closest("[data-part]") ?? null
      )
        host = node;
      if (!host) return;
      for (const animation of host.getAnimations({ subtree: true })) {
        if (
          !(animation instanceof CSSAnimation) ||
          animation.playState !== "running" ||
          animation.timeline !== document.timeline ||
          animation.animationName.endsWith(LEAVING)
        )
          continue;
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.target;
        if (!(target instanceof HTMLElement || target instanceof SVGElement))
          continue;
        const style = getComputedStyle(target);
        const eases = style.transitionDuration
          .split(",")
          .some((duration) => parseFloat(duration) > 0);
        if (!eases) continue;
        const held = [
          ...new Set(
            effect!
              .getKeyframes()
              .flatMap((frame) => Object.keys(frame))
              .filter((key) => !KEYFRAME_META.has(key))
              .map((key) =>
                key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
              ),
          ),
        ].map((property) => [property, style.getPropertyValue(property)]);
        for (const [property, value] of held)
          target.style.setProperty(property, value!);
        animation.cancel();
        void getComputedStyle(target).opacity;
        for (const [property] of held) target.style.removeProperty(property!);
      }
    };
    element.addEventListener("pointerover", touch);
    element.addEventListener("focusin", touch);
    return () => {
      element.removeEventListener("pointerover", touch);
      element.removeEventListener("focusin", touch);
    };
  }, [root, on]);
}

export function defineStage<
  const P extends string,
  const S extends string = never,
>(roles: StageRoles<P, S>) {
  const { scope, scroll, glide = null, inset, tempo = 1, reach = 1 } = roles;
  const motion = roles.motion && paced(roles.motion, { tempo, reach });
  const opening = (roles.opening ?? 0) * tempo;
  const css = scope && motion ? compile(scope, motion) : "";
  const texts = Object.fromEntries(
    Object.entries(motion?.parts ?? {}).map(([key, moves]) => [
      key,
      (moves as { text?: TextMoves } | undefined)?.text,
    ]),
  );

  function ChoreoRoot({
    light,
    lightLinger,
    children,
  }: {
    light?: StageLight;
    lightLinger?: number;
    children: ReactNode;
  }) {
    useStageLight(light, { linger: lightLinger });
    const root = useRef<HTMLDivElement>(null);
    const on = Boolean(scope && css);
    useCue(root, on, opening, inset);
    useTouch(root, on);
    const driver = useScrollDriver();
    useEffect(() => (scroll ? driver.tune(scroll) : undefined), [driver]);
    if (!scope || !css)
      return <GlideContext value={glide}>{children}</GlideContext>;
    return (
      <GlideContext value={glide}>
        <TextContext value={texts}>
          <style href={`choreo-${scope}`} precedence="choreo">
            {css}
          </style>
          <div className="contents" data-choreo={scope} ref={root}>
            {children}
          </div>
        </TextContext>
      </GlideContext>
    );
  }

  function SurfaceRoot({ children }: { children: ReactNode }) {
    const root = useRef<HTMLDivElement>(null);
    useCue(root, Boolean(scope && css), 0);
    if (!scope || !css) return <>{children}</>;
    return (
      <TextContext value={texts}>
        <style href={`choreo-${scope}`} precedence="choreo">
          {css}
        </style>
        <div className="contents" data-choreo={scope} ref={root}>
          {children}
        </div>
      </TextContext>
    );
  }

  function Style() {
    if (!scope || !css) return null;
    return (
      <style href={`choreo-${scope}`} precedence="choreo">
        {css}
      </style>
    );
  }

  return {
    StageRoot: ChoreoRoot,
    SurfaceRoot,
    Style,
    Part: Part as (props: PartProps<P>) => ReactNode,
    Section: Section as (props: SectionProps<S>) => ReactNode,
    Text: Text as (props: TextProps<P>) => ReactNode,
    Header: Header as (props: HeaderProps<P>) => ReactNode,
    Bloom: Text as (props: {
      part: P;
      text: string;
      as?: ElementType;
      className?: string;
    }) => ReactNode,
    Expose: Expose as (props: ExposeProps<P>) => ReactNode,
    Count: Count as (props: CountProps<P>) => ReactNode,
    Swap: Swap as (props: SwapProps<S>) => ReactNode,
    Deck: Deck as <K extends string>(props: DeckProps<K, S>) => ReactNode,
    WallStage: WallStage as (props: WallStageProps<S>) => ReactNode,
    usePart: (name: P) => ({ "data-part": name }),
  };
}
