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
import { BOTTOM_COVER, SIDE_COVER } from "@/design/components/backdrop";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import { Room } from "@/design/components/room";
import { bezier } from "@/motion/curve";
import { Marquee } from "@/motion/marquee";
import { clamp } from "@/motion/math";
import { Projection } from "@/motion/projection";
import { useScrollDriver } from "@/motion/react";
import { Intermission } from "@/motion/screen";
import { useWall } from "@/motion/stage";
import { DetailDeck, DetailPart, DetailStageRoot } from "./motion";

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

const DETAIL_ACTION_SIZE = "h-12 px-4 py-0 disabled:cursor-wait";

const DETAIL_ACTION_SECONDARY_SIZE = "h-11 gap-2 px-3";

const BACKDROP_DEFOCUS_FROM = 24;

const BACKDROP_DEFOCUS_TO = 560;

const BACKDROP_CUT = 1.309;

const DEFOCUS = bezier(0.65, 0, 0.35, 1);

const BACKDROP_HALATION = 0.55;

const BACKDROP_POSITION = "center 20%";

const BACKDROP_FOCUS = [0.5, 0.2] as const;

const CARD_IMAGE_PATH = "/t/p/w1280/";

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
  picture,
}: {
  children: ReactNode;
  picture: string | null;
}) {
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ choose, set }), [set]);

  return (
    <DetailStageRoot grade={picture}>
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
  // Its place in the action group, so the group surfaces one at a time.
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
  onReady,
  src,
  still = null,
}: {
  onReady?: () => void;
  src: string;
  still?: string | null;
}) {
  return (
    <Projection
      cut={BACKDROP_CUT}
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
  src,
  still = null,
  title,
}: {
  children?: ReactNode;
  src: string;
  still?: string | null;
  title?: string;
}) {
  const [ready, setReady] = useState(false);
  // The name plays first, as a curtain: the page's opening waits for it to
  // start leaving (the stage holds `data-play` while a curtain is down).
  const [lifted, lift] = useState(!title);

  // The picture's entrance waits for it to load; a picture that never reports
  // still enters after a moment.
  useEffect(() => {
    const late = setTimeout(() => setReady(true), 2500);
    return () => clearTimeout(late);
  }, []);

  return (
    <div
      className="relative"
      data-curtain={lifted ? undefined : ""}
      data-ready={ready ? "" : undefined}
    >
      <DetailPart name="backdrop">
        <div className="relative">
          <BackdropProjection
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

  useEffect(() => {
    const element = ref.current;
    if (!element || !resting) return;
    const root = document.documentElement;
    const follow = () => {
      const height = parseFloat(root.style.getPropertyValue("--dock-h"));
      if (Number.isFinite(height)) {
        element.style.setProperty("--aside-clear", `${height}px`);
      }
    };
    follow();
    const dock = new MutationObserver(follow);
    dock.observe(root, { attributeFilter: ["style"], attributes: true });
    return () => dock.disconnect();
  }, [resting]);

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
