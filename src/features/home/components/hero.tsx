"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { PRIMARY } from "@/config/theme/chrome";
import { cn } from "@/ui/cn";
import { DetailBackdrop } from "@/features/detail";
import { AvatarStack } from "@/features/social";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { movieHref } from "@/config/routes";
import { Icon, PROSE_CLASS, TONE, headlineClass, pageBodyClass } from "@/ui";
import type { Feature } from "../types";
import { HomePart, HomeSection, HomeSwap, HomeText } from "../motion";
import { FilmDock } from "./film-dock";
import { roomOf, useHomeLead } from "./stage";

const CYCLE_MS = 9000;
const REEL = "w1280";

const titleClass = (title: string) => headlineClass(title, [22, 32, 44]);

function runtime(minutes: number | null): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest ? `${rest}m` : ""}`.trim() : `${rest}m`;
}

function reasonOf(film: Feature): string {
  const parts: string[] = [];
  if (film.social) parts.push("Popular on Guffin");
  if (film.trending) parts.push(`Trending #${film.trending} worldwide`);
  return parts.join(" · ") || "Featured";
}

function SocialLine({ film }: { film: Feature }): JSX.Element | null {
  if (!film.social) return null;
  const { faces, rating, watchers } = film.social;
  return (
    <HomePart
      className="flex items-center gap-3 type-control text-ink-body tabular-nums"
      name="social"
    >
      {faces.length > 0 ? (
        <AvatarStack
          people={faces.map((face) => ({ ...face, id: face.username }))}
          round
          size={24}
        />
      ) : null}
      <span>
        <span className="font-semibold text-ink-lead">
          {watchers.toLocaleString("en-US")}
        </span>{" "}
        {watchers === 1 ? "member" : "members"} this week
      </span>
      {rating ? (
        <span className="inline-flex items-center gap-1">
          <Icon className="text-rated" icon="solar:star-bold" size={13} />
          {rating.toFixed(1)}
        </span>
      ) : null}
    </HomePart>
  );
}

function Synopsis({ film }: { film: Feature }): JSX.Element {
  const facts = [film.year, film.genres.join(", "), runtime(film.runtime)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col">
      <HomePart as="p" className={`${TONE.label} text-grade`} name="reason">
        {reasonOf(film)}
      </HomePart>
      <h2 className={cn(titleClass(film.title), "mt-4")}>
        <Link
          className="ui-fade hover:opacity-80 focus-visible:opacity-80"
          href={movieHref(film.id)}
        >
          <HomeText as="span" mask part="title" text={film.title} />
        </Link>
      </h2>
      {facts ? (
        <HomePart
          as="p"
          className="mt-4 type-body font-medium text-ink-body"
          name="facts"
        >
          {facts}
        </HomePart>
      ) : null}
      {film.logline ? (
        <HomePart
          as="p"
          className={cn(PROSE_CLASS, "mt-5 text-ink-body")}
          name="logline"
        >
          {film.logline}
        </HomePart>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
        <HomePart name="open">
          <Link
            className={cn(
              PRIMARY,
              "inline-flex h-10 items-center gap-2 rounded-full px-5 type-control font-medium",
            )}
            href={movieHref(film.id)}
          >
            <Icon icon="solar:play-bold" size={14} />
            Open film
          </Link>
        </HomePart>
        <SocialLine film={film} />
      </div>
    </div>
  );
}

function Reels({
  active,
  features,
  onPick,
  paused,
}: {
  active: number;
  features: Feature[];
  onPick: (index: number) => void;
  paused: boolean;
}): JSX.Element {
  return (
    <HomeSection as="div" cue="reels" now>
      <ol
        aria-label="Featured films"
        className="grid grid-cols-5 gap-2 lg:flex lg:flex-col lg:gap-0"
      >
        {features.map((film, index) => {
          const on = index === active;
          return (
            <HomePart as="li" index={index} key={film.id} name="reel">
              <button
                aria-current={on ? "true" : undefined}
                aria-label={`Show ${film.title}`}
                className="group/reel relative flex w-full cursor-pointer flex-col py-3 text-left lg:flex-row lg:items-baseline lg:gap-4 lg:py-3.5"
                onClick={() => onPick(index)}
                type="button"
              >
                <span
                  className={cn(
                    "hidden type-label font-semibold tracking-label tabular-nums lg:inline",
                    on
                      ? "text-ink"
                      : "text-ink-faint group-hover/reel:text-ink-body group-focus-visible/reel:text-ink-body group-has-focus-visible/reel:text-ink-body",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "hidden min-w-0 truncate type-body font-medium lg:block",
                    on
                      ? "text-ink"
                      : "text-ink-muted group-hover/reel:text-ink-body group-focus-visible/reel:text-ink-body group-has-focus-visible/reel:text-ink-body",
                  )}
                >
                  {film.title}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-fill-active lg:h-px lg:bg-fill"
                >
                  {on ? (
                    <span
                      className="home-reel absolute inset-0 origin-left bg-ink-body"
                      key={film.id}
                      style={{
                        animationDuration: `${CYCLE_MS}ms`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                    />
                  ) : null}
                </span>
              </button>
            </HomePart>
          );
        })}
      </ol>
    </HomeSection>
  );
}

export function HomeHero({
  features,
}: {
  features: Feature[];
}): JSX.Element | null {
  const reduced = Boolean(useReducedMotion());
  const setLead = useHomeLead();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  const film = features[active] ?? features[0];
  const paused = reduced || hovered || !inView || !visible;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(element);
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const left = useRef(CYCLE_MS);
  useEffect(() => {
    left.current = CYCLE_MS;
  }, [active]);
  useEffect(() => {
    if (paused || features.length < 2) return;
    const started = performance.now();
    const timer = setTimeout(
      () => setActive((index) => (index + 1) % features.length),
      left.current,
    );
    return () => {
      clearTimeout(timer);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [active, features.length, paused]);

  useEffect(() => {
    const next = features[(active + 1) % features.length];
    const src = next ? tmdbImageUrl("backdrop", next.backdropPath, REEL) : null;
    if (!src) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
  }, [active, features]);

  // The room follows the film on screen.
  useEffect(() => {
    if (film) setLead(roomOf(film.backdropPath));
  }, [film, setLead]);

  if (!film) return null;
  const first = features[0]!;
  const src = tmdbImageUrl("backdrop", first.backdropPath, "original")!;
  const reel =
    active === 0 ? null : tmdbImageUrl("backdrop", film.backdropPath, REEL);

  return (
    <div ref={root}>
      <FilmDock film={film} shown={inView} />
      <DetailBackdrop src={src} still={reel} />

      <div className={pageBodyClass(true)}>
        <div
          className="grid w-full grid-cols-1 items-end gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1fr)_17rem]"
          onBlur={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <HomeSwap className="min-w-0" cue="feature" id={String(film.id)} now>
            <Synopsis film={film} />
          </HomeSwap>
          {features.length > 1 ? (
            <Reels
              active={active}
              features={features}
              onPick={setActive}
              paused={paused}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
