"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn } from "@/ui/cn";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useAnyStage } from "@/motion/engine";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { CANON_HREF, movieHref } from "@/config/routes";
import {
  applyMovieLibraryChange,
  getLibraryMarksAction,
  setMovieLibraryAction,
  type MovieLibraryKind,
} from "@/features/account";
import { createSignInSurfaceEntry, useAuth } from "@/features/auth";
import { Button, DockAction, Icon } from "@/ui";
import type { CanonFilm } from "../types";
import { COLUMNS } from "../gl/wall/geometry";
import { Wall, type FilmMarks } from "../gl/wall/renderer";
import { SpotlightDock } from "../components/dock";
import { SalonPart, SalonStage } from "../motion";
import { mountSpotlight } from "../scene";

type Filter = "all" | "seen" | "unseen";

const FILTERS: readonly { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Seen", value: "seen" },
  { label: "To watch", value: "unseen" },
];

interface Marks {
  account: string | null;
  listed: ReadonlySet<number>;
  watched: ReadonlySet<number>;
}

const NONE: ReadonlySet<number> = new Set();

const KEYS: Record<string, number> = {
  ArrowDown: COLUMNS,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -COLUMNS,
};

function Canon({ films }: { films: CanonFilm[] }): JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const stage = useAnyStage();
  const auth = useAuth();
  const toast = useToast();
  // Through the framework, so the page leaves before the film arrives.
  const { navigate, openSurface } = useDockActions();
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const wall = useRef<Wall | null>(null);
  const selectedRef = useRef(0);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(-1);
  const [opened, setOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState(false);
  const [marks, setMarks] = useState<Marks>({
    account: null,
    listed: NONE,
    watched: NONE,
  });

  const account = auth.isAuthenticated ? (auth.user?.id ?? null) : null;
  const known = account !== null && marks.account === account;
  const watched = known ? marks.watched : NONE;
  const listed = known ? marks.listed : NONE;
  const ids = useMemo(() => films.map((film) => film.id), [films]);
  const seenCount = useMemo(
    () => films.filter((film) => watched.has(film.id)).length,
    [films, watched],
  );
  const film = films[selected]!;
  const pointed = hovered >= 0 ? films[hovered] : undefined;

  const pick = useCallback((index: number, glide = true) => {
    selectedRef.current = index;
    setSelected(index);
    wall.current?.select(index, glide);
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const { renderer: scene, dispose } = mountSpotlight(
      stage,
      element,
      (canvas, loop) =>
        Wall.create(
          canvas,
          films,
          { hovered: setHovered, opened: () => setOpened(true) },
          loop,
        ),
      2,
    );
    if (!scene) {
      setFailed(true);
      setOpened(true);
      return dispose;
    }
    wall.current = scene;
    scene.select(selectedRef.current, false);

    let captured: number | null = null;
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      captured = event.pointerId;
      element.setPointerCapture(event.pointerId);
      scene.point(event.clientX, event.clientY);
      scene.grab(event.clientX, event.clientY);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || captured === event.pointerId) {
        scene.point(event.clientX, event.clientY);
      }
      if (captured === event.pointerId) {
        scene.drag(event.clientX, event.clientY);
        element.dataset.cursor = "drag";
      }
      const box = tip.current;
      if (box) {
        const flip = event.clientX > window.innerWidth - 280;
        box.style.transform = `translate3d(${event.clientX + (flip ? -18 : 18)}px, ${event.clientY + 18}px, 0) translateX(${flip ? "-100%" : "0"})`;
      }
    };
    const up = (event: PointerEvent) => {
      if (captured !== event.pointerId) return;
      captured = null;
      delete element.dataset.cursor;
      if (event.pointerType !== "mouse") scene.point(null, null);
      if (!scene.drop()) return;
      const index = scene.filmAt(event.clientX, event.clientY);
      if (index < 0) return;
      if (index === selectedRef.current)
        void navigate(movieHref(films[index]!.id));
      else pick(index);
    };
    const cancel = (event: PointerEvent) => {
      if (captured !== event.pointerId) return;
      captured = null;
      delete element.dataset.cursor;
      scene.drop();
    };
    const leave = () => scene.point(null, null);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? 400 : 1;
      const [dx, dy] = event.shiftKey
        ? [event.deltaY, event.deltaX]
        : [event.deltaX, event.deltaY];
      scene.scroll(dx * unit, dy * unit);
    };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", cancel);
    element.addEventListener("pointerleave", leave);
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", cancel);
      element.removeEventListener("pointerleave", leave);
      element.removeEventListener("wheel", wheel);
      dispose();
      wall.current = null;
    };
  }, [films, navigate, pick, stage]);

  useEffect(() => wall.current?.setReduced(reduced), [reduced]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    getLibraryMarksAction(ids)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          report("Top 100 marks", result.error);
          return;
        }
        setMarks({
          account,
          listed: new Set(result.watchlist),
          watched: new Set(result.watched),
        });
      })
      .catch((error) => report("Top 100 marks", error));
    return () => {
      cancelled = true;
    };
  }, [account, ids]);

  useEffect(() => {
    const scene = wall.current;
    if (!scene) return;
    scene.setMarks(
      known
        ? films.map<FilmMarks>((entry) => {
            const seen = watched.has(entry.id);
            return {
              listed: listed.has(entry.id),
              match: filter === "all" || (filter === "seen") === seen,
              seen,
            };
          })
        : null,
    );
  }, [films, filter, known, listed, watched]);

  const signIn = useCallback(() => {
    void openSurface(
      createSignInSurfaceEntry({ next: window.location.pathname }),
    );
  }, [openSurface]);

  const toggle = useCallback(
    async (
      target: CanonFilm,
      kind: Extract<MovieLibraryKind, "watched" | "watchlist">,
    ) => {
      if (!auth.isReady || pending) return;
      if (!account) {
        signIn();
        return;
      }
      const before = marks;
      const state = {
        liked: false,
        watched: watched.has(target.id),
        watchlist: listed.has(target.id),
      };
      const apply = (next: typeof state) => {
        const nextWatched = new Set(watched);
        const nextListed = new Set(listed);
        if (next.watched) nextWatched.add(target.id);
        else nextWatched.delete(target.id);
        if (next.watchlist) nextListed.add(target.id);
        else nextListed.delete(target.id);
        setMarks({ account, listed: nextListed, watched: nextWatched });
      };
      apply(applyMovieLibraryChange(state, kind, !state[kind]));
      setPending(true);
      try {
        const result = await setMovieLibraryAction(
          target.id,
          kind,
          !state[kind],
        );
        if (result.success) apply(result.state);
        else {
          setMarks(before);
          toast(result.error);
        }
      } catch (error) {
        report("Top 100 toggle", error);
        setMarks(before);
        toast(
          toUserMessage(error, { fallback: "Could not update your library" }),
        );
      } finally {
        setPending(false);
      }
    },
    [account, auth.isReady, listed, marks, pending, signIn, toast, watched],
  );

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key in KEYS) {
      event.preventDefault();
      const count = films.length;
      pick((((selected + KEYS[event.key]!) % count) + count) % count);
    } else if (event.key === "Enter") {
      event.preventDefault();
      void navigate(movieHref(film.id));
    }
  };

  const control = useMemo(
    () => (
      <WallAction
        disabled={!auth.isReady || pending || (account !== null && !known)}
        listed={listed.has(film.id)}
        onOpen={() => void navigate(movieHref(film.id))}
        onToggle={(kind) => void toggle(film, kind)}
        seen={watched.has(film.id)}
        title={film.title}
      />
    ),
    [
      account,
      auth.isReady,
      film,
      known,
      listed,
      navigate,
      pending,
      toggle,
      watched,
    ],
  );

  return (
    <>
      <SpotlightDock
        control={control}
        description={[`No. ${film.rank}`, film.year, film.genres[0]]
          .filter(Boolean)
          .join(" · ")}
        icon={tmdbImageUrl("poster", film.posterPath, "w185")!}
        path={CANON_HREF}
        title={film.title}
      />
      <canvas
        aria-label="The IMDb Top 100 as a wall of posters. Arrow keys move between films, Enter opens one."
        className="fixed inset-0 block h-full w-full cursor-grab touch-none outline-none select-none data-[cursor=drag]:cursor-grabbing"
        onKeyDown={onKey}
        ref={canvas}
        role="application"
        tabIndex={0}
      />
      <h1 className="sr-only">The IMDb Top 100</h1>

      <SalonPart name="chrome">
        {failed ? <PlainWall films={films} watched={watched} /> : null}

        {known ? (
          <div
            className={cn(
              "fixed top-[clamp(1.25rem,4.5svh,2.5rem)] right-4 z-10 flex flex-col items-end gap-3 [transition:opacity_1.2s] sm:right-8",
              opened ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <p className="flex items-end gap-2.5 text-ink">
              <span className="font-zuume type-display-sm leading-crop lg:type-display-md font-bold tabular-nums">
                {seenCount}
              </span>
              <span className="pb-1 type-meta leading-none text-ink-muted">
                of {films.length} seen
              </span>
            </p>
            <span
              aria-hidden="true"
              className="relative block h-px w-36 bg-fill-active"
            >
              <span
                className="absolute inset-y-0 left-0 bg-ink-body transition-[width] duration-settle ease-out-quint"
                style={{ width: `${(seenCount / films.length) * 100}%` }}
              />
            </span>
            <div
              aria-label="Show"
              className="flex gap-4 type-meta"
              role="radiogroup"
            >
              {FILTERS.map((option) => (
                <button
                  aria-checked={filter === option.value}
                  className={cn(
                    "py-1 [transition:color_0.3s]",
                    filter === option.value
                      ? "text-ink"
                      : "text-ink-body hover:text-ink focus-visible:text-ink",
                  )}
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  role="radio"
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </SalonPart>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-20 max-w-64 [transition:opacity_0.35s]",
          pointed && !failed ? "opacity-100" : "opacity-0",
        )}
        ref={tip}
      >
        {pointed ? (
          <div className="flex items-baseline gap-2 rounded-card bg-black/70 px-3 py-1.5 type-meta font-medium text-ink-lead ring-1 ring-edge-hover backdrop-blur-xl">
            <span className="text-ink-muted tabular-nums">{pointed.rank}</span>
            <span className="truncate">{pointed.title}</span>
            <span className="text-ink-muted tabular-nums">{pointed.year}</span>
          </div>
        ) : null}
      </div>

      <ol className="sr-only">
        {films.map((entry) => (
          <li key={entry.id}>
            <Link href={movieHref(entry.id)}>
              No. {entry.rank}: {entry.title}
              {watched.has(entry.id) ? ", seen" : ""}
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}

function WallAction({
  disabled,
  listed,
  onOpen,
  onToggle,
  seen,
  title,
}: {
  disabled: boolean;
  listed: boolean;
  onOpen: () => void;
  onToggle: (kind: "watched" | "watchlist") => void;
  seen: boolean;
  title: string;
}): JSX.Element {
  const actionClass = useDockActionClass();
  return (
    <DockAction>
      <div className="flex w-full gap-2">
        <Button
          aria-pressed={seen}
          className={actionClass({
            className: "min-w-0 flex-1",
            isActive: seen,
          })}
          disabled={disabled}
          onClick={() => onToggle("watched")}
          type="button"
        >
          <Icon
            icon={seen ? "solar:check-circle-bold" : "solar:eye-bold"}
            size={16}
          />
          <span className="truncate">{seen ? "Seen" : "Mark seen"}</span>
        </Button>
        {seen ? null : (
          <Button
            aria-pressed={listed}
            className={actionClass({
              className: "min-w-0 flex-1",
              isActive: listed,
            })}
            disabled={disabled}
            onClick={() => onToggle("watchlist")}
            type="button"
          >
            <Icon
              icon={listed ? "solar:bookmark-bold" : "solar:bookmark-linear"}
              size={16}
            />
            <span className="truncate">{listed ? "Saved" : "Watchlist"}</span>
          </Button>
        )}
        <Button
          aria-label={`Open ${title}`}
          className={actionClass({ className: "w-12 shrink-0 px-0" })}
          onClick={onOpen}
          type="button"
        >
          <Icon icon="solar:arrow-right-up-linear" size={16} />
        </Button>
      </div>
    </DockAction>
  );
}

function PlainWall({
  films,
  watched,
}: {
  films: CanonFilm[];
  watched: ReadonlySet<number>;
}): JSX.Element {
  return (
    <div className="fixed inset-0 overflow-y-auto px-4 pt-10 pb-[calc(var(--dock-h,6rem)+3rem)] sm:px-8">
      <ol className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {films.map((entry) => {
          const src = tmdbImageUrl("poster", entry.posterPath, "w185");
          return (
            <li key={entry.id}>
              <Link
                className={cn(
                  "ui-fade block overflow-hidden",
                  watched.has(entry.id)
                    ? "opacity-100"
                    : "opacity-70 hover:opacity-100 focus-visible:opacity-100",
                )}
                href={movieHref(entry.id)}
              >
                {src ? (
                  <img
                    alt={`No. ${entry.rank}: ${entry.title}`}
                    className="aspect-[2/3] w-full object-cover"
                    loading="lazy"
                    src={src}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// The page's hooks reach the salon's stage from inside it.
export function WallView(props: { films: CanonFilm[] }): JSX.Element {
  return (
    <SalonStage className="wall-page relative h-dvh overflow-hidden">
      <Canon {...props} />
    </SalonStage>
  );
}
