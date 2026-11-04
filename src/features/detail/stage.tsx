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
import { defineModal, useModal } from "@omerdlw/base-framework/modules/modal";
import { artworkTarget } from "@/features/artwork/utils";
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
import { Tooltip } from "@/ui/feedback";
import { SegmentedControl } from "@/ui/form";
import { BOTTOM_COVER, Icon, MediaCard, SIDE_COVER } from "@/ui/media";
import { MAIN_COLUMN_CLASS, RADIUS, TONE, VIEW_CLASS } from "@/ui/tokens";
import {
  BACKDROP_CUT_RUNG,
  BACKDROP_FOCUS,
  BACKDROP_HALATION,
  BACKDROP_POSITION,
  DETAIL_ACTION_SECONDARY_SIZE,
  DETAIL_ACTION_SIZE,
  MEDIA_GRID_CLASS,
  SCROLL_TOP_MARGIN,
  WALL_CONTROL_CLASS,
  WALL_REACH_STEP,
} from "./constants";
import { Heading } from "./layout";
import {
  DetailDeck,
  DetailMarquee,
  DetailPart,
  DetailSection,
  DetailStageRoot,
  DetailSwap,
  useDetailAct,
} from "./motion";
import type {
  ImageModalData,
  ModalProps,
  StageWallSet,
  WallPicture,
  WallSet,
} from "./types";
import { defocusAt, toCardImage } from "./utils";

const BACKDROP_EDGES = { bottom: BOTTOM_COVER, side: SIDE_COVER };

const LeadContext = createContext<(src: string | null) => void>(() => {});

export const useLead = () => use(LeadContext);

const WallSetContext = createContext<StageWallSet>({
  set: null,
  choose: () => {},
});

const useWallSet = () => use(WallSetContext);

export function DetailStage({
  children,
  picture,
}: {
  children: ReactNode;
  picture: string | null;
}) {
  const [lead, setLead] = useState<string | null>(null);
  const [set, choose] = useState<string | null>(null);
  const wall = useMemo(() => ({ set, choose }), [set]);

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
        label={
          shortLabel && secondary ? (
            shortLabel
          ) : shortLabel ? (
            <>
              <span className="sm:max-xl:hidden">{label}</span>
              <span className="hidden sm:max-xl:inline">{shortLabel}</span>
            </>
          ) : (
            label
          )
        }
      />
    </DetailPart>
  );
}

const INTERMISSION = {
  after: step(11),
  drift: step(9),
  enter: step(4),
  leave: step(2),
};

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
      {...INTERMISSION}
      ease={POINTS.silk}
      image={image}
      paused={act === "leaving" || act === "gone" || away}
      title={title}
    />
  );
}

function ImageModalView({ data }: ModalProps<ImageModalData>) {
  return (
    <img
      alt={data.alt}
      className="max-h-[85vh] max-w-[92vw] rounded-sheet object-contain ring-1 ring-edge-hover"
      draggable={false}
      src={data.src}
    />
  );
}

export const ImageModal = defineModal({
  chrome: "bare",
  component: ImageModalView,
  position: "center",
});

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

export function WallButton({ set }: { set: string }) {
  const wall = useWall();
  const { choose } = useWallSet();
  const button = useRef<HTMLButtonElement>(null);
  if (!wall) return null;
  return (
    <Tooltip position="top" text="See the whole gallery">
      <button
        aria-label="See the whole gallery"
        className={cn(WALL_CONTROL_CLASS, "w-8")}
        onClick={() => {
          choose(set);
          wall.open(button.current?.closest("section") ?? null);
        }}
        ref={button}
        type="button"
      >
        <Icon icon="solar:widget-4-linear" size={16} />
      </button>
    </Tooltip>
  );
}

export function GalleryWall({
  back,
  sets,
  title,
}: {
  back: string;
  sets: WallSet[];
  title: string;
}) {
  const wall = useWall();
  const lead = useLead();
  const { set } = useWallSet();
  const [openImage] = useModal(ImageModal);
  const [chosen, setChosen] = useState(set ?? sets[0]?.key);
  const [reach, setReach] = useState(WALL_REACH_STEP);
  const end = useRef<HTMLDivElement>(null);
  const shown = sets.find((item) => item.key === chosen) ?? sets[0];
  const total = shown?.pictures.length ?? 0;

  useEffect(() => () => lead(null), [lead]);

  useEffect(() => {
    const element = end.current;
    if (!element || reach >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setReach((count) => count + WALL_REACH_STEP);
      },
      { rootMargin: "0px 0px 100% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [reach, total]);

  if (!shown) return null;

  const choose = (key: string) => {
    setChosen(key);
    setReach(WALL_REACH_STEP);
  };

  const open = (picture: WallPicture, index: number) => {
    if (!picture.full) return;
    const data: ImageModalData = {
      alt: `${shown.noun[0].toUpperCase()}${shown.noun.slice(1)} ${index + 1} of ${title}`,
      src: picture.full,
    };
    void openImage(data);
  };

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
      <DetailSection className="flex w-full flex-col" cue="wall">
        <Heading
          actions={
            <div className="flex items-center gap-2">
              {sets.length > 1 ? (
                <SegmentedControl
                  ariaLabel="Gallery images"
                  className={TONE.tabs}
                  items={sets.map((item) => ({
                    key: item.key,
                    label: `${item.label} ${item.pictures.length}`,
                  }))}
                  onChange={choose}
                  value={shown.key}
                />
              ) : null}
              <button
                className={cn(WALL_CONTROL_CLASS, `px-3 ${TONE.label}`)}
                onClick={() => wall?.close()}
                type="button"
              >
                <Icon icon="solar:close-circle-linear" size={14} />
                {back}
              </button>
            </div>
          }
          icon="solar:gallery-wide-bold"
          title={`${title} · Gallery`}
        />
        <DetailSwap
          className={cn("grid gap-3", MEDIA_GRID_CLASS[shown.aspect])}
          cue="tiles"
          id={shown.key}
        >
          <div
            className="contents"
            onPointerLeave={() => lead(null)}
            onPointerOver={(event) => {
              if (event.pointerType !== "mouse") return;
              const card = (event.target as Element).closest("[data-still]");
              const index = Number(card?.getAttribute("data-still"));
              const picture = Number.isInteger(index)
                ? shown.pictures[index]
                : undefined;
              lead(picture?.lead ?? null);
            }}
          >
            {shown.pictures.slice(0, reach).map((picture, index) => (
              <div
                className="overflow-hidden"
                key={picture.path}
                style={{ borderRadius: RADIUS.card }}
              >
                <DetailPart index={index} name="tile">
                  <MediaCard
                    {...artworkTarget(shown.slot, picture.path)}
                    aspect={shown.aspect}
                    data-still={String(index)}
                    image={{
                      crossOrigin: picture.crossOrigin,
                      sizes: picture.sizes,
                      src: picture.src,
                      srcSet: picture.srcSet,
                    }}
                    label={`View ${shown.noun} ${index + 1} of ${title}`}
                    onClick={() => open(picture, index)}
                    radius={RADIUS.card}
                  />
                </DetailPart>
              </div>
            ))}
          </div>
        </DetailSwap>
        <div aria-hidden="true" className="h-px" ref={end} />
      </DetailSection>
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
