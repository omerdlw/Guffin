"use client";

import {
  createContext,
  type CSSProperties,
  type ElementType,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type NavigationTrip,
  useOptionalNavigation,
} from "@omerdlw/base-framework/navigation";
import { carrierOf } from "./carry";
import {
  type Css,
  gradeOf,
  sampledTint,
  tempoScale,
  type Tint,
  tokenSheet,
} from "./color";
import { changesPage, topOf } from "./dom";
import { type Engine, sharedEngine } from "./engine";
import { Expose, type ExposeProps } from "./expose";
import {
  Count,
  type CountProps,
  Deck,
  type DeckProps,
  Header,
  type HeaderProps,
  Swap,
  type SwapProps,
} from "./kit";
import { Marquee, type MarqueeProps } from "./marquee";
import { passageOf } from "./passage";
import {
  letters,
  mountScene,
  mountText,
  type PartOptions,
  type SceneOptions,
  type SceneSetup,
  type Split,
  TEXT_WORD_ATTRIBUTE,
  words,
} from "./render";
import type { Score } from "./score";
import { driverOf } from "./scroll";
import { type Act, childScope, type Handle, Stage } from "./stage";
import { Bloom, type BloomProps, WallStage, type WallStageProps } from "./wall";

interface EngineProviderProps {
  engine?: Engine;
  drive?: boolean;
  children: ReactNode;
}

interface PartProps {
  ref: (el: HTMLElement | null) => (() => void) | undefined;
  style: CSSProperties;
  "data-part": string;
}

type Grading = string | Tint | null;

interface StageRootProps {
  pace?: number;
  grade?: Grading;
  leaves?: (trip: NavigationTrip) => boolean;
  children: ReactNode;
}

type PartComponentProps<P extends string> = PartOptions & {
  name: P;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};

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
  by?: Split;
  mask?: boolean;
  as?: ElementType;
  className?: string;
  options?: Omit<PartOptions, "index" | "render" | "carry">;
}

type Named<T, K extends keyof T, N> = Omit<T, K> & { [key in K]: N };

const UNSTAGED =
  "[data-part],[data-print]{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;visibility:visible!important;-webkit-mask-image:none!important;mask-image:none!important}";

const SECTION_MARGIN = "0px 0px -38.2% 0px";

const STAGE_MASK: CSSProperties = {
  display: "inline-block",
  overflow: "clip",
  verticalAlign: "top",
  paddingBottom: "0.08em",
  marginBottom: "-0.08em",
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function styleOf(initial: Css): CSSProperties {
  return {
    opacity: Number(initial.opacity),
    transform: initial.transform,
    filter: initial.filter,
    clipPath: initial.clipPath,
  };
}

function subscribeReducedMotion(change: () => void) {
  const media = matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

const readReducedMotion = () => matchMedia(REDUCED_MOTION_QUERY).matches;

const reducedMotionOnServer = () => false;

const EngineContext = createContext<Engine | null>(null);

const ScopeContext = createContext<string | null>(null);

export function EngineProvider({
  engine,
  drive = false,
  children,
}: EngineProviderProps) {
  const [value] = useState(() => engine ?? sharedEngine());

  useEffect(() => {
    if (!drive) return;
    const driver = driverOf(value);
    driver.start();
    return () => driver.stop();
  }, [drive, value]);

  return (
    <EngineContext value={value}>
      <style href="guffin-engine" precedence="medium">
        {tokenSheet()}
      </style>
      {children}
    </EngineContext>
  );
}

export const useEngine = () => useContext(EngineContext) ?? sharedEngine();

function useGrading(engine: Engine, grade: Grading | undefined) {
  useEffect(() => {
    if (grade === undefined) return;
    const target = gradeOf(engine);
    if (grade === null || typeof grade === "object") {
      target.set(grade);
      return;
    }
    let live = true;
    void sampledTint(grade).then((tint) => {
      if (live && tint) target.set(tint);
    });
    return () => {
      live = false;
    };
  }, [engine, typeof grade === "object" && grade ? grade.h : grade]);
}

const StageAnyContext = createContext<Stage<string, string> | null>(null);

export function useAnyStage(): Stage<string, string> {
  const stage = useContext(StageAnyContext);
  if (!stage) throw new Error("A part was used outside its StageRoot.");
  return stage;
}

export const useScope = () => useContext(ScopeContext);

export const ScopeProvider = ScopeContext;

const OwnedContext = createContext(false);

export const OwnedScope = OwnedContext;

export const ScopeGeneration = createContext(0);

const initialStyles = new WeakMap<object, Map<string, CSSProperties>>();

function initialStyle(
  stage: Stage<string, string>,
  name: string,
): CSSProperties {
  let styles = initialStyles.get(stage.score);
  if (!styles) {
    styles = new Map();
    initialStyles.set(stage.score, styles);
  }
  let style = styles.get(name);
  if (!style) {
    style = styleOf(stage.score.roles[name].initial);
    styles.set(name, style);
  }
  return style;
}

export function usePartOf(
  stage: Stage<string, string>,
  name: string,
  options: PartOptions = {},
): PartProps {
  const handle = useRef<Handle | null>(null);
  const inherited = useContext(ScopeContext);
  const { index, ready = true, carry, touch, render, css } = options;
  const scope = options.scope ?? inherited ?? undefined;
  const renders = Boolean(render);
  const readiness = useRef(ready);
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
  });

  const ref = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const registered = stage.register(name, el, {
        ...latest.current,
        render: latest.current.render
          ? (look, state) => latest.current.render?.(look, state)
          : undefined,
        scope,
        ready: readiness.current,
      });
      handle.current = registered;
      return () => {
        registered.dispose();
        if (handle.current === registered) handle.current = null;
      };
    },
    [stage, name, scope, carry, touch, renders, css],
  );

  useEffect(() => {
    handle.current?.index(index ?? 0);
  }, [index]);

  useEffect(() => {
    readiness.current = ready;
    if (ready) handle.current?.ready();
  }, [ready]);

  return {
    ref,
    style: renders && !css ? {} : initialStyle(stage, name),
    "data-part": name,
  };
}

export function useSectionOf(
  stage: Stage<string, string>,
  name: string,
  scope: string | null = null,
) {
  const generation = useContext(ScopeGeneration);
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const reached = new IntersectionObserver(
        ([entry]) => {
          const passed =
            entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
          if (entry.isIntersecting) stage.cue(name, scope, topOf(el));
          else if (passed) stage.pass(name, scope);
          else return;
          stop();
        },
        { rootMargin: stage.score.margin ?? SECTION_MARGIN },
      );
      const shown = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          stage.cue(name, scope, topOf(el));
          stop();
        },
        { threshold: 1 },
      );
      function stop() {
        reached.disconnect();
        shown.disconnect();
      }
      reached.observe(el);
      shown.observe(el);
      return stop;
    },
    [stage, name, scope, generation],
  );
}

export function StagePart({
  name,
  as: Tag = "div",
  className,
  children,
  ...options
}: PartComponentProps<string>) {
  return (
    <Tag {...usePartOf(useAnyStage(), name, options)} className={className}>
      {children}
    </Tag>
  );
}

export function StageSection({
  cue,
  as: Tag = "section",
  className,
  now = false,
  children,
}: SectionProps<string>) {
  const stage = useAnyStage();
  const parent = useContext(ScopeContext);
  const scope = childScope(parent, useId());
  const owned = useContext(OwnedContext);
  const trigger = useSectionOf(stage, cue, scope);
  const box = useRef<HTMLElement | null>(null);
  const watch = useCallback(
    (el: HTMLElement | null) => {
      box.current = el;
      return trigger(el);
    },
    [trigger],
  );
  useLayoutEffect(() => {
    if (!now || owned) return;
    stage.cue(cue, scope, box.current ? topOf(box.current) : undefined);
  }, [now, owned, stage, cue, scope]);
  if (owned) return <Tag className={className}>{children}</Tag>;
  return (
    <ScopeContext value={scope}>
      <Tag ref={watch} className={className}>
        {children}
      </Tag>
    </ScopeContext>
  );
}

function bindStage<P extends string, S extends string = never>(
  score: Score<P, S>,
) {
  const styles = Object.fromEntries(
    (Object.keys(score.roles) as P[]).map((name) => [
      name,
      styleOf(score.roles[name].initial),
    ]),
  ) as Record<P, CSSProperties>;

  function useStage(): Stage<P, S> {
    const stage = useAnyStage();
    if (stage.score !== (score as object))
      throw new Error("A part was used under another score's StageRoot.");
    return stage as unknown as Stage<P, S>;
  }

  const loose = (stage: Stage<P, S>) =>
    stage as unknown as Stage<string, string>;

  function StageRoot({
    pace = 0,
    grade,
    leaves = changesPage,
    children,
  }: StageRootProps) {
    const engine = useEngine();
    const navigation = useOptionalNavigation();
    const [stage] = useState(() => new Stage(engine, score, { pace }));
    const leavesRef = useRef(leaves);

    useEffect(() => {
      leavesRef.current = leaves;
    }, [leaves]);

    useEffect(() => {
      stage.start();
      const untune = driverOf(engine).tune(stage.tempo);
      return () => {
        untune();
        stage.halt();
      };
    }, [stage]);

    useEffect(
      () =>
        navigation.hold((trip) => {
          if (!leavesRef.current(trip)) return;
          carrierOf(engine).lift();
          trip.signal.addEventListener("abort", () => stage.stay(), {
            once: true,
          });
          return stage.leave();
        }),
      [navigation, stage],
    );

    useEffect(() => {
      const passage = passageOf(engine);
      const open = (opened: boolean) => {
        if (opened) passage.lift();
      };
      open(stage.opened.get());
      return stage.opened.subscribe(open);
    }, [engine, stage]);

    useGrading(engine, grade);

    return (
      <StageAnyContext value={loose(stage)}>
        <noscript>
          <style>{UNSTAGED}</style>
        </noscript>
        <div
          data-tempo=""
          style={
            {
              display: "contents",
              "--tempo": String(tempoScale(stage.tempo)),
            } as CSSProperties
          }
        >
          {children}
        </div>
      </StageAnyContext>
    );
  }

  function SurfaceRoot({
    pace = 0,
    children,
  }: {
    pace?: number;
    children: ReactNode;
  }) {
    const engine = useEngine();
    const [stage] = useState(() => new Stage(engine, score, { pace }));

    useEffect(() => {
      stage.start();
      return () => stage.halt();
    }, [stage]);

    return (
      <StageAnyContext value={loose(stage)}>
        <div
          data-tempo=""
          style={
            {
              display: "contents",
              "--tempo": String(tempoScale(stage.tempo)),
            } as CSSProperties
          }
        >
          {children}
        </div>
      </StageAnyContext>
    );
  }

  function usePart(name: P, options: PartOptions = {}) {
    return usePartOf(loose(useStage()), name, options);
  }

  function useSection(name: S, scope: string | null = null) {
    return useSectionOf(loose(useStage()), name, scope);
  }

  const Part = StagePart as (props: PartComponentProps<P>) => JSX.Element;

  const Section = StageSection as (props: SectionProps<S>) => JSX.Element;

  function useScene(name: P, setup: SceneSetup, options: SceneOptions = {}) {
    const stage = useStage();
    const latest = useRef({ setup, options });
    useEffect(() => {
      latest.current = { setup, options };
    });
    const ref = useCallback(
      (el: HTMLElement | null) => {
        if (!(el instanceof HTMLCanvasElement)) return;
        const { setup, options } = latest.current;
        return mountScene(stage, name, el, setup, options);
      },
      [stage, name],
    );
    return {
      ref,
      style: options.css ? styles[name] : undefined,
      "data-part": name,
    };
  }

  function BlockText({
    part,
    text,
    as: Tag = "span",
    className,
    options,
  }: TextProps<P>) {
    const props = usePartOf(loose(useStage()), part, options);
    return (
      <Tag {...props} className={className}>
        {text}
      </Tag>
    );
  }

  function SplitText({
    part,
    text,
    by = "word",
    mask = false,
    as: Tag = "span",
    className,
    options,
  }: TextProps<P>) {
    const stage = useStage();
    const scope = useContext(ScopeContext);
    const latest = useRef(options);
    useEffect(() => {
      latest.current = options;
    });
    const ref = useCallback(
      (el: HTMLElement | null) => {
        if (!el) return;
        return mountText(stage, part, el, by, {
          ...latest.current,
          scope: latest.current?.scope ?? scope ?? undefined,
        });
      },
      [stage, part, by, text, scope],
    );
    const style = styles[part];
    const piece = (content: string, key?: number) => (
      <span
        {...{ [TEXT_WORD_ATTRIBUTE]: "" }}
        aria-hidden="true"
        data-part={part}
        key={key}
        style={{ ...style, display: "inline-block" }}
      >
        {content}
      </span>
    );
    const all = words(text);
    return (
      <Tag ref={ref} className={className} aria-label={text}>
        {all.map((word, i) => {
          const set =
            by === "char" ? (
              <span
                aria-hidden="true"
                style={{ display: "inline-block", whiteSpace: "nowrap" }}
              >
                {letters(word).map((letter, j) => piece(letter, j))}
              </span>
            ) : mask ? (
              <span style={STAGE_MASK}>{piece(word)}</span>
            ) : (
              piece(word)
            );
          return (
            <span key={i}>
              {set}
              {i < all.length - 1 ? " " : null}
            </span>
          );
        })}
      </Tag>
    );
  }

  function Text(props: TextProps<P>) {
    return props.by === "block" ? (
      <BlockText {...props} />
    ) : (
      <SplitText {...props} />
    );
  }

  function useAct(): Act {
    const stage = useStage();
    return useSyncExternalStore(
      stage.act.subscribe,
      stage.act.get,
      () => "waiting" as const,
    );
  }

  return {
    StageRoot,
    SurfaceRoot,
    usePart,
    useSection,
    useScene,
    useAct,
    useStage,
    Part,
    Section,
    Text,
  };
}

export function useScrollDriver() {
  return driverOf(useEngine());
}

export function bindScore<P extends string, S extends string = never>(
  score: Score<P, S>,
) {
  return {
    ...bindStage(score),
    Header: Header as (props: Named<HeaderProps, "part", P>) => JSX.Element,
    Bloom: Bloom as (props: Named<BloomProps, "part", P>) => JSX.Element,
    Marquee: Marquee as (props: Named<MarqueeProps, "part", P>) => JSX.Element,
    Expose: Expose as (props: Named<ExposeProps, "part", P>) => JSX.Element,
    Count: Count as (props: Named<CountProps, "part", P>) => JSX.Element,
    Swap: Swap as (props: Named<SwapProps, "cue", S>) => JSX.Element,
    Deck: Deck as <K extends string>(
      props: Omit<DeckProps<K>, "cue"> & { cue?: S },
    ) => JSX.Element,
    WallStage: WallStage as (
      props: Named<WallStageProps, "cue", S>,
    ) => JSX.Element,
  };
}

export function useHydratedReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    readReducedMotion,
    reducedMotionOnServer,
  );
}
