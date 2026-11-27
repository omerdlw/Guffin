"use client";

import {
  type ComponentProps,
  createContext,
  type JSX,
  type ReactNode,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useOptionalDockState } from "@omerdlw/base-framework/dock";
import { ActionButton } from "@/design/components/action-button";
import {
  BACKDROP_HERO_TALL_MASK,
  BOTTOM_COVER,
  SIDE_COVER,
} from "@/design/components/backdrop";
import { TextButton } from "@/design/components/link";
import { Room } from "@/design/components/room";
import {
  BACKDROP_HERO_TALL,
  MAIN_COLUMN_CLASS,
  VIEW_CLASS,
} from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { useWall } from "@/motion/choreography/stage";
import { bezier } from "@/motion/core/curve";
import { clamp } from "@/motion/core/math";
import { useScrollDriver } from "@/motion/core/provider";
import { Intermission } from "@/motion/effects/intermission";
import { Marquee } from "@/motion/effects/marquee";
import { Projection } from "@/motion/webgl/projection";
import { DetailDeck, DetailPart, DetailStageRoot } from "../motion";

interface StageWallSet {
  set: string | null;
  choose: (set: string) => void;
}

const INTERMISSION_TIMING = {
  after: 99.5,
  drift: 38,
  enter: 3.427,
  leave: 1.309,
};

const INTERMISSION_EASE = [0.5, 0.05, 0.1, 1] as const;

const SCROLL_TOP_MARGIN = 24;

const DETAIL_ACTION_SIZE = "h-control-lg px-4 py-0 disabled:cursor-wait";

const DETAIL_ACTION_SECONDARY_SIZE = "h-control-md gap-2 px-3";

const BACKDROP_DEFOCUS_FROM = 24;

const BACKDROP_DEFOCUS_TO = 560;

const BACKDROP_CUT = 1.309;

const DEFOCUS = bezier(0.65, 0, 0.35, 1);

const BACKDROP_HALATION = 0.55;

const BACKDROP_POSITION = "center 20%";

const BACKDROP_FOCUS = [0.5, 0.2] as const;

const CARD_IMAGE_PATH = "/t/p/w1280/";

const FRAME_IMAGE_SIZE = "w780";

const defocusAt = (y: number) =>
  DEFOCUS(
    clamp(
      (y - BACKDROP_DEFOCUS_FROM) /
        (BACKDROP_DEFOCUS_TO - BACKDROP_DEFOCUS_FROM),
      0,
      1,
    ),
  );

const toCardImage = (src: string) =>
  src.replace(/\/t\/p\/original\//, CARD_IMAGE_PATH);

const BACKDROP_EDGES = { bottom: BOTTOM_COVER, side: SIDE_COVER };

const WallSetContext = createContext<StageWallSet>({
  set: null,
  choose: () => {},
});

export const useWallSet = () => use(WallSetContext);

export function DetailStage({
  children,
  light,
}: {
  children: ReactNode;
  light?: string | null;
}) {
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ choose, set }), [set]);

  return (
    <DetailStageRoot light={light ?? undefined} lightLinger={0}>
      <Room grain={false} />
      <WallSetContext value={wall}>{children}</WallSetContext>
    </DetailStageRoot>
  );
}

export function DetailViews<K extends string>({
  focus = null,
  shown,
  views,
}: {
  focus?: string | null;
  shown: K;
  views: Record<K, ReactNode>;
}) {
  const column = useRef<HTMLDivElement>(null);
  const driver = useScrollDriver();

  const scroll = (to: number) => {
    if (driver.active) driver.to(to, { immediate: true });
    window.scrollTo({ top: to, behavior: "instant" });
  };

  const bring = () => {
    const element = column.current;
    if (!element) return;
    const target = focus ? element.querySelector(focus) : null;
    if (target) {
      const { top } = target.getBoundingClientRect();
      scroll(top + window.scrollY - SCROLL_TOP_MARGIN * 2);
      return;
    }
    const { top } = element.getBoundingClientRect();
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    if (top >= 0 && (wide || top <= window.innerHeight * 0.6)) return;
    scroll(top + window.scrollY - SCROLL_TOP_MARGIN);
  };

  return (
    <div className={MAIN_COLUMN_CLASS} ref={column}>
      <DetailDeck
        onSwitch={bring}
        shown={shown}
        viewClassName={VIEW_CLASS}
        views={views}
      />
    </div>
  );
}

function actionLabel(
  label: string,
  shortLabel: string | undefined,
  secondary: boolean,
): ReactNode {
  if (!shortLabel) return label;
  if (secondary) return shortLabel;
  return (
    <>
      <span className="sm:max-xl:hidden">{label}</span>
      <span className="hidden sm:max-xl:inline">{shortLabel}</span>
    </>
  );
}

export function DetailAction({
  grow = false,
  index,
  label,
  secondary = false,
  shortLabel,
  ...props
}: Omit<
  ComponentProps<typeof ActionButton>,
  "ariaLabel" | "className" | "iconSize" | "label"
> & {
  grow?: boolean;
  index?: number;
  label: string;
  secondary?: boolean;
  shortLabel?: string;
}): JSX.Element {
  return (
    <DetailPart
      className={cn("min-w-0", grow && "flex-1")}
      index={index}
      name="action"
    >
      <ActionButton
        {...props}
        ariaLabel={secondary && shortLabel ? label : undefined}
        className={cn(
          DETAIL_ACTION_SIZE,
          secondary && DETAIL_ACTION_SECONDARY_SIZE,
        )}
        iconSize={secondary ? 14 : 16}
        label={actionLabel(label, shortLabel, secondary)}
      />
    </DetailPart>
  );
}

export function DetailIntermission({
  image,
  title,
}: {
  image: string | null;
  title: string;
}) {
  const away = (useWall()?.phase ?? "page") !== "page";

  return (
    <Intermission
      {...INTERMISSION_TIMING}
      ease={INTERMISSION_EASE}
      image={image}
      paused={away}
      title={title}
    />
  );
}

export function BackdropProjection({
  className,
  mask,
  onReady,
  src,
  still = null,
}: {
  className?: string;
  mask?: ComponentProps<typeof Projection>["mask"];
  onReady?: () => void;
  src: string;
  still?: string | null;
}) {
  return (
    <Projection
      className={className}
      cut={BACKDROP_CUT}
      mask={mask}
      defocusAt={defocusAt}
      halation={BACKDROP_HALATION}
      onReady={onReady}
      position={BACKDROP_POSITION}
      reel={still}
      src={src}
    />
  );
}

export function DetailBackdrop({
  children,
  frames,
  held = false,
  src,
  still = null,
  tall = false,
  title,
}: {
  children?: ReactNode;
  frames?: readonly string[];
  held?: boolean;
  src: string;
  still?: string | null;
  tall?: boolean;
  title?: string;
}) {
  const reel = useMemo(
    () =>
      frames
        ?.map((path) => tmdbImageUrl("backdrop", path, FRAME_IMAGE_SIZE))
        .filter((url): url is string => Boolean(url)),
    [frames],
  );
  const [ready, setReady] = useState(false);
  const [lifted, lift] = useState(!title);
  const curtained = title ? !lifted : held && !ready;

  useEffect(() => {
    const late = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(late);
  }, []);

  return (
    <div
      className="relative"
      data-curtain={curtained ? "" : undefined}
      data-ready={ready ? "" : undefined}
    >
      <DetailPart name="backdrop">
        <div className="relative">
          <BackdropProjection
            className={tall ? BACKDROP_HERO_TALL : undefined}
            mask={tall ? BACKDROP_HERO_TALL_MASK : undefined}
            onReady={() => setReady(true)}
            src={src}
            still={still}
          />
        </div>
      </DetailPart>
      {title ? (
        <Marquee
          className="font-zuume"
          edges={BACKDROP_EDGES}
          focus={BACKDROP_FOCUS}
          frames={reel}
          onLift={() => lift(true)}
          quiet={ready}
          src={toCardImage(src)}
          text={title}
        />
      ) : null}
      {children}
    </div>
  );
}

export function StickyAside({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const resting = useOptionalDockState(
    (state) => state.surfacePhase === "idle" && !state.activeItem?.action,
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      element.style.setProperty("--aside-h", `${element.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const dockHeight = useOptionalDockState((state) => state.dockHeight) ?? 0;
  useEffect(() => {
    const element = ref.current;
    if (!element || !resting || dockHeight <= 0) return;
    element.style.setProperty("--aside-clear", `${Math.round(dockHeight)}px`);
  }, [dockHeight, resting]);

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-[min(1.5rem,calc(100svh-var(--aside-clear,6rem)-2rem-var(--aside-h,0px)))]",
        className,
      )}
      data-flow-scope=""
      ref={ref}
    >
      {children}
    </aside>
  );
}

const FOLDED_FACTS = 4;

export function FactsFold({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const foldable = count > FOLDED_FACTS + 1;
  const folded = foldable && !open;

  return (
    <>
      <dl
        className="flex flex-col max-sm:data-folded:[&>:nth-child(n+5)]:hidden sm:max-lg:flex-1"
        data-folded={folded ? "" : undefined}
      >
        {children}
      </dl>
      {foldable ? (
        <TextButton
          aria-expanded={open}
          className="self-start sm:hidden"
          onClick={() => setOpen((value) => !value)}
          variant="label"
        >
          {open ? "Fewer details" : `All details · ${count}`}
        </TextButton>
      ) : null}
    </>
  );
}
