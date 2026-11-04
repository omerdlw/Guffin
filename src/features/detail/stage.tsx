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
import { useOptionalDockState } from "@omerdlw/base-framework/modules/dock";
import { POINTS } from "@/motion/constants";
import { Room } from "@/motion/kit";
import { marqueePatience } from "@/motion/marquee";
import { Projection } from "@/motion/projection";
import { useScrollDriver } from "@/motion/react";
import { Intermission } from "@/motion/screen";
import { step } from "@/motion/utils";
import { useWall } from "@/motion/wall";
import { ActionButton } from "@/ui/button";
import { cn } from "@/ui/cn";
import { BOTTOM_COVER, SIDE_COVER } from "@/ui/media";
import { MAIN_COLUMN_CLASS, VIEW_CLASS } from "@/ui/tokens";
import {
  BACKDROP_CUT_RUNG,
  BACKDROP_FOCUS,
  BACKDROP_HALATION,
  BACKDROP_POSITION,
  DETAIL_ACTION_SECONDARY_SIZE,
  DETAIL_ACTION_SIZE,
  INTERMISSION_TIMING,
  SCROLL_TOP_MARGIN,
} from "./constants";
import {
  DetailDeck,
  DetailMarquee,
  DetailPart,
  DetailStageRoot,
  useDetailAct,
} from "./motion";
import type { StageWallSet } from "./types";
import { defocusAt, toCardImage } from "./utils";

const BACKDROP_EDGES = { bottom: BOTTOM_COVER, side: SIDE_COVER };

const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useLead = () => use(LeadContext);

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
  const [lead, setLead] = useState<string | null>(null);
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ choose, set }), [set]);

  return (
    <DetailStageRoot grade={lead ?? picture}>
      <Room grain={false} />
      <LeadContext value={setLead}>
        <WallSetContext value={wall}>{children}</WallSetContext>
      </LeadContext>
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
  label,
  secondary = false,
  shortLabel,
  ...props
}: Omit<
  ComponentProps<typeof ActionButton>,
  "ariaLabel" | "className" | "iconSize" | "label"
> & {
  grow?: boolean;
  label: string;
  secondary?: boolean;
  shortLabel?: string;
}): JSX.Element {
  return (
    <DetailPart className={cn("min-w-0", grow && "flex-1")} name="action">
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
  const act = useDetailAct();
  const away = (useWall()?.phase ?? "page") !== "page";

  return (
    <Intermission
      {...INTERMISSION_TIMING}
      ease={POINTS.silk}
      image={image}
      paused={act === "leaving" || act === "gone" || away}
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
      cut={step(BACKDROP_CUT_RUNG)}
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

  return (
    <div className="relative">
      <DetailPart
        name="backdrop"
        patience={title ? marqueePatience() : undefined}
        ready={ready}
      >
        <div className="relative">
          <BackdropProjection
            onReady={() => setReady(true)}
            src={src}
            still={still}
          />
        </div>
      </DetailPart>
      {title ? (
        <DetailMarquee
          className="font-zuume"
          edges={BACKDROP_EDGES}
          focus={BACKDROP_FOCUS}
          part="marquee"
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
    (state) => state.surfacePhase === "idle",
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
        "lg:sticky lg:top-[min(1.5rem,calc(100svh-var(--aside-clear,var(--dock-h,6rem))-2rem-var(--aside-h,0px)))]",
        className,
      )}
      data-flow-scope=""
      ref={ref}
    >
      {children}
    </aside>
  );
}
