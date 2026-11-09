"use client";

import {
  type CSSProperties,
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { movieHref, OSCARS_HREF } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { POINTS } from "@/motion/constants";
import { useAnyStage } from "@/motion/react";
import { step } from "@/motion/utils";
import { Button } from "@/design/components/button";
import { Link } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { cn } from "@/design/foundations/cn";
import { TONE } from "@/design/foundations/tones";
import { DIAL_DRAG_SLOP, DIAL_STEP } from "./constants";
import { Foundry } from "./gl-foundry";
import {
  mountSpotlight,
  SalonPart,
  SalonStage,
  SpotlightDock,
  useGestureStep,
  useSyncedSearchParam,
} from "./shell";
import type { Laureate } from "./types";
import { ordinal, posterOf } from "./utils";
import dial from "./oscars.module.css";
import { Image } from "@/design/components/image";

function WinnersIndex({
  current,
  laureates,
  onClose,
  onPick,
  open,
}: {
  current: number;
  laureates: Laureate[];
  onClose: () => void;
  onPick: (index: number) => void;
  open: boolean;
}): JSX.Element {
  const panel = useRef<HTMLDivElement>(null);
  const decades = useMemo(() => {
    const groups = new Map<number, { film: Laureate; index: number }[]>();
    laureates.forEach((film, index) => {
      const decade = Math.floor(film.ceremonyYear / 10) * 10;
      groups.set(decade, [...(groups.get(decade) ?? []), { film, index }]);
    });
    return [...groups.entries()];
  }, [laureates]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panel.current
      ?.querySelector<HTMLElement>("[aria-current=true]")
      ?.focus({ preventScroll: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          aria-label="All Best Picture winners"
          aria-modal="true"
          className="fixed inset-0 z-20 overflow-y-auto overscroll-contain bg-glass backdrop-blur-xl"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          ref={panel}
          role="dialog"
          transition={{ duration: step(1), ease: POINTS.fade }}
        >
          <div className="mx-auto w-full max-w-[96rem] px-4 pt-6 pb-[calc(var(--dock-h,6rem)+2rem)] sm:px-8 sm:pt-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className={cn(TONE.label, "text-award/80")}>Best Picture</p>
                <p className="mt-1.5 type-body text-ink-muted">
                  {laureates.length} winners, by ceremony
                </p>
              </div>
              <Button
                aria-label="Close"
                icon
                intent="neutral"
                onClick={onClose}
                shape="pill"
              >
                <Icon icon="solar:close-circle-bold" size={18} />
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {decades.map(([decade, films], column) => (
                <motion.section
                  animate={{ opacity: 1 }}
                  initial={{ opacity: 0 }}
                  key={decade}
                  transition={{
                    delay: step(-3) + column * step(-5),
                    duration: step(1),
                    ease: POINTS.fade,
                  }}
                >
                  <h3 className="font-zuume type-display-xs leading-none font-bold text-award/70">
                    {decade}s
                  </h3>
                  <ol className="mt-3 flex flex-col">
                    {films.map(({ film, index }) => (
                      <li key={film.ceremony}>
                        <Button
                          aria-current={index === current ? "true" : undefined}
                          className={cn(
                            "group/winner flex w-full items-center gap-3 py-1.5 text-left",
                            index === current
                              ? "text-award"
                              : "text-ink-body hover:text-ink focus-visible:text-ink",
                          )}
                          onClick={() => onPick(index)}
                          type="button"
                        >
                          <Image
                            alt=""
                            src={tmdbImageUrl("poster", film.posterPath, "w92")}
                            wrapperClassName="h-9 w-6 shrink-0 opacity-70 group-hover/winner:opacity-100 group-focus-visible/winner:opacity-100"
                          />
                          <span className="w-10 shrink-0 type-meta font-semibold tabular-nums opacity-70">
                            {film.ceremonyYear}
                          </span>
                          <span className="min-w-0 truncate type-body font-medium">
                            {film.title}
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </motion.section>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function YearDial({
  index,
  laureates,
  onPick,
  shown,
}: {
  index: number;
  laureates: Laureate[];
  onPick: (index: number) => void;
  shown: boolean;
}): JSX.Element {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const drag = useRef<{ from: number; moved: boolean; start: number } | null>(
    null,
  );
  const last = laureates.length - 1;
  const film = laureates[index];
  const at = (i: number) => width / 2 - i * DIAL_STEP;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry?.contentRect.width ?? 0),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placed = useRef(false);
  useEffect(() => {
    if (!width || drag.current) return;
    if (reduced || !placed.current) {
      placed.current = true;
      x.set(at(index));
      return;
    }
    const controls = animate(x, at(index), {
      duration: step(1),
      ease: POINTS.dolly,
    });
    return () => controls.stop();
  }, [index, reduced, width]);

  const nearest = (position: number) =>
    Math.max(0, Math.min(last, Math.round((width / 2 - position) / DIAL_STEP)));

  return (
    <div
      className={cn(dial.dial, "relative w-full select-none")}
      data-shown={shown ? "" : undefined}
    >
      <div
        aria-label="Ceremony"
        aria-valuemax={laureates.length}
        aria-valuemin={1}
        aria-valuenow={index + 1}
        aria-valuetext={
          film ? `${film.ceremonyYear}, ${film.title}` : undefined
        }
        className="relative h-16 w-full cursor-grab touch-none overflow-hidden outline-none active:cursor-grabbing [mask-image:linear-gradient(90deg,transparent,black_18%,black_82%,transparent)]"
        onKeyDown={(event) => {
          const jump: Record<string, number> = {
            ArrowLeft: -1,
            ArrowDown: -1,
            ArrowRight: 1,
            ArrowUp: 1,
            PageDown: -10,
            PageUp: 10,
          };
          let next: number | null = null;
          if (event.key in jump) next = index + jump[event.key]!;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = last;
          if (next === null) return;
          event.preventDefault();
          onPick(Math.max(0, Math.min(last, next)));
        }}
        onPointerCancel={() => {
          drag.current = null;
          animate(x, at(index), { duration: step(1), ease: POINTS.dolly });
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          x.stop();
          drag.current = { from: x.get(), moved: false, start: event.clientX };
        }}
        onPointerMove={(event) => {
          const hand = drag.current;
          if (!hand) return;
          const dx = event.clientX - hand.start;
          if (!hand.moved && Math.abs(dx) < DIAL_DRAG_SLOP) return;
          hand.moved = true;
          const position = Math.max(at(last), Math.min(at(0), hand.from + dx));
          x.set(position);
          const next = nearest(position);
          if (next !== index) onPick(next);
        }}
        onPointerUp={(event) => {
          const hand = drag.current;
          drag.current = null;
          if (!hand) return;
          let next = nearest(x.get());
          if (!hand.moved) {
            const box = event.currentTarget.getBoundingClientRect();
            next = nearest(x.get() - (event.clientX - box.left - width / 2));
          }
          onPick(next);
          animate(x, at(next), { duration: step(1), ease: POINTS.dolly });
        }}
        ref={root}
        role="slider"
        tabIndex={0}
      >
        <motion.div
          aria-hidden="true"
          className="absolute inset-y-0 left-0"
          style={{ x }}
        >
          {laureates.map((laureate, i) => {
            const decade =
              i > 0 &&
              Math.floor(laureate.ceremonyYear / 10) !==
                Math.floor(laureates[i - 1]!.ceremonyYear / 10);
            const on = i === index;
            return (
              <span
                className="absolute bottom-3 flex -translate-x-1/2 flex-col items-center"
                key={laureate.ceremony}
                style={
                  {
                    "--d": Math.min(48, Math.abs(i - index)),
                    left: i * DIAL_STEP,
                  } as CSSProperties
                }
              >
                {decade ? (
                  <span
                    className={cn(
                      dial.decade,
                      "mb-2 type-micro font-semibold tracking-label text-ink-faint tabular-nums",
                    )}
                  >
                    {Math.floor(laureate.ceremonyYear / 10) * 10}
                  </span>
                ) : null}
                <span
                  className={cn(
                    dial.tick,
                    "block w-px origin-bottom cine-fade",
                    on
                      ? "h-6 bg-award"
                      : decade
                        ? "h-4 bg-ink-muted"
                        : "h-2.5 bg-ink-faint",
                  )}
                />
              </span>
            );
          })}
        </motion.div>
      </div>
      <span
        aria-hidden="true"
        className={cn(
          dial.needle,
          "pointer-events-none absolute bottom-2 left-1/2 h-9 w-px -translate-x-1/2 bg-gradient-to-t from-award to-transparent",
        )}
      />
    </div>
  );
}

function Oscars({
  initial,
  laureates,
}: {
  initial: number;
  laureates: Laureate[];
}): JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const stage = useAnyStage();
  const canvas = useRef<HTMLCanvasElement>(null);
  const plate = useRef<HTMLAnchorElement>(null);
  const foundry = useRef<Foundry | null>(null);
  const [index, setIndex] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [opened, setOpened] = useState(false);
  const film = laureates[index]!;

  const pick = useCallback(
    (next: number) =>
      setIndex(Math.max(0, Math.min(laureates.length - 1, next))),
    [laureates.length],
  );
  useGestureStep((direction) => pick(index + direction), {
    enabled: !browsing,
  });
  const browse = useCallback(() => setBrowsing(true), []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const font = getComputedStyle(plate.current ?? element).fontFamily;
    const { renderer: scene, dispose } = mountSpotlight(
      stage,
      element,
      (canvas, loop) =>
        Foundry.create(canvas, font, { opened: () => setOpened(true) }, loop),
      1.5,
    );
    if (!scene) {
      setFailed(true);
      setOpened(true);
      return dispose;
    }
    foundry.current = scene;
    const place = () => {
      const box = plate.current?.getBoundingClientRect();
      const frame = element.getBoundingClientRect();
      scene.resize();
      if (box) {
        scene.setPlate(
          box.left - frame.left,
          box.top - frame.top,
          box.width,
          box.height,
        );
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    if (plate.current) observer.observe(plate.current);
    const onMove = (event: PointerEvent) => {
      const frame = element.getBoundingClientRect();
      scene.point(event.clientX - frame.left, event.clientY - frame.top);
    };
    const onLeave = () => scene.point(null, null);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      dispose();
      foundry.current = null;
    };
  }, [stage]);

  useEffect(() => foundry.current?.setReduced(reduced), [reduced]);

  useEffect(() => {
    const around = [index + 1, index - 1, index + 2]
      .map((i) => laureates[i])
      .filter((next): next is Laureate => Boolean(next))
      .map(posterOf);
    foundry.current?.show(posterOf(film), String(film.ceremonyYear), around);
  }, [film, index, laureates]);
  useSyncedSearchParam("ceremony", String(film.ceremony));

  return (
    <>
      <SpotlightDock
        action={{
          icon: "solar:list-bold",
          label: "All winners",
          onClick: browse,
        }}
        description={film.director ? `By ${film.director}` : film.title}
        icon={tmdbImageUrl("poster", film.posterPath, "w185")!}
        path={OSCARS_HREF}
        title={film.title}
      />
      <canvas
        aria-hidden="true"
        className="fixed inset-0 h-full w-full"
        ref={canvas}
      />
      <h1 className="sr-only">Best Picture winners of the Academy Awards</h1>

      <SalonPart
        className="relative z-10 mx-auto grid h-dvh w-full max-w-[96rem] grid-rows-[minmax(0,1fr)_auto] px-4 pt-8 pb-[calc(var(--dock-h,6rem)+0.5rem)] sm:px-8 sm:pt-12"
        name="chrome"
      >
        <div className="flex min-h-0 items-center justify-center py-6">
          <Link
            aria-label={`${film.title}, Best Picture at the ${ordinal(film.ceremony)} Academy Awards (${film.ceremonyYear})`}
            className="relative aspect-[2/3] h-[min(calc(100%-4rem),68dvh,calc((100vw-4.5rem)*1.5))] translate-y-[2%] font-zuume"
            href={movieHref(film.id)}
            ref={plate}
          >
            {failed ? (
              <Image
                alt=""
                priority
                src={posterOf(film)}
                wrapperClassName="absolute inset-0"
              />
            ) : null}
          </Link>
        </div>

        <div className="flex flex-col items-center">
          <YearDial
            index={index}
            laureates={laureates}
            onPick={pick}
            shown={opened}
          />
        </div>
      </SalonPart>

      <WinnersIndex
        current={index}
        laureates={laureates}
        onClose={() => setBrowsing(false)}
        onPick={(next) => {
          pick(next);
          setBrowsing(false);
        }}
        open={browsing}
      />
    </>
  );
}

export function OscarsView(props: {
  initial: number;
  laureates: Laureate[];
}): JSX.Element {
  return (
    <SalonStage className="oscars-page relative h-dvh overflow-hidden">
      <Oscars {...props} />
    </SalonStage>
  );
}
