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
import { useDockActions } from "@omerdlw/base-framework/dock";
import { Link } from "@/design/components/link";
import { cn } from "@/design/ui";
import { useCanonMarks } from "@/features/spotlights/marks";
import {
  mountSpotlight,
  SalonPart,
  SalonStage,
  SpotlightDock,
  useSyncedSearchParam,
} from "@/features/spotlights/shell";
import {
  type CanonFilm,
  type FilmMarks,
  type Filter,
  TUNNEL_SLOT_CLASS,
  typing,
} from "@/features/spotlights/spotlights";
import {
  Facts,
  PlainWall,
  Rail,
  SeenPanel,
  WallAction,
} from "@/features/spotlights/wall";
import { CANON_HREF, mediaHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { useReducedMotion } from "@/motion/lib";
import { useAnyStage } from "@/motion/react";
import styles from "./top-100.module.css";
import type { Tunnel } from "./tunnel";

const TUNNEL_DOCK_SETTLE_MS = 160;

const TOP_100_KEYS: Record<string, number> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
  PageDown: 1,
  PageUp: -1,
};

const WHEEL_DELTA_UNITS: Readonly<Record<number, number>> = {
  1: 32,
  2: 400,
};

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
    let live = true;
    let unmount: (() => void) | undefined;
    const start = (TunnelScene: typeof Tunnel): (() => void) => {
      const { renderer: scene, dispose } = mountSpotlight(
        stage,
        element,
        (canvas, loop) =>
          TunnelScene.create(
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
    };
    void import("./tunnel").then((module) => {
      if (live) unmount = start(module.Tunnel);
    });
    return () => {
      live = false;
      unmount?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mounts the tunnel once per film set; patchView is recreated each render
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
          TUNNEL_SLOT_CLASS,
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

      <div aria-hidden="true" className={TUNNEL_SLOT_CLASS} ref={slot} />

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
