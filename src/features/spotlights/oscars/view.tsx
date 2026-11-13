"use client";

import {
  type CSSProperties,
  type JSX,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Image } from "@omerdlw/base-framework/ui";
import { Link } from "@/design/components/link";
import { cn } from "@/design/ui";
import {
  SalonPart,
  SalonStage,
  SpotlightDock,
  useSyncedSearchParam,
} from "@/features/spotlights/shell";
import type { Laureate } from "@/features/spotlights/spotlights";
import { movieHref, OSCARS_HREF } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
} from "@/motion/lib";
import { POINTS, step } from "@/motion/time";
import styles from "./oscars.module.css";

function ordinal(value: number): string {
  const tail = value % 100;
  if (tail >= 11 && tail <= 13) return `${value}th`;
  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

const posterOf = (film: Laureate) =>
  tmdbImageUrl("poster", film.posterPath, "w780")!;

const RING = 300;
const TICK_IN = 272;
const TICK_OUT = 292;
const BAND_IN = 244;
const DRAG_SLOP = 4;

const bearing = (dx: number, dy: number) =>
  (Math.atan2(dx, -dy) * 180) / Math.PI;
const wrap = (n: number, m: number) => ((n % m) + m) % m;
const near = (from: number, to: number) =>
  from + wrap(to - from + 180, 360) - 180;

function Ring({
  active,
  index,
  laureates,
  onHover,
  onPick,
  shown,
}: {
  active: number;
  index: number;
  laureates: Laureate[];
  onHover: (index: number | null) => void;
  onPick: (index: number) => void;
  shown: boolean;
}): JSX.Element {
  const reduced = useReducedMotion();
  const count = laureates.length;
  const gap = 360 / count;
  const film = laureates[active];
  const svg = useRef<SVGSVGElement>(null);
  const wheel = useRef<SVGGElement>(null);
  const lens = useRef<SVGGElement>(null);
  const turn = useMotionValue(-index * gap);
  const aim = useMotionValue(0);
  const [lit, setLit] = useState(false);
  const [held, setHeld] = useState(false);
  const hand = useRef<{
    from: number;
    moved: boolean;
    start: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const paint = () => {
      wheel.current?.setAttribute("transform", `rotate(${turn.get()})`);
      lens.current?.setAttribute("transform", `rotate(${aim.get()})`);
    };
    paint();
    const a = turn.on("change", paint);
    const b = aim.on("change", paint);
    return () => {
      a();
      b();
    };
  }, [aim, turn]);

  const glide = (value: typeof turn, to: number) =>
    reduced
      ? value.set(to)
      : animate(value, to, { damping: 30, stiffness: 260, type: "spring" });

  useEffect(() => {
    if (hand.current?.moved) return;
    const controls = glide(turn, near(turn.get(), -index * gap));
    return () => controls?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- glide is recreated each render; re-aim only when the slot changes
  }, [gap, index]);

  const angleOf = (event: { clientX: number; clientY: number }) => {
    const box = svg.current!.getBoundingClientRect();
    return bearing(
      event.clientX - (box.left + box.width / 2),
      event.clientY - (box.top + box.height / 2),
    );
  };
  const tickAt = (deg: number) =>
    wrap(Math.round((deg - turn.get()) / gap), count);
  const aimAt = (i: number) =>
    glide(aim, near(aim.get(), i * gap + turn.get()));
  const atTop = () => wrap(Math.round(-turn.get() / gap), count);

  return (
    <svg
      aria-label="Ceremony"
      aria-valuemax={count}
      aria-valuemin={1}
      aria-valuenow={active + 1}
      aria-valuetext={film ? `${film.ceremonyYear}, ${film.title}` : undefined}
      className={cn(
        styles.ring,
        "pointer-events-none absolute inset-0 h-full w-full overflow-visible outline-none",
      )}
      data-shown={shown ? "" : undefined}
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
        if (event.key === "End") next = count - 1;
        if (next === null) return;
        event.preventDefault();
        onPick(Math.max(0, Math.min(count - 1, next)));
      }}
      ref={svg}
      role="slider"
      tabIndex={0}
      viewBox={`${-RING} ${-RING} ${RING * 2} ${RING * 2}`}
    >
      <circle
        className="fill-none stroke-ink-faint/40"
        r={TICK_IN - 14}
        strokeWidth={1}
      />
      <g ref={wheel}>
        {laureates.map((laureate, i) => {
          const on = i === active;
          const decade =
            i === 0 ||
            Math.floor(laureate.ceremonyYear / 10) !==
              Math.floor(laureates[i - 1]!.ceremonyYear / 10);
          return (
            <line
              className={cn(
                styles.tick,
                on
                  ? "stroke-award"
                  : decade
                    ? "stroke-ink-muted"
                    : "stroke-ink-faint",
              )}
              key={laureate.ceremony}
              strokeLinecap="round"
              strokeWidth={on ? 2.5 : 1.5}
              style={{ "--i": i } as CSSProperties}
              transform={`rotate(${i * gap})`}
              x1={0}
              x2={0}
              y1={on ? -TICK_IN + 10 : decade ? -TICK_IN - 2 : -TICK_IN + 4}
              y2={-TICK_OUT + (on ? 4 : 0)}
            />
          );
        })}
      </g>
      <g className={styles.lens} data-lit={lit ? "" : undefined} ref={lens}>
        <rect
          className={cn(styles.capsule, held && styles.held)}
          height={TICK_OUT - TICK_IN + 26}
          rx={9}
          width={18}
          x={-9}
          y={-TICK_OUT - 9}
        />
      </g>
      <circle
        className={cn(
          "pointer-events-auto fill-none stroke-transparent",
          held ? "cursor-grabbing" : "cursor-grab",
        )}
        data-cursor="none"
        onPointerCancel={() => {
          hand.current = null;
          setHeld(false);
          onHover(null);
          glide(turn, near(turn.get(), -index * gap));
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          turn.stop();
          hand.current = {
            from: turn.get(),
            moved: false,
            start: angleOf(event),
            x: event.clientX,
            y: event.clientY,
          };
          setHeld(true);
        }}
        onPointerEnter={() => setLit(true)}
        onPointerLeave={() => {
          if (hand.current) return;
          setLit(false);
          onHover(null);
        }}
        onPointerMove={(event) => {
          const deg = angleOf(event);
          const grip = hand.current;
          if (grip) {
            if (
              !grip.moved &&
              Math.hypot(event.clientX - grip.x, event.clientY - grip.y) <
                DRAG_SLOP
            )
              return;
            grip.moved = true;
            turn.set(grip.from + near(0, deg - grip.start));
            aim.set(near(aim.get(), deg));
            onHover(atTop());
            return;
          }
          const i = tickAt(deg);
          onHover(i);
          aimAt(i);
        }}
        onPointerUp={(event) => {
          const grip = hand.current;
          hand.current = null;
          setHeld(false);
          if (!grip) return;
          const next = grip.moved ? atTop() : tickAt(angleOf(event));
          onHover(grip.moved ? null : next);
          if (grip.moved) {
            glide(turn, near(turn.get(), -next * gap));
            aimAt(tickAt(angleOf(event)));
          }
          onPick(next);
        }}
        r={(BAND_IN + RING) / 2}
        strokeWidth={RING - BAND_IN}
      />
    </svg>
  );
}

function Oscars({
  initial,
  laureates,
}: {
  initial: number;
  laureates: Laureate[];
}): JSX.Element {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(initial);
  const [hover, setHover] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const film = laureates[index]!;
  const active = hover ?? index;
  const seen = laureates[active]!;

  useEffect(() => setShown(true), []);

  const pick = useCallback(
    (next: number) =>
      setIndex(Math.max(0, Math.min(laureates.length - 1, next))),
    [laureates.length],
  );
  useSyncedSearchParam("ceremony", String(film.ceremony));

  return (
    <>
      <SpotlightDock
        description={`${seen.ceremonyYear} · ${ordinal(seen.ceremony)} Academy Awards`}
        icon={tmdbImageUrl("poster", seen.posterPath, "w185")!}
        path={OSCARS_HREF}
        title={seen.title}
      />
      <h1 className="sr-only">Best Picture winners of the Academy Awards</h1>

      <SalonPart
        className="fixed inset-0 z-10 flex h-screen w-screen items-center justify-center px-4 pt-8 pb-[6.5rem] sm:px-8"
        name="chrome"
      >
        <div className="relative aspect-square w-[min(100%,calc(100vh-10rem),44rem)]">
          <Ring
            active={active}
            index={index}
            laureates={laureates}
            onHover={setHover}
            onPick={pick}
            shown={shown}
          />
          <div className="pointer-events-none absolute inset-[23%] flex items-center justify-center">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full w-full items-center justify-center"
                exit={{ opacity: 0, scale: reduced ? 1 : 0.98 }}
                initial={{ opacity: 0, scale: reduced ? 1 : 1.02 }}
                key={seen.ceremony}
                transition={{ duration: step(-2), ease: POINTS.fade }}
              >
                <Link
                  aria-label={`${seen.title}, Best Picture at the ${ordinal(seen.ceremony)} Academy Awards (${seen.ceremonyYear})`}
                  className="pointer-events-auto relative aspect-[2/3] h-full shrink-0 overflow-hidden rounded-md shadow-lg"
                  href={movieHref(seen.id)}
                >
                  <Image
                    alt=""
                    priority
                    src={posterOf(seen)}
                    wrapperClassName="absolute inset-0"
                  />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </SalonPart>
    </>
  );
}

export function OscarsView(props: {
  initial: number;
  laureates: Laureate[];
}): JSX.Element {
  return (
    <SalonStage className="oscars-page fixed inset-0 h-screen w-screen overflow-hidden">
      <Oscars {...props} />
    </SalonStage>
  );
}
