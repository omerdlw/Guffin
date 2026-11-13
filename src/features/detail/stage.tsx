"use client";

import {
  type ComponentProps,
  createContext,
  type JSX,
  type ReactNode,
  use,
  useCallback,
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
import { Room } from "@/motion/kit";
import { marqueePatience } from "@/motion/marquee";
import { clamp } from "@/motion/math";
import { Projection } from "@/motion/projection";
import { useScrollDriver } from "@/motion/react";
import { Intermission } from "@/motion/screen";
import { SCROLLING } from "@/motion/scroll";
import { CURVE, POINTS, step } from "@/motion/time";
import { useWall } from "@/motion/wall";
import {
  DetailDeck,
  DetailMarquee,
  DetailPart,
  DetailStageRoot,
  useDetailAct,
} from "./motion";

interface StageWallSet {
  set: string | null;
  choose: (set: string) => void;
}

const INTERMISSION_TIMING = {
  after: step(11),
  drift: step(9),
  enter: step(4),
  leave: step(2),
};

const SCROLL_TOP_MARGIN = 24;

const DETAIL_ACTION_SIZE = "h-12 px-4 py-0 disabled:cursor-wait";

const DETAIL_ACTION_SECONDARY_SIZE = "h-11 gap-2 px-3";

const BACKDROP_DEFOCUS_FROM = 24;

const BACKDROP_DEFOCUS_TO = 560;

const BACKDROP_CUT_RUNG = 2;

const BACKDROP_HALATION = 0.55;

const BACKDROP_POSITION = "center 20%";

const BACKDROP_FOCUS = [0.5, 0.2] as const;

const CARD_IMAGE_PATH = "/t/p/w1280/";

const defocusAt = (y: number) =>
  CURVE.glide(
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
  const [lead, setShownLead] = useState<string | null>(null);
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ choose, set }), [set]);

  const pending = useRef<string | null | undefined>(undefined);
  const setLead = useCallback((src: string | null) => {
    if (document.documentElement.hasAttribute(SCROLLING)) {
      pending.current = src;
      return;
    }
    pending.current = undefined;
    setShownLead(src);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const settle = new MutationObserver(() => {
      if (root.hasAttribute(SCROLLING) || pending.current === undefined) return;
      const src = pending.current;
      pending.current = undefined;
      setShownLead(src);
    });
    settle.observe(root, { attributeFilter: [SCROLLING], attributes: true });
    return () => settle.disconnect();
  }, []);

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
