"use client";

import {
  type JSX,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "@/motion/lib";
import { POINTS, SCROLLING } from "@/motion/constants";
import { SPRING } from "@/motion/time";
import { step } from "@/motion/utils";
import { movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { cn } from "@/design/foundations/cn";
import { INDEX_LIMIT } from "./constants";
import { Heading, HomePart, HomeSection, useHomeGlimpse } from "./motion";
import type { PopularFilm } from "./types";
import { ambientImage, formatCompact } from "./utils";
import styles from "./index.module.css";
import { Image } from "@/design/components/image";

const PRINT_WIDTH = 192;
const PRINT_HEIGHT = 288;
const PRINT_AT = 0.62;
const PRINT_SWAY = 48;

/**
 * The index: the week's most-watched films as a typeset running order. A
 * print of the film under the pointer follows it down the page, and the room
 * takes that film's colour while it does.
 */
export function HomeIndex({
  films,
}: {
  films: PopularFilm[];
}): JSX.Element | null {
  const shown = films.slice(0, INDEX_LIMIT);
  const reduced = Boolean(useReducedMotion());
  const glimpse = useHomeGlimpse();
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const under = useRef<number | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING.follow);
  const sy = useSpring(y, SPRING.follow);
  const presence = useMotionValue(0);
  const scale = useTransform(presence, [0, 1], [0.94, 1]);

  if (shown.length === 0) return null;

  const place = (
    pointerX: number,
    pointerY: number,
    { height, width }: { height: number; width: number },
  ) => {
    const sway = (pointerX / width - 0.5) * PRINT_SWAY;
    const top = Math.min(
      Math.max(pointerY - PRINT_HEIGHT / 2, 0),
      Math.max(height - PRINT_HEIGHT, 0),
    );
    const left = width * PRINT_AT - PRINT_WIDTH / 2 + sway;
    x.set(left);
    y.set(top);
    if (presence.get() === 0) {
      sx.jump(left);
      sy.jump(top);
    }
  };

  const show = (index: number) => {
    if (active === index) return;
    setActive(index);
    glimpse(ambientImage(shown[index]?.backdropPath ?? null));
    void animate(presence, 1, {
      duration: reduced ? 0 : step(0),
      ease: [...POINTS.expo],
    });
  };

  const hide = () => {
    under.current = null;
    if (active === null) return;
    setActive(null);
    glimpse(null);
    void animate(presence, 0, {
      duration: reduced ? 0 : step(-2),
      ease: [...POINTS.fade],
    });
  };

  /*
   * While the page scrolls, rows slide under a resting pointer and each one
   * would re-grade the whole room. The row is only remembered then, and
   * shown once the page has stopped and the pointer moves again.
   */
  const scrolling = () => document.documentElement.hasAttribute(SCROLLING);

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || scrolling()) return;
    const frame = box.current?.getBoundingClientRect();
    if (!frame) return;
    place(event.clientX - frame.left, event.clientY - frame.top, frame);
    if (under.current !== null && under.current !== active) {
      show(under.current);
    }
  };

  const onFocusRow = (index: number, row: HTMLElement) => {
    const frame = box.current?.getBoundingClientRect();
    if (!frame) return;
    const bounds = row.getBoundingClientRect();
    place(frame.width / 2, bounds.top - frame.top + bounds.height / 2, frame);
    show(index);
  };

  return (
    <HomeSection className="flex w-full flex-col" cue="index">
      <Heading title="Popular this week" />
      <div
        className="relative"
        onPointerLeave={hide}
        onPointerMove={onMove}
        ref={box}
      >
        <ol className={cn(styles.index, "border-b border-rule")}>
          {shown.map((film, index) => {
            const thumb = tmdbImageUrl("poster", film.posterPath, "w92");
            return (
              <HomePart
                as="li"
                className="border-t border-rule"
                index={index}
                key={film.id}
                name="row"
              >
                <DockLink
                  className={cn(
                    styles.row,
                    "group/row grid grid-cols-[2rem_2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:py-4 lg:grid-cols-[4.5rem_minmax(0,1fr)_auto]",
                  )}
                  href={movieHref(film.id)}
                  onFocus={(event) => onFocusRow(index, event.currentTarget)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "mouse") return;
                    under.current = index;
                    if (!scrolling()) show(index);
                  }}
                >
                  <span className="font-zuume type-heading leading-none font-bold text-ink-faint tabular-nums sm:type-display-xs">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="aspect-[2/3] w-10 overflow-hidden rounded-thumb bg-fill sm:hidden">
                    <Image alt="" src={thumb} />
                  </span>
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="min-w-0 truncate font-zuume type-display-xs leading-none font-bold text-ink-body uppercase group-hover/row:text-ink group-focus-visible/row:text-ink sm:type-display-sm lg:type-display-md">
                      {film.title}
                    </span>
                    {film.year ? (
                      <span className="hidden shrink-0 type-meta text-ink-muted tabular-nums md:inline">
                        {film.year}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-4 type-control text-ink-muted tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Icon icon="solar:eye-bold" size={13} />
                      {formatCompact(film.members)}
                    </span>
                    {film.rating ? (
                      <span className="hidden items-center gap-1 sm:inline-flex">
                        <Icon
                          className="text-rated"
                          icon="solar:star-bold"
                          size={12}
                        />
                        {film.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </span>
                </DockLink>
              </HomePart>
            );
          })}
        </ol>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-10 hidden overflow-hidden rounded-card bg-plate ring-1 ring-edge-hover ring-inset lg:block"
          style={{
            height: PRINT_HEIGHT,
            opacity: presence,
            scale,
            width: PRINT_WIDTH,
            x: sx,
            y: sy,
          }}
        >
          {shown.map((film, index) => {
            const src = tmdbImageUrl("poster", film.posterPath, "w342");
            return src ? (
              <Image
                alt=""
                key={film.id}
                loading="eager"
                src={src}
                wrapperClassName={cn(
                  "absolute inset-0 opacity-0 ui-fade",
                  active === index && "opacity-100",
                )}
              />
            ) : null;
          })}
        </motion.div>
      </div>
    </HomeSection>
  );
}
