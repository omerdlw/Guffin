"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";
import {
  pathOf,
  useOptionalNavigation,
  type NavigationTrip,
} from "@omerdlw/base-framework/modules/navigation";
import { carrierOf } from "./carry";
import { sharedEngine, type Engine } from "./engine";
import type { Css } from "./look";
import { mountScene, type SceneOptions, type SceneSetup } from "./scene";
import type { Score } from "./score";
import { driverOf } from "./scroll";
import {
  Stage,
  childScope,
  type Act,
  type Handle,
  type PartOptions,
} from "./stage";
import { WORD, letters, mountText, words, type Split } from "./text";
import { gradeOf, sampleTint, type Tint } from "./tint";
import { tempoScale, tokenSheet } from "./tokens";
import { touch, type TouchOptions } from "./touch";

const EngineContext = createContext<Engine | null>(null);

// The instance of a repeated section a part sits in; parts inherit it.
const ScopeContext = createContext<string | null>(null);

export interface EngineProviderProps {
  engine?: Engine;
  // Let the engine drive the wheel instead of the browser.
  drive?: boolean;
  children: ReactNode;
}

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

// Without JavaScript nothing would ever arrive, so everything is simply there.
const UNSTAGED =
  "[data-part],[data-print]{opacity:1!important;transform:none!important;filter:none!important;clip-path:none!important;visibility:visible!important;-webkit-mask-image:none!important;mask-image:none!important}";

const SECTION_MARGIN = "0px 0px -38.2% 0px";

// A trip leaves the page when it goes to another path; a new query or hash
// on the same page is the page changing, not leaving.
const changesPage = (trip: NavigationTrip) =>
  pathOf(trip.to) !== pathOf(trip.from);

function styleOf(initial: Css): CSSProperties {
  return {
    opacity: Number(initial.opacity),
    transform: initial.transform,
    filter: initial.filter,
    clipPath: initial.clipPath,
  };
}

export interface PartProps {
  ref: (el: HTMLElement | null) => (() => void) | undefined;
  style: CSSProperties;
  "data-part": string;
}

export type Grading = string | Tint | null;

export interface StageRootProps {
  // Rungs the page is moved along the ladder by, for good. A page opens the
  // same way every time it is opened, so there is no pace for a revisit.
  pace?: number;
  // The room's color: a picture to read it from, a tint, or null for dark.
  // Left out, the room keeps the color it had.
  grade?: Grading;
  leaves?: (trip: NavigationTrip) => boolean;
  children: ReactNode;
}

export type PartComponentProps<P extends string> = PartOptions & {
  name: P;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
};

export interface SectionProps<S extends string> {
  cue: S;
  as?: ElementType;
  className?: string;
  // Plays as soon as it is mounted, right behind the opening, instead of
  // when it is reached: a section the opening leads straight into.
  now?: boolean;
  children?: ReactNode;
}

export interface TextProps<P extends string> {
  part: P;
  text: string;
  by?: Split;
  // Each word rises out of its own line box instead of over the text above.
  mask?: boolean;
  as?: ElementType;
  className?: string;
  options?: Omit<PartOptions, "index" | "render" | "carry">;
}

const MASK: CSSProperties = {
  display: "inline-block",
  overflow: "clip",
  verticalAlign: "top",
  paddingBottom: "0.08em",
  marginBottom: "-0.08em",
};

function useGrading(engine: Engine, grade: Grading | undefined) {
  useEffect(() => {
    if (grade === undefined) return;
    const target = gradeOf(engine);
    if (grade === null || typeof grade === "object") {
      target.set(grade);
      return;
    }
    let live = true;
    void sampleTint(grade).then((tint) => {
      if (live && tint) target.set(tint);
    });
    return () => {
      live = false;
    };
  }, [engine, typeof grade === "object" && grade ? grade.h : grade]);
}

// The stage of the page being rendered, for the kit: components that work
// with any score take part names as plain strings.
const StageAnyContext = createContext<Stage<string, string> | null>(null);

export function useAnyStage(): Stage<string, string> {
  const stage = useContext(StageAnyContext);
  if (!stage) throw new Error("A part was used outside its StageRoot.");
  return stage;
}

export const useScope = () => useContext(ScopeContext);

export const ScopeProvider = ScopeContext;

// Inside a swap, a deck view or a wall, the scope is already owned and cued
// by them; a Section placed there joins it instead of opening its own.
const OwnedContext = createContext(false);

export const OwnedScope = OwnedContext;

// Bumped by whoever puts a scope back in the dark (a deck returning to a
// view), so the sections inside it watch the window again.
export const ScopeGeneration = createContext(0);

const initialStyles = new WeakMap<object, Map<string, CSSProperties>>();

export function initialStyle(
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
        // The latest render callback, so a component may pass a new closure
        // each render without registering again.
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

// A section is cued when its top reaches φ⁻¹ of the window. One found already
// scrolled past, never seen, is simply there.
export function useSectionOf(
  stage: Stage<string, string>,
  name: string,
  scope: string | null = null,
) {
  const generation = useContext(ScopeGeneration);
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          const passed =
            entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0);
          if (entry.isIntersecting) stage.cue(name, scope);
          else if (passed) stage.pass(name, scope);
          else return;
          observer.disconnect();
        },
        { rootMargin: SECTION_MARGIN },
      );
      observer.observe(el);
      return () => observer.disconnect();
    },
    [stage, name, scope, generation],
  );
}

// A part as an element, for components that work with any score.
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

// One instance of a section: the parts inside it arrive when it is reached,
// independently of every other instance of the same section. Inside another
// scope it is a child of it; inside an owned scope it joins it.
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
  // Cued before the stage starts, it is queued behind the opening's beats.
  // The scroll still watches it (a cue is only taken once), so a section put
  // back in the dark by its view is played again as it is reached.
  useLayoutEffect(() => {
    if (now && !owned) stage.cue(cue, scope);
  }, [now, owned, stage, cue, scope]);
  if (owned) return <Tag className={className}>{children}</Tag>;
  return (
    <ScopeContext value={scope}>
      <Tag ref={trigger} className={className}>
        {children}
      </Tag>
    </ScopeContext>
  );
}

// Binds a score to React once, so every hook below knows its part names.
export function bindStage<P extends string, S extends string = never>(
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

  // A stage over the page instead of a page: a dock surface. It plays its
  // opening once mounted and goes with its panel; the wheel, the room's color
  // and navigation stay the page's.
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

  // A part as an element, so a server component can place one.
  const Part = StagePart as (props: PartComponentProps<P>) => JSX.Element;

  const Section = StageSection as (props: SectionProps<S>) => JSX.Element;

  // A canvas part: the scene is handed the look instead of CSS.
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
    // The scene draws the look itself, so the canvas starts with no CSS of
    // its own unless the scene also asked for it.
    return {
      ref,
      style: options.css ? styles[name] : undefined,
      "data-part": name,
    };
  }

  // The whole text is the part: it arrives as one.
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
        {...{ [WORD]: "" }}
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
              // A word never breaks inside itself: only its letters move.
              <span
                aria-hidden="true"
                style={{ display: "inline-block", whiteSpace: "nowrap" }}
              >
                {letters(word).map((letter, j) => piece(letter, j))}
              </span>
            ) : mask ? (
              <span style={MASK}>{piece(word)}</span>
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

// A hand on anything that is not a part: buttons, tiles, links.
export function useTouch(options?: TouchOptions) {
  const engine = useEngine();
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      return touch(engine, el, latest.current);
    },
    [engine, options?.verb],
  );
}

// Offers an element to be carried to the next page under this key.
export function useCarry(key: string | null) {
  const engine = useEngine();
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el || !key) return;
      return carrierOf(engine).source(key, el);
    },
    [engine, key],
  );
}

export function useScrollDriver() {
  return driverOf(useEngine());
}
