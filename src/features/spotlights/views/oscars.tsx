"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useAnyStage } from "@/motion/engine";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { OSCARS_HREF, movieHref } from "@/config/routes";
import { ordinal } from "../data/best-picture";
import { Foundry } from "../gl/foundry/renderer";
import type { Laureate } from "../types";
import { useGestureStep } from "../hooks";
import { SalonPart, SalonStage } from "../motion";
import { mountSpotlight } from "../scene";
import { SpotlightDock } from "../components/dock";
import { WinnersIndex } from "../components/winners-index";
import { YearDial } from "../components/year-dial";

const poster = (film: Laureate) =>
  tmdbImageUrl("poster", film.posterPath, "w780")!;

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
      .map(poster);
    foundry.current?.show(poster(film), String(film.ceremonyYear), around);
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("ceremony", String(film.ceremony));
      window.history.replaceState(window.history.state, "", url);
    }, 500);
    return () => clearTimeout(timer);
  }, [film, index, laureates]);

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
              <img
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                src={poster(film)}
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

// The page's hooks reach the salon's stage from inside it.
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
