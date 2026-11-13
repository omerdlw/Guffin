"use client";

import {
  createContext,
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
import { useScrollDriver } from "./react";

// A page's stage: the parts and sections it renders, by name. The names are
// where the page's choreography attaches; until a page writes one, every
// part renders still.

interface StageRoles<P extends string, S extends string> {
  parts: readonly P[];
  sections?: readonly S[];
}

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
  by?: "word" | "line" | "char" | "block";
  mask?: boolean;
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
  hover?: boolean;
}

interface ExposeProps<P extends string> {
  part: P;
  text: string;
  index?: number;
  as?: ElementType;
  className?: string;
  hover?: boolean;
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
  children,
}: PartProps<string>) {
  return (
    <Tag className={className} data-part={name}>
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

export function Text({
  part,
  text,
  as: Tag = "span",
  className,
}: TextProps<string>) {
  return (
    <Tag className={className} data-part={part}>
      {text}
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

  return (
    <div className={className ?? "relative z-10 mb-4"} data-part={part}>
      <div className="flex min-h-8 w-full items-center gap-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          {icon ? (
            <span
              className="flex shrink-0"
              style={{ color: "var(--light, currentColor)" }}
            >
              {icon}
            </span>
          ) : null}
          <h2 className={nameClassName}>{title}</h2>
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
        {actions ? <div className="min-w-0">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Bloom({
  part,
  text,
  as: Tag = "span",
  className,
}: {
  part: string;
  text: string;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag className={className} data-part={part}>
      {text}
    </Tag>
  );
}

export function Expose({
  part,
  text,
  as: Tag = "span",
  className,
  truncate = false,
}: ExposeProps<string>) {
  return (
    <Tag
      className={className}
      data-part={part}
      style={{ display: Tag === "span" ? "inline-block" : undefined }}
    >
      {truncate ? <span className="block truncate">{text}</span> : text}
    </Tag>
  );
}

export function Count({ part, value, format, className }: CountProps<string>) {
  return (
    <span className={className} data-part={part}>
      {format(value)}
    </span>
  );
}

export function Swap({
  id,
  cue,
  as: Tag = "div",
  className,
  children,
}: SwapProps<string>) {
  return (
    <div>
      <Tag className={className} data-section={cue} key={id}>
        {children}
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
        <div className={viewClassName} hidden={key !== shown} key={key}>
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

export function defineStage<
  const P extends string,
  const S extends string = never,
>(_roles: StageRoles<P, S>) {
  return {
    StageRoot,
    SurfaceRoot: ({ children }: { children: ReactNode }) => <>{children}</>,
    Part: Part as (props: PartProps<P>) => ReactNode,
    Section: Section as (props: SectionProps<S>) => ReactNode,
    Text: Text as (props: TextProps<P>) => ReactNode,
    Header: Header as (props: HeaderProps<P>) => ReactNode,
    Bloom: Bloom as (props: {
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
