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
import { type Grading, useGrade } from "@/design/grade";
import {
  type Choreography,
  compile,
  type Curve,
  type Releases,
  releases,
  type TextMoves,
  LEAVING,
} from "./choreo";
import { useScrollDriver } from "./react";
import type { ScrollFeel } from "./scroll";

// A page's stage: the parts and sections it renders, by name. The names are
// where the page's choreography attaches; until a page writes one, every
// part renders still.

interface StageRoles<P extends string, S extends string> {
  parts: readonly P[];
  sections?: readonly S[];
  // The page's name and choreography; without them every role renders still.
  scope?: string;
  motion?: Choreography<P, S>;
  // How scrolling feels while the page is mounted.
  scroll?: ScrollFeel;
  // How a carousel pans when its arrows are pressed; without it, it jumps.
  glide?: Glide;
  // Seconds the opening plays before anything already in view on arrival
  // may enter, so the page reads from the top down: the opening first, the
  // blocks under it after. Roles reached by scrolling later play at once.
  opening?: number;
  // A sequenced opening instead: the opening's roles play in this order
  // (roles listed together play together), none starting before the roles
  // two places ahead of it have finished; every other role plays once, as
  // it first comes into view (see useQueue). `pace` is how far through a role the next one may begin (0–1).
  order?: readonly (P | readonly P[])[];
  pace?: number;
}

export interface Glide {
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

const RULE_COLOR =
  "color-mix(in oklch, var(--light, #fcfcfb) 20%, transparent)";

const METER_COLOR =
  "color-mix(in oklch, var(--light, #fcfcfb) 75%, transparent)";

const WallContext = createContext<WallState | null>(null);

export const useWall = () => useContext(WallContext);

const dialogOpen = () =>
  Boolean(document.querySelector("[role='dialog'], [aria-modal='true']"));

export function StageRoot({
  grade,
  children,
}: {
  grade?: Grading;
  children: ReactNode;
}) {
  useGrade(grade);
  return <>{children}</>;
}

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

// The order units play in. "center" spreads from the middle of the text
// outwards; "random" scatters them, the same way on server and client.
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

// How many units a text splits into, for a budgeted stagger (`--n`).
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

export function Text({
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
      <div className="flex min-h-8 w-full items-center gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          {icon ? (
            <span
              className="flex shrink-0"
              data-slot="icon"
              style={{ color: "var(--light, currentColor)" }}
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
          <div className="min-w-0" data-slot="actions">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Expose({
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

// A number among the facts: it enters as the text around it does, in its
// place in the order.
export function Count({
  part,
  value,
  format,
  index,
  className,
}: CountProps<string>) {
  return (
    <Expose
      className={className}
      index={index}
      part={part}
      text={format(value)}
    />
  );
}

// Swapped content leaves before the new content enters: the old view stays,
// marked `data-leaving`, until its leave animation ends (the page's
// choreography gives it one), then the new one mounts and plays its entrance.
// Without a leave it swaps at once.
const LEAVE_LIMIT_MS = 3000;

export function Swap({
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
    // A view that shows nothing (empty, `display: none`) runs no animation,
    // so its leave would never end: swap at once rather than wait out the
    // limit.
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
        {/* eslint-disable-next-line react-hooks/refs -- the leaving view keeps what it last showed */}
        {id === shown ? children : held.current}
      </Tag>
    </div>
  );
}

export function Deck<K extends string>({
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

export function WallStage({ wall, children }: WallStageProps<string>) {
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

// The stage's cues. The opening waits for the page to be hydrated and two
// frames painted, then `data-play` releases it. Every part and section is
// marked `data-seen` the first time it comes into view, which releases its
// entrance; roles added later (a swapped shelf, more rows) are watched too.
// Roles in view during the opening are held until it has played.
const ROLES = "[data-part], [data-section]";
const KEYFRAME_META = new Set([
  "offset",
  "computedOffset",
  "easing",
  "composite",
]);
const CURTAIN_LIMIT_MS = 12000;

const EMPTY_PLAN = { hosts: [], along: [], order: [], pace: 0 };

function useCue(
  root: { current: HTMLElement | null },
  on: boolean,
  opening: number,
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
      { rootMargin: "0px 0px -16% 0px" },
    );
    // A role in the page's last screen may never clear the line above: once
    // the page can scroll no further, whatever is on screen is seen.
    const showing = new Set<Element>();
    const atEnd = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2;
    const settle = () => {
      if (showing.size && atEnd()) [...showing].forEach(release);
    };
    const near = new IntersectionObserver((entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) showing.add(entry.target);
        else showing.delete(entry.target);
      settle();
    });
    window.addEventListener("scroll", settle, { passive: true });
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
      window.removeEventListener("scroll", settle);
      added.disconnect();
    };
  }, [root, on, opening]);
}

// Calls `start` once no curtain (a title card playing over the page) is down
// and two frames have painted; a stuck curtain gives way after
// CURTAIN_LIMIT_MS. Returns the cleanup.
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

// A queued stage's player. The opening's roles are lined up in the stage's
// order once the curtain lifts, and the line lets each one go (`data-seen`)
// at the first moment that
//   - the role before it is `pace` of the way through, and
//   - every role before that one has finished,
// timed off the paused animations themselves, so the line follows whatever
// the stylesheet says.
//
// Every other role plays its own entrance as soon as it first comes into
// view, with nothing to wait for, and only that once.
interface Step {
  start: number;
  end: number;
}

const RELEASE_LAG_MS = 17;
const END_MARGIN_MS = 17;

function useQueue(
  root: { current: HTMLElement | null },
  on: boolean,
  plan: Releases & {
    order: readonly (string | readonly string[])[];
    pace: number;
  },
) {
  useEffect(() => {
    const element = root.current;
    if (!on || !element) return;

    const hosts = plan.hosts;
    const join = (list: { selector: string }[]) =>
      list.map((entry) => entry.selector).join(", ");
    const LOAD = join(hosts.filter((host) => host.on === "load"));
    const VIEW = join(hosts.filter((host) => host.on === "view"));
    const ALONG = join(plan.along);
    const CUE = join(hosts.filter((host) => host.cue));
    const SECTION = "[data-section]";

    const roleOf = (node: Element) =>
      [...hosts, ...plan.along].find((entry) => node.matches(entry.selector));
    const rank = (node: Element) => {
      const part = node.getAttribute("data-part");
      const at = part
        ? plan.order.findIndex((entry) =>
            typeof entry === "string" ? entry === part : entry.includes(part),
          )
        : -1;
      return at < 0 ? plan.order.length : at;
    };
    const before = (a: Element, b: Element) =>
      a === b ? 0 : a.compareDocumentPosition(b) & 4 ? -1 : 1;
    const opening = (node: Element) => Boolean(LOAD) && node.matches(LOAD);

    let played = false;
    const waiting = new Set<Element>();
    // A role plays once; marked, it stays as it landed.
    const marked = new Set<Element>();
    const line: Element[][] = [];
    let steps: Step[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    // A section in view brings its carousel items; one that enters on view
    // deals itself in with them and the roles already on screen inside it,
    // as a tab swapped in does. A role brings the roles inside it (a card's
    // stars).
    const along = (section: Element) =>
      ALONG
        ? [...section.querySelectorAll(ALONG)].filter(
            (item) => item.parentElement?.closest(SECTION) === section,
          )
        : [];
    const expand = (node: Element): Element[] => {
      if (CUE && node.matches(CUE))
        return [
          node,
          ...along(node),
          ...(VIEW
            ? [...node.querySelectorAll(VIEW)].filter(
                (inner) =>
                  !marked.has(inner) &&
                  inner.getBoundingClientRect().top < window.innerHeight,
              )
            : []),
        ];
      if (node.matches(SECTION)) return along(node);
      return [
        node,
        ...(VIEW
          ? [...node.querySelectorAll(VIEW)].filter(
              (inner) => !marked.has(inner),
            )
          : []),
      ];
    };

    const entrances = (node: Element) => {
      const names = roleOf(node)?.names ?? [];
      return node
        .getAnimations({ subtree: true })
        .filter(
          (animation): animation is CSSAnimation =>
            animation instanceof CSSAnimation &&
            names.includes(animation.animationName),
        );
    };

    // Once marked, a trigger is done with both watches: each would only
    // find it marked and pass.
    const mark = (trigger: Element, nodes: Element[]) => {
      nodes.forEach((node) => node.setAttribute("data-seen", ""));
      marked.add(trigger);
      seen.unobserve(trigger);
      near.unobserve(trigger);
      showing.delete(trigger);
    };

    // Roles of the same place in the order wait as one.
    const enlist = (node: Element) => {
      const together = line.find((group) => rank(group[0]!) === rank(node));
      if (together) together.push(node);
      else line.push([node]);
    };

    const release = (node: Element) => {
      if (marked.has(node)) return;
      if (opening(node)) {
        enlist(node);
        return;
      }
      mark(node, expand(node));
    };

    const land = (node: Element) => {
      const nodes = expand(node);
      const tracks = nodes.flatMap(entrances);
      mark(node, nodes);
      tracks.forEach((animation) => animation.finish());
    };

    const measure = (nodes: Element[]) => {
      let span = null as Step | null;
      for (const animation of nodes.flatMap(entrances)) {
        if (animation.playState !== "paused") continue;
        const timing = animation.effect?.getComputedTiming();
        const delay = Number(timing?.delay ?? 0);
        const end = Number(timing?.endTime ?? 0);
        span = {
          start: Math.min(span?.start ?? Infinity, delay),
          end: Math.max(span?.end ?? -Infinity, end),
        };
      }
      return span;
    };

    const latest = () =>
      steps.reduce<Step | null>(
        (last, step) => (!last || step.start >= last.start ? step : last),
        null,
      );

    // The opening's line.
    const pump = () => {
      if (timer !== undefined || !played) return;
      line.sort((a, b) => rank(a[0]!) - rank(b[0]!) || before(a[0]!, b[0]!));
      while (line.length) {
        const nodes = line[0]!.filter(
          (node) => node.isConnected && !marked.has(node),
        );
        const span = measure(nodes);
        if (!span) {
          line.shift();
          nodes.forEach((node) => mark(node, [node]));
          continue;
        }
        const now = performance.now();
        const last = latest();
        const elder = steps
          .filter((step) => step !== last)
          .reduce((end, step) => Math.max(end, step.end), -Infinity);
        let at = now;
        if (last)
          at = Math.max(
            at,
            last.start + (last.end - last.start) * plan.pace - span.start,
            elder - span.start,
          );
        if (at - now > 1) {
          timer = setTimeout(() => {
            timer = undefined;
            pump();
          }, at - now);
          return;
        }
        line.shift();
        const start = performance.now() + RELEASE_LAG_MS;
        nodes.forEach((node) => mark(node, [node]));
        steps = [
          ...steps.filter((step) => step.end > now),
          {
            start: start + span.start,
            end: start + span.end + END_MARGIN_MS,
          },
        ];
      }
    };

    const flush = (nodes: Iterable<Element>) => {
      for (const node of nodes) release(node);
      pump();
    };

    const stopLift = whenLifted(element, () => {
      element.setAttribute("data-play", "");
      played = true;
      if (LOAD) element.querySelectorAll(LOAD).forEach(enlist);
      const held = [...waiting].sort(before);
      waiting.clear();
      flush(held);
    });

    const come = (nodes: Element[]) => {
      if (!nodes.length) return;
      if (played) flush(nodes);
      else nodes.forEach((node) => waiting.add(node));
    };

    // In view (past the screen's lower sixth) it plays.
    const seen = new IntersectionObserver(
      (entries) =>
        come(
          entries
            .filter((entry) => entry.isIntersecting)
            .map((entry) => entry.target),
        ),
      { rootMargin: "0px 0px -16% 0px" },
    );
    // Gone off the top without having played (scrolled past in one flick)
    // it simply lands, so nothing plays on the way back up. On screen near the page's foot, which may never clear the
    // lower sixth, it plays once the page can scroll no further.
    const showing = new Set<Element>();
    const atEnd = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 2;
    const settle = () => {
      if (showing.size && atEnd())
        come([...showing].filter((node) => !marked.has(node)));
    };
    const near = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) showing.add(entry.target);
        else {
          showing.delete(entry.target);
          waiting.delete(entry.target);
          if (!played) continue;
          const bounds = entry.rootBounds;
          if (!bounds) continue;
          if (
            entry.boundingClientRect.bottom <= bounds.top &&
            !marked.has(entry.target) &&
            !opening(entry.target)
          )
            land(entry.target);
        }
      }
      settle();
    });
    window.addEventListener("scroll", settle, { passive: true });

    const WATCHED = [VIEW, SECTION, LOAD].filter(Boolean).join(", ");
    const watch = (node: Element) => {
      const observe = (target: Element) => {
        seen.observe(target);
        near.observe(target);
      };
      if (node.matches(WATCHED)) observe(node);
      node.querySelectorAll(WATCHED).forEach(observe);
      // An opening role that arrives late (streamed in) joins the line.
      if (played && LOAD) {
        const late = [
          ...(node.matches(LOAD) ? [node] : []),
          ...node.querySelectorAll(LOAD),
        ];
        if (late.length) flush(late);
      }
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
      clearTimeout(timer);
      seen.disconnect();
      near.disconnect();
      window.removeEventListener("scroll", settle);
      added.disconnect();
    };
  }, [root, on, plan]);
}

// Touching a role hands it to its touch states at once: an entrance still
// playing on something that answers the hand (its long tail can look done)
// is finished, since while it runs it holds the very properties the hover
// would ease, and the hover would snap instead.
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
        // Hold where the entrance has got to, end it, and let go: the touch
        // state then eases on from there.
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
  const {
    scope,
    motion,
    scroll,
    glide = null,
    opening = 0,
    order,
    pace = 0.382,
  } = roles;
  const queued = Boolean(order);
  const css = scope && motion ? compile(scope, motion, { queued }) : "";
  const plan =
    scope && motion && order
      ? { ...releases(scope, motion), order, pace }
      : null;
  const texts = Object.fromEntries(
    Object.entries(motion?.parts ?? {}).map(([key, moves]) => [
      key,
      (moves as { text?: TextMoves } | undefined)?.text,
    ]),
  );

  function ChoreoRoot({
    grade,
    children,
  }: {
    grade?: Grading;
    children: ReactNode;
  }) {
    useGrade(grade);
    const root = useRef<HTMLDivElement>(null);
    const on = Boolean(scope && css);
    useCue(root, on && !plan, opening);
    useQueue(root, on && Boolean(plan), plan ?? EMPTY_PLAN);
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

  // A surface or action inside the dock: the same choreography root, without
  // the page's grade, scroll feel or opening hold. It mounts when the dock
  // opens it, so its `load` entrances play as it opens.
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

  return {
    StageRoot: ChoreoRoot,
    SurfaceRoot,
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
