import type { AmbientPalette } from "@omerdlw/base-framework/modules/ambient";
import type { NavigationTrip } from "@omerdlw/base-framework/modules/navigation";
import type { MotionValue } from "motion/react";
import type { CSSProperties, ElementType, ReactNode, RefObject } from "react";
import type { MATTER, POINTS } from "./constants";
import type { Signal, Value } from "./engine";
import type { TOUCH } from "./forces";
import type { useScrollY } from "./projection";
import type { ENTER, LEAVE } from "./time";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

/** The veil between two pages: clear, rising, covering the page, lifting. */
export type PassagePhase = "clear" | "closing" | "covered" | "lifting";

export interface Flight {
  key: string;
  shell: HTMLDivElement;
  from: Rect;
  target: HTMLElement | null;
  progress: Value | null;
  expire: ReturnType<typeof setTimeout>;
  release: () => void;
}

export interface Look {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  blur: number;
  brightness: number;
  saturate: number;
  clipTop: number;
  clipRight: number;
  clipBottom: number;
  clipLeft: number;
}

export type Shade = Partial<Look>;

export interface Css {
  opacity: string;
  transform: string;
  filter: string;
  clipPath: string;
}

export type Written = Css & { willChange: string };

export interface Tint {
  l: number;
  c: number;
  h: number;
}

export type CursorMode =
  "action" | "card" | "drag" | "frame" | "idle" | "none" | "text" | "wrap";

export interface CursorReading {
  corner?: number;
  label: string;
  mode: CursorMode;
  target: HTMLElement | null;
}

export interface CursorShape {
  bracket: number;
  caption: number;
  dot: number;
  glass: number;
  h: number;
  label: number;
  r: number;
  solid: number;
  w: number;
}

export interface CursorSpring {
  v: number;
  x: number;
}

export interface SpringTune {
  damping: number;
  stiffness: number;
}

export interface CursorBox {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface CursorInk {
  above: number;
  below: number;
  key: string;
  lead: number;
  tail: number;
}

export interface Source<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}

export type Phase = "read" | "update" | "render";

export interface Frame {
  time: number;
  delta: number;
}

export type Task = (frame: Frame) => void;

export interface Clock {
  readonly time: number;
  rate: number;
  add(phase: Phase, task: Task): () => void;
  once(phase: Phase, task: Task): void;
  advance(delta: number): void;
  dispose(): void;
}

export interface ClockOptions {
  manual?: boolean;
}

export type Curve = (t: number) => number;

export interface TimeSpring {
  period: number;
  damping: number;
  mass: number;
}

export type Drive =
  | { tween: number; curve: Curve; delay?: number }
  | { spring: TimeSpring; delay?: number };

export type Motion =
  | {
      kind: "tween";
      from: number;
      to: number;
      start: number;
      duration: number;
      curve: Curve;
    }
  | {
      kind: "spring";
      target: number;
      start: number;
      offset: number;
      velocity: number;
      spring: TimeSpring;
    };

export interface Viewport {
  width: number;
  height: number;
}

export interface Pointer {
  x: number;
  y: number;
  active: boolean;
}

export interface Engine {
  clock: Clock;
  scroll: Signal<number>;
  viewport: Source<Viewport>;
  pointer: Source<Pointer>;
  reduced: Source<boolean>;
  layout: Source<number>;
  dispose(): void;
}

export interface EngineOptions {
  clock?: Clock;
  scroll?: Source<number>;
  reduced?: Source<boolean>;
}

export interface MouseSample {
  at: number;
  x: number;
  y: number;
  present: boolean;
}

export interface Exposure {
  print: HTMLElement;
  light: HTMLElement;
}

export interface ExposeProps {
  part: string;
  text: string;
  index?: number;
  as?: ElementType;
  className?: string;
  hover?: boolean;
  truncate?: boolean;
}

export interface Placement {
  top: number;
  fixed: boolean;
}

export interface Force {
  shade(): Shade;
  subscribe(listener: () => void): () => void;
}

export type TouchVerb = keyof typeof TOUCH;

export type CurveName = keyof typeof POINTS;

type EnterVerb = keyof typeof ENTER;

export type LeaveVerb = keyof typeof LEAVE;

export interface Matter {
  rung: number;
  mass: number;
  damping: number;
  curve: CurveName;
  enter: EnterVerb;
  leave: LeaveVerb;
}

export type MatterName = keyof typeof MATTER;

export interface TouchOptions {
  verb?: TouchVerb;
  matter?: MatterName | Matter;
  tempo?: number;
}

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

export type ProgressWindow = readonly [from: number, to: number];

export interface HeaderProps {
  part: string;
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  nameClassName?: string;
  /** 0–1: the rule becomes a progress track filled to this share. */
  progress?: number;
}

export interface RoomProps {
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

export interface MarqueeFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MarqueeEdges {
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

export interface MarqueeCard {
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

export interface MarqueeProps {
  part: string;
  text: string;
  src: string;
  focus?: readonly [number, number];
  edges: MarqueeEdges;
  target?: string;
  quiet?: boolean;
  className?: string;
}

export interface Speck {
  life: number;
  size: number;
  strength: number;
  x: number;
  y: number;
}

export interface Mass {
  vx: number;
  vy: number;
  x: number;
  y: number;
}

export interface Reel {
  halo: WebGLTexture;
  levels: WebGLTexture[];
  size: [number, number];
  src: string;
  streak: WebGLTexture;
  texture: WebGLTexture;
}

export interface Projector {
  show: (src: string) => void;
  stop: () => void;
}

export interface ProjectionOptions {
  cut: number;
  defocusAt: RefObject<((y: number) => number) | undefined>;
  focus: [number, number];
  halation: number;
  onFail: () => void;
  onLive: (live: boolean) => void;
  onRestore: () => void;
  reduced: boolean;
  scrollY: ReturnType<typeof useScrollY>;
  src: string;
}

export interface ProjectionProps {
  className?: string;
  cut?: number;
  defocusAt?: (scrollY: number) => number;
  halation?: number;
  mask?: CSSProperties;
  onReady?: () => void;
  position?: string;
  reel?: string | null;
  src: string;
}

export interface EngineProviderProps {
  engine?: Engine;
  drive?: boolean;
  children: ReactNode;
}

export interface PartProps {
  ref: (el: HTMLElement | null) => (() => void) | undefined;
  style: CSSProperties;
  "data-part": string;
}

export type Grading = string | Tint | null;

export interface StageRootProps {
  pace?: number;
  grade?: Grading;
  leaves?: (trip: NavigationTrip) => boolean;
  children: ReactNode;
}

/**
 * How the members of one part follow each other: "trail" bunches them up
 * front, "even" and "stairs" space them by rank, and "lines" spaces them by
 * their own index at one steady pace, so every part that shares an index (a
 * row, its label, its value, its rule) moves as one line.
 */
export type Cadence = "trail" | "even" | "stairs" | "lines";

export interface PartState {
  enter: number;
  leave: number;
  moving: boolean;
  quiet: boolean;
}

export interface PartOptions {
  index?: number;
  scope?: string;
  ready?: boolean;
  patience?: number;
  cadence?: Cadence;
  carry?: string;
  forces?: readonly Force[];
  touch?: TouchVerb;
  render?: (look: Look, state: PartState) => void;
  css?: boolean;
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
  now?: boolean;
  children?: ReactNode;
}

export type Split = "word" | "line" | "char" | "block";

export interface TextProps<P extends string> {
  part: P;
  text: string;
  by?: Split;
  mask?: boolean;
  as?: ElementType;
  className?: string;
  options?: Omit<PartOptions, "index" | "render" | "carry">;
}

export type Named<T, K extends keyof T, N> = Omit<T, K> & { [key in K]: N };

interface SceneFrame extends PartState {
  time: number;
  delta: number;
  look: Look;
  scroll: number;
  pointer: Pointer;
  viewport: Viewport;
  width: number;
  height: number;
  ratio: number;
}

export interface Renderer {
  draw(frame: SceneFrame): boolean | void;
  resize?(width: number, height: number, ratio: number): void;
  dispose?(): void;
}

export type SceneSetup = (
  canvas: HTMLCanvasElement,
  wake: () => void,
) => Renderer | null;

export interface SceneOptions extends Omit<PartOptions, "render"> {
  pixelRatio?: number;
}

export type Casting =
  | MatterName
  | {
      matter: MatterName;
      enter?: EnterVerb;
      leave?: LeaveVerb;
      depth?: number;
      drift?: number;
      cadence?: Cadence;
      /** For the "lines" cadence: rungs off the tempo between two lines (LINES_RUNG by default). */
      beat?: number;
    };

export type Beat<P extends string> =
  P | readonly P[] | { rest: number; with?: P };

/**
 * An opening beat that lets the queued sections start from this point while
 * the rest of the opening keeps playing; without one they wait for its end.
 */
export interface Release {
  release: true;
}

export interface ScoreInput<P extends string, S extends string> {
  /** Root margin a section must clear before it is cued; defaults to the stage's. */
  margin?: string;
  tempo?: number;
  cast: Record<P, Casting>;
  opening: readonly (Beat<NoInfer<P>> | Release)[];
  sections?: Record<S, readonly Beat<NoInfer<P>>[]>;
  leave?: LeaveVerb;
  /**
   * Sections are queued in page order, top first, whether they are cued by
   * scrolling or played straight away.
   */
  ordered?: boolean;
  /** An opening beat with none of its parts on the page takes no time. */
  tight?: boolean;
}

export interface Role {
  matter: Matter;
  enter: EnterVerb;
  leave: LeaveVerb;
  depth: number;
  drift: number;
  cadence: Cadence;
  beat: number;
  initial: Css;
}

export type Step<P extends string> =
  { parts: readonly P[] } | { rest: number; with?: P };

export type OpeningStep<P extends string> = Step<P> | Release;

export interface Score<P extends string, S extends string> {
  margin: string | undefined;
  tempo: number;
  roles: Record<P, Role>;
  opening: readonly OpeningStep<P>[];
  sections: Record<S, readonly Step<P>[]>;
  ordered: boolean;
  tight: boolean;
}

export interface Cue<P extends string> {
  parts: readonly P[];
  at: number;
  length: number;
}

export interface Plan<P extends string> {
  cues: Cue<P>[];
  length: number;
  after: number;
}

export type Bezier = [number, number, number, number];

export interface ScrollTarget {
  offset?: number;
  immediate?: boolean;
}

export type Act = "waiting" | "arriving" | "present" | "leaving" | "gone";

export interface StageOptions {
  pace?: number;
}

export interface Handle {
  ready(): void;
  index(index: number): void;
  dispose(): void;
}

export interface Actor {
  name: string;
  scope: string | null;
  role: Role;
  index: number;
  cadence: Cadence;
  el: HTMLElement;
  ready: boolean;
  patience: number;
  enter: Value;
  leave: Value;
  drift: { x: Value; y: Value } | null;
  placement: Placement;
  forces: readonly Force[];
  render: PartOptions["render"];
  css: boolean;
  written: Written;
  radius: string | null;
  /** Fills much of the viewport: a blur on it costs a frame, so it gets none. */
  bulk: boolean | null;
  release: () => void;
}

export interface Queued<P extends string> {
  step: Step<P>;
  cue: string;
  scope: string | null;
  at?: number;
}

export interface TiltLight {
  glow: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export type State = readonly [position: number, velocity: number];

export type Verb = (progress: number) => Shade;

export type Ease = readonly [number, number, number, number];

export type WallPhase = "page" | "leaving" | "wall" | "closing" | "returning";

export interface WallState {
  phase: WallPhase;
  open: (from?: HTMLElement | null) => void;
  close: () => void;
}

export interface WallStageProps {
  cue: string;
  wall: ReactNode;
  children: ReactNode;
}

export interface BloomProps {
  part: string;
  text: string;
  as?: ElementType;
  className?: string;
}

declare module "@omerdlw/base-framework/modules/navigation" {
  interface NavigationPayload {
    grade?: string | null;
    palette?: AmbientPalette | null;
  }
}
