"use client";

import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AmbientPalette } from "@omerdlw/base-framework/ambient";
import { useDockActions } from "@omerdlw/base-framework/dock";
import { useStageLight } from "@/design/ambient";
import { Link } from "@/design/components/link";
import {
  mountSpotlight,
  SalonPart,
  SalonStage,
  SpotlightDock,
  useSyncedSearchParam,
} from "@/features/spotlights/components/shell";
import { PlainWall, WallAction } from "@/features/spotlights/components/wall";
import { useCanonMarks } from "@/features/spotlights/marks";
import { type CanonFilm, typing } from "@/features/spotlights/model";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { useEngine } from "@/motion/core/provider";
import { useReducedMotion } from "@/motion/lib";
import { CANON_HREF, movieHref } from "@/shared/site";
import type { Tunnel, TunnelFonts } from "./tunnel";

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
  openFilm: (index: number) => void,
): () => void {
  let captured: number | null = null;
  const aim = (x: number, y: number) => {
    if (scene.filmAt(x, y) >= 0) element.dataset.cursor = "pointer";
    else delete element.dataset.cursor;
  };

  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    captured = event.pointerId;
    element.setPointerCapture(event.pointerId);
    scene.point(event.clientX, event.clientY);
    scene.grab(event.clientY);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || captured === event.pointerId) {
      scene.point(event.clientX, event.clientY);
    }
    if (captured === event.pointerId && scene.drag(event.clientY)) {
      element.dataset.cursor = "drag";
    } else if (captured === null && event.pointerType === "mouse") {
      aim(event.clientX, event.clientY);
    }
  };
  const up = (event: PointerEvent) => {
    if (captured !== event.pointerId) return;
    captured = null;
    if (event.pointerType !== "mouse") scene.point(null, null);
    const tapped = scene.drop();
    if (event.pointerType === "mouse") aim(event.clientX, event.clientY);
    else delete element.dataset.cursor;
    if (!tapped) return;
    const hit = scene.tap(event.clientX, event.clientY);
    if (hit?.open) openFilm(hit.film);
  };
  const cancel = (event: PointerEvent) => {
    if (captured !== event.pointerId) return;
    captured = null;
    delete element.dataset.cursor;
    scene.drop();
  };
  const leave = () => {
    if (captured === null) scene.point(null, null);
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    const unit = WHEEL_DELTA_UNITS[event.deltaMode] ?? 1;
    scene.scroll(event.deltaX * unit, event.deltaY * unit);
    // The wall moves under a still pointer, so the cursor is aimed again.
    aim(event.clientX, event.clientY);
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

function fontsOf(element: HTMLElement): TunnelFonts {
  const style = getComputedStyle(element);
  const body = style.fontFamily || "sans-serif";
  const display = style.getPropertyValue("--font-zuume").trim();
  return { body, display: display ? `${display}, ${body}` : body };
}

function Canon({
  films,
  palette,
  start,
  title,
}: {
  films: CanonFilm[];
  palette: AmbientPalette | null;
  start: number;
  title: string;
}): JSX.Element {
  const reduced = Boolean(useReducedMotion());
  const engine = useEngine();
  const { navigate } = useDockActions();
  const canvas = useRef<HTMLCanvasElement>(null);
  const tunnel = useRef<Tunnel | null>(null);
  const [failed, setFailed] = useState(false);
  // Nothing is chosen on arrival; the dock shows the page until a tap.
  const [near, setNear] = useState<number | null>(null);
  const [settled, setSettled] = useState<number | null>(null);
  const { account, known, listed, pending, ready, toggle, watched } =
    useCanonMarks(films);
  const film = settled === null ? null : films[settled]!;
  // The light follows the chosen film once the choice has settled.
  useStageLight(
    film ? (tmdbImageUrl("backdrop", film.backdropPath, "w300") ?? null) : null,
    {
      palette,
    },
  );

  useEffect(() => {
    const timer = setTimeout(() => setSettled(near), TUNNEL_DOCK_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [near]);

  useSyncedSearchParam("rank", film ? String(film.rank) : null);

  const openAt = useCallback(
    (index: number) => {
      const target = films[index];
      if (target) void navigate(movieHref(target.id));
    },
    [films, navigate],
  );

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let live = true;
    let unmount: (() => void) | undefined;
    const mount = (TunnelScene: typeof Tunnel): (() => void) => {
      const { renderer: scene, dispose } = mountSpotlight(
        engine,
        element,
        (canvas, loop) =>
          TunnelScene.create(canvas, films, start, { selected: setNear }, loop),
        2,
      );
      if (!scene) {
        setFailed(true);
        return dispose;
      }
      tunnel.current = scene;
      scene.setFonts(fontsOf(element));
      const unbind = bindTunnelPointer(element, scene, openAt);
      return () => {
        unbind();
        dispose();
        tunnel.current = null;
      };
    };
    void import("./tunnel").then((module) => {
      if (live) unmount = mount(module.Tunnel);
    });
    return () => {
      live = false;
      unmount?.();
    };
    // The tunnel is built once per film list; later choices live inside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [films, openAt, engine]);

  useEffect(() => tunnel.current?.setReduced(reduced), [reduced]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const paint = () => tunnel.current?.setInk(inkOf(element));
    paint();
    const watching = new MutationObserver(paint);
    watching.observe(document.documentElement, {
      attributeFilter: ["class", "style"],
      attributes: true,
    });
    return () => watching.disconnect();
  }, [films]);

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
        scene.jump("first");
      } else if (event.key === "End") {
        event.preventDefault();
        scene.jump("last");
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (scene.selected >= 0) openAt(scene.selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAt]);

  const control = useMemo(
    () =>
      film ? (
        <WallAction
          disabled={!ready || pending || (account !== null && !known)}
          listed={listed.has(film.id)}
          onOpen={() => void navigate(movieHref(film.id))}
          onToggle={(kind) => void toggle(film, kind)}
          seen={watched.has(film.id)}
          title={film.title}
        />
      ) : null,
    [account, film, known, listed, navigate, pending, ready, toggle, watched],
  );

  return (
    <>
      {film && control ? (
        <SpotlightDock
          control={control}
          description={[`No. ${film.rank}`, film.year, film.genres[0]]
            .filter(Boolean)
            .join(" \u00b7 ")}
          icon={tmdbImageUrl("poster", film.posterPath, "w185")!}
          path={CANON_HREF}
          title={film.title}
        />
      ) : null}

      <canvas
        aria-label={`${title}: an endless tunnel of posters counting down from No. ${films.length} to No. 1. Scroll or drag to walk, arrow keys to step, Enter opens the chosen film.`}
        className="fixed inset-0 block h-full w-full cursor-default text-ink touch-none select-none data-[cursor=drag]:cursor-grabbing data-[cursor=pointer]:cursor-pointer"
        ref={canvas}
        role="application"
      />
      <h1 className="sr-only">{title}</h1>

      {failed ? (
        <SalonPart name="chrome">
          <PlainWall films={films} watched={watched} />
        </SalonPart>
      ) : null}

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

export function TunnelView({
  films,
  palette = null,
  startRank,
  title,
}: {
  films: CanonFilm[];
  palette?: AmbientPalette | null;
  startRank: number | null;
  title: string;
}): JSX.Element {
  const found = films.findIndex((entry) => entry.rank === startRank);
  return (
    <SalonStage className="wall-page relative h-dvh overflow-hidden">
      <Canon
        films={films}
        key={title}
        palette={palette}
        start={found >= 0 ? found : films.length - 1}
        title={title}
      />
    </SalonStage>
  );
}
