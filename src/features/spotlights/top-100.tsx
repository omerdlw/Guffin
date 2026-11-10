"use client";

import {
  type JSX,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useDockActionClass,
  useDockActions,
} from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { useReducedMotion } from "@/motion/lib";
import {
  getLibraryMarksAction,
  setMovieLibraryAction,
} from "@/features/account/actions";
import type { MovieLibraryKind } from "@/features/account/types";
import { applyMovieLibraryChange } from "@/features/account/utils";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { CANON_HREF, mediaHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { useAnyStage } from "@/motion/react";
import { Link, TextButton } from "@/design/components/link";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { DockAction } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import {
  TOP_100_FILTERS,
  TOP_100_KEYS,
  TUNNEL_DOCK_SETTLE_MS,
  WHEEL_DELTA_UNITS,
} from "./constants";
import {
  mountSpotlight,
  SalonPart,
  SalonStage,
  SpotlightDock,
  useSyncedSearchParam,
} from "./shell";
import styles from "./top-100.module.css";
import { Tunnel } from "./tunnel";
import type { CanonFilm, FilmMarks, Filter, Marks } from "./types";
import { typing, votesOf } from "./utils";
import { Image } from "@/design/components/image";

const NONE: ReadonlySet<number> = new Set();

function useCanonMarks(films: CanonFilm[]) {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
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
  const mediaType = films[0]?.mediaType ?? "movie";
  const seenCount = useMemo(
    () => films.filter((film) => watched.has(film.id)).length,
    [films, watched],
  );

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    getLibraryMarksAction(ids, mediaType)
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
  }, [account, ids, mediaType]);

  const toggle = useCallback(
    async (
      target: CanonFilm,
      kind: Extract<MovieLibraryKind, "watched" | "watchlist">,
    ) => {
      if (!auth.isReady || pending) return;
      if (!account) {
        openSignIn();
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
          target.mediaType ?? "movie",
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
    [account, auth.isReady, listed, marks, openSignIn, pending, toast, watched],
  );

  return {
    account,
    known,
    listed,
    pending,
    ready: auth.isReady,
    seenCount,
    toggle,
    watched,
  };
}

function bindTunnelPointer(
  element: HTMLCanvasElement,
  scene: Tunnel,
  {
    onSelect,
    openFilm,
    tip,
  }: {
    onSelect: (index: number) => void;
    openFilm: (index: number) => void;
    tip: HTMLElement | null;
  },
): () => void {
  let captured: number | null = null;
  const stopDragging = () => {
    captured = null;
    delete element.dataset.cursor;
  };

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
    } else if (event.pointerType === "mouse") {
      const index = scene.filmAt(event.clientX, event.clientY);
      if (index >= 0 && index !== scene.selected) {
        element.dataset.cursor = "pointer";
      } else delete element.dataset.cursor;
    }
    if (tip) {
      const flip = event.clientX > window.innerWidth - 280;
      tip.style.transform = `translate3d(${event.clientX + (flip ? -18 : 18)}px, ${event.clientY + 18}px, 0) translateX(${flip ? "-100%" : "0"})`;
    }
  };
  const up = (event: PointerEvent) => {
    if (captured !== event.pointerId) return;
    stopDragging();
    if (event.pointerType !== "mouse") scene.point(null, null);
    if (!scene.drop()) return;
    const index = scene.filmAt(event.clientX, event.clientY);
    if (index < 0) return;
    if (index === scene.selected) openFilm(index);
    else onSelect(index);
  };
  const cancel = (event: PointerEvent) => {
    if (captured !== event.pointerId) return;
    stopDragging();
    scene.drop();
  };
  const leave = () => scene.point(null, null);
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    const unit = WHEEL_DELTA_UNITS[event.deltaMode] ?? 1;
    scene.scroll(event.deltaX * unit, event.deltaY * unit);
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
  };
}

function SeenPanel({
  count,
  filter,
  onFilter,
  opened,
  total,
}: {
  count: number;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  opened: boolean;
  total: number;
}): JSX.Element {
  return (
    <div
      className={cn(
        "fixed top-[clamp(1.25rem,4.5svh,2.5rem)] right-4 z-10 flex flex-col items-end gap-3 transition-opacity duration-settle ease-out-quint sm:right-8",
        opened ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <p className="flex items-end gap-2.5 text-ink">
        <span className="font-zuume type-display-sm leading-crop lg:type-display-md font-bold tabular-nums">
          {count}
        </span>
        <span className="pb-1 type-meta leading-none text-ink-muted">
          of {total} seen
        </span>
      </p>
      <span
        aria-hidden="true"
        className="relative block h-px w-36 bg-fill-active"
      >
        <span
          className="absolute inset-y-0 left-0 bg-ink-body transition-[width] duration-settle ease-out-quint"
          style={{ width: `${(count / total) * 100}%` }}
        />
      </span>
      <div aria-label="Show" className="flex gap-4 type-meta" role="radiogroup">
        {TOP_100_FILTERS.map((option) => (
          <TextButton
            aria-checked={filter === option.value}
            className={cn("py-1", filter === option.value && "text-ink")}
            key={option.value}
            onClick={() => onFilter(option.value)}
            role="radio"
          >
            {option.label}
          </TextButton>
        ))}
      </div>
    </div>
  );
}

/** The canvas's text colour as red, green and blue: the page's ink. */
function inkOf(element: HTMLElement): [number, number, number] {
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return [255, 255, 255];
  context.fillStyle = getComputedStyle(element).color;
  context.fillRect(0, 0, 1, 1);
  const [r = 255, g = 255, b = 255] = context.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Where the film in the gate stands: the numeral, the camera and the slot agree. */
const SLOT_CLASS =
  "pointer-events-none fixed inset-x-4 top-[clamp(4.5rem,11svh,7rem)] bottom-[calc(var(--dock-h,6rem)+13rem)] sm:inset-x-8";

function Facts({
  film,
  opened,
}: {
  film: CanonFilm;
  opened: boolean;
}): JSX.Element {
  const where = [film.year, ...film.genres.slice(0, 2)]
    .filter(Boolean)
    .join(" \u00b7 ");
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-[calc(var(--dock-h,6rem)+4.75rem)] z-10 flex flex-col items-center gap-2 text-center transition-opacity duration-settle ease-out-quint sm:inset-x-8",
        opened ? "opacity-100" : "opacity-0",
      )}
    >
      <p className="type-meta text-ink-muted tabular-nums">No. {film.rank}</p>
      <h2 className="max-w-full truncate font-zuume type-display-sm leading-crop font-bold text-ink lg:type-display-md">
        {film.title}
      </h2>
      <p className="flex items-center gap-2 type-meta text-ink-muted">
        {film.rating ? (
          <>
            <Icon icon="solar:star-bold" size={14} />
            <span className="text-ink-lead tabular-nums">
              {film.rating.toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{votesOf(film.votes)} votes</span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span>{where}</span>
      </p>
    </div>
  );
}

/**
 * The countdown rail: a tick a film, No. 100 at the left and No. 1 at the
 * right. Seen films stand taller, and the film in the gate tallest.
 */
function Rail({
  films,
  onPick,
  opened,
  selected,
  watched,
}: {
  films: CanonFilm[];
  onPick: (index: number) => void;
  opened: boolean;
  selected: number;
  watched: ReadonlySet<number>;
}): JSX.Element {
  const track = useRef<HTMLDivElement>(null);
  const count = films.length;
  const at = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return selected;
    const share = Math.min(
      0.9999,
      Math.max(0, (clientX - rect.left) / rect.width),
    );
    return count - 1 - Math.floor(share * count);
  };
  const film = films[selected]!;
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(var(--dock-h,6rem)+1.25rem)] z-10 px-4 transition-opacity duration-settle ease-out-quint sm:px-8",
        opened ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <span className="type-micro text-ink-muted tabular-nums">{count}</span>
        <div
          aria-label="Position in the countdown"
          aria-orientation="horizontal"
          aria-valuemax={count}
          aria-valuemin={1}
          aria-valuenow={film.rank}
          aria-valuetext={`No. ${film.rank}, ${film.title}`}
          className="flex h-9 min-w-0 flex-1 cursor-pointer touch-none items-end gap-px"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            onPick(at(event.clientX));
          }}
          onPointerMove={(event) => {
            if (event.buttons) onPick(at(event.clientX));
          }}
          ref={track}
          role="slider"
          tabIndex={0}
        >
          {films
            .map((entry, index) => ({ entry, index }))
            .reverse()
            .map(({ entry, index }) => (
              <span
                className="flex h-full min-w-0 flex-1 items-end justify-center"
                key={entry.id}
              >
                <span
                  className={cn(
                    "block w-px rounded-full transition-[height,background-color] duration-light ease-out-cream",
                    index === selected
                      ? "h-full bg-ink"
                      : watched.has(entry.id)
                        ? "h-3.5 bg-ink-body"
                        : "h-2 bg-fill-active",
                  )}
                />
              </span>
            ))}
        </div>
        <span className="type-micro text-ink-muted tabular-nums">1</span>
      </div>
    </div>
  );
}

function Canon({
  films,
  start,
  title,
}: {
  films: CanonFilm[];
  start: number;
  title: string;
}): JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const stage = useAnyStage();
  const { navigate } = useDockActions();
  const canvas = useRef<HTMLCanvasElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const tunnel = useRef<Tunnel | null>(null);
  const nearRef = useRef(start);
  const [view, setView] = useState({
    failed: false,
    hovered: -1,
    opened: false,
  });
  const [near, setNear] = useState(start);
  const [settled, setSettled] = useState(start);
  const [filter, setFilter] = useState<Filter>("all");
  const { account, known, listed, pending, ready, seenCount, toggle, watched } =
    useCanonMarks(films);
  const { failed, hovered, opened } = view;
  const shown = films[near]!;
  const film = films[settled]!;
  const pointed = hovered >= 0 && hovered !== near ? films[hovered] : undefined;
  const patchView = (patch: Partial<typeof view>) =>
    setView((current) => ({ ...current, ...patch }));

  useEffect(() => {
    const timer = setTimeout(() => setSettled(near), TUNNEL_DOCK_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [near]);

  useSyncedSearchParam("rank", String(film.rank));

  const pick = useCallback((index: number) => {
    tunnel.current?.select(index);
  }, []);

  const openAt = useCallback(
    (index: number) => {
      const target = films[index];
      if (target)
        void navigate(mediaHref(target.mediaType ?? "movie", target.id));
    },
    [films, navigate],
  );

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const { renderer: scene, dispose } = mountSpotlight(
      stage,
      element,
      (canvas, loop) =>
        Tunnel.create(
          canvas,
          films,
          nearRef.current,
          {
            hovered: (index) => patchView({ hovered: index }),
            opened: () => patchView({ opened: true }),
            selected: (index) => {
              nearRef.current = index;
              setNear(index);
            },
          },
          loop,
        ),
      2,
    );
    if (!scene) {
      patchView({ failed: true, opened: true });
      return dispose;
    }
    tunnel.current = scene;

    const frame = slot.current;
    const fit = () => {
      if (!frame) return;
      const { height, left, top, width } = frame.getBoundingClientRect();
      scene.setSlot({ height, left, top, width });
    };
    fit();
    const sizing = new ResizeObserver(fit);
    if (frame) sizing.observe(frame);

    const unbind = bindTunnelPointer(element, scene, {
      onSelect: pick,
      openFilm: openAt,
      tip: tip.current,
    });
    return () => {
      sizing.disconnect();
      unbind();
      dispose();
      tunnel.current = null;
    };
  }, [films, openAt, pick, stage]);

  useEffect(() => tunnel.current?.setReduced(reduced), [reduced]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const paint = () => tunnel.current?.setInk(inkOf(element));
    paint();
    const watching = new MutationObserver(paint);
    watching.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme", "style"],
      attributes: true,
    });
    return () => watching.disconnect();
  }, [films]);

  useEffect(() => {
    tunnel.current?.setMarks(
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

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || typing(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const scene = tunnel.current;
      if (!scene) return;
      if (event.key in TOP_100_KEYS) {
        event.preventDefault();
        scene.step(TOP_100_KEYS[event.key]! as 1 | -1);
      } else if (event.key === "Home") {
        event.preventDefault();
        scene.select(films.length - 1);
      } else if (event.key === "End") {
        event.preventDefault();
        scene.select(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [films.length]);

  const onKey = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    openAt(near);
  };

  const control = useMemo(
    () => (
      <WallAction
        disabled={!ready || pending || (account !== null && !known)}
        listed={listed.has(film.id)}
        onOpen={() =>
          void navigate(mediaHref(film.mediaType ?? "movie", film.id))
        }
        onToggle={(kind) => void toggle(film, kind)}
        seen={watched.has(film.id)}
        title={film.title}
      />
    ),
    [account, film, known, listed, navigate, pending, ready, toggle, watched],
  );

  return (
    <>
      <SpotlightDock
        control={control}
        description={[`No. ${film.rank}`, film.year, film.genres[0]]
          .filter(Boolean)
          .join(" \u00b7 ")}
        icon={tmdbImageUrl("poster", film.posterPath, "w185")!}
        path={CANON_HREF}
        title={film.title}
      />

      <div
        aria-hidden="true"
        className={cn(
          SLOT_CLASS,
          "flex items-center justify-center transition-opacity duration-settle ease-out-quint",
          opened && !failed ? "opacity-100" : "opacity-0",
        )}
      >
        <span
          className={cn(
            styles.numeral,
            "font-zuume font-bold text-ink/5 tabular-nums select-none",
          )}
        >
          {shown.rank}
        </span>
      </div>

      <div aria-hidden="true" className={SLOT_CLASS} ref={slot} />

      <canvas
        aria-label={`${title} as a countdown from No. ${films.length} to No. 1. Scroll, drag or use the arrow keys to fly; Enter opens the film in the gate.`}
        className="fixed inset-0 block h-full w-full cursor-grab text-ink touch-none outline-none select-none data-[cursor=drag]:cursor-grabbing data-[cursor=pointer]:cursor-pointer"
        onKeyDown={onKey}
        ref={canvas}
        role="application"
        tabIndex={0}
      />
      <h1 className="sr-only">{title}</h1>

      <SalonPart name="chrome">
        {failed ? (
          <PlainWall films={films} watched={watched} />
        ) : (
          <>
            <p
              className={cn(
                "pointer-events-none fixed top-[clamp(1.25rem,4.5svh,2.5rem)] left-4 z-10 flex flex-col gap-1 type-meta text-ink-muted transition-opacity duration-settle ease-out-quint sm:left-8",
                opened ? "opacity-100" : "opacity-0",
              )}
            >
              <span className="text-ink">{title}</span>
              <span>The countdown: No. {films.length} to No. 1</span>
            </p>
            <Facts film={shown} opened={opened} />
            <Rail
              films={films}
              onPick={pick}
              opened={opened}
              selected={near}
              watched={watched}
            />
          </>
        )}

        {known ? (
          <SeenPanel
            count={seenCount}
            filter={filter}
            onFilter={setFilter}
            opened={opened}
            total={films.length}
          />
        ) : null}
      </SalonPart>

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-20 max-w-64 transition-opacity duration-light ease-out-cream",
          pointed && !failed ? "opacity-100" : "opacity-0",
        )}
        ref={tip}
      >
        {pointed ? (
          <div className="flex items-baseline gap-2 rounded-card bg-glass px-3 py-1.5 type-meta font-medium text-ink-lead ring-1 ring-edge-hover">
            <span className="text-ink-muted tabular-nums">{pointed.rank}</span>
            <span className="truncate">{pointed.title}</span>
            <span className="text-ink-muted tabular-nums">{pointed.year}</span>
          </div>
        ) : null}
      </div>

      <ol className="sr-only">
        {films.map((entry) => (
          <li key={entry.id}>
            <Link href={mediaHref(entry.mediaType ?? "movie", entry.id)}>
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
                href={mediaHref(entry.mediaType ?? "movie", entry.id)}
              >
                <Image
                  alt={`No. ${entry.rank}: ${entry.title}`}
                  src={src}
                  wrapperClassName="aspect-[2/3] h-auto"
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function TunnelView({
  films,
  startRank,
  title,
}: {
  films: CanonFilm[];
  startRank: number | null;
  title: string;
}): JSX.Element {
  const found = films.findIndex((entry) => entry.rank === startRank);
  return (
    <SalonStage className="wall-page relative h-dvh overflow-hidden">
      <Canon
        films={films}
        key={title}
        start={found >= 0 ? found : films.length - 1}
        title={title}
      />
    </SalonStage>
  );
}
