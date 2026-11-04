"use client";

import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/modules/dock";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { DetailBackdrop } from "@/features/detail/stage";
import { MoviePosterLink } from "@/features/movie/stage";
import { formatRuntime } from "@/features/movie/utils";
import { AvatarStack } from "@/features/social/proof";
import { movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Button, DockAction } from "@/ui/button";
import { cn } from "@/ui/cn";
import { SegmentedControl } from "@/ui/form";
import { Carousel, Icon } from "@/ui/media";
import { pageBodyClass, PRIMARY, PROSE_CLASS, RADIUS, TONE } from "@/ui/tokens";
import {
  FALLBACK_ICON,
  POSTER_SIZES,
  REEL_CYCLE_MS,
  REEL_IMAGE_SIZE,
  ROW_ITEM_CLASS,
} from "./constants";
import {
  Heading,
  HomePart,
  HomeSection,
  HomeSwap,
  HomeText,
  useHomeLead,
} from "./motion";
import type { Feature, FilmShelf, ShowingFilm } from "./types";
import {
  formatCompact,
  featureReason,
  formatReleaseDay,
  ambientImage,
  featureTitleClass,
} from "./utils";

function FilmDock({ film, shown }: { film: Feature; shown: boolean }): null {
  const action = useMemo(
    () => <OpenFilm id={film.id} title={film.title} />,
    [film.id, film.title],
  );

  const config = useMemo(
    () =>
      shown
        ? {
            action,
            description:
              [film.year, ...film.genres].filter(Boolean).join(" · ") ||
              undefined,
            icon:
              tmdbImageUrl("poster", film.posterPath, "w185") ?? FALLBACK_ICON,
            path: "/",
            title: film.title,
          }
        : null,
    [action, film, shown],
  );

  useDockRegistration(config);
  return null;
}

function OpenFilm({ id, title }: { id: number; title: string }): JSX.Element {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();

  return (
    <DockAction>
      <Button
        aria-label={`Open ${title}`}
        className={actionClass({ className: "w-full" })}
        onClick={() => void navigate(movieHref(id))}
        type="button"
      >
        <Icon icon="solar:play-bold" size={16} />
        <span className="truncate">Open film</span>
      </Button>
    </DockAction>
  );
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
  const facts = [film.year, film.genres.join(", "), formatRuntime(film.runtime)]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col">
      <HomePart as="p" className={`${TONE.label} text-grade`} name="reason">
        {featureReason(film)}
      </HomePart>
      <h2 className={cn(featureTitleClass(film.title), "mt-4")}>
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
                        animationDuration: `${REEL_CYCLE_MS}ms`,
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

function useOnScreen() {
  const root = useRef<HTMLDivElement>(null);
  const [presence, setPresence] = useState({ inView: true, visible: true });

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setPresence((current) => ({
          ...current,
          inView: Boolean(entry?.isIntersecting),
        })),
      { threshold: 0.25 },
    );
    observer.observe(element);
    const syncVisibility = () =>
      setPresence((current) => ({
        ...current,
        visible: document.visibilityState === "visible",
      }));
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return { ...presence, root };
}

function useReelCycle(features: Feature[], paused: boolean) {
  const [active, setActive] = useState(0);
  const timeLeft = useRef(REEL_CYCLE_MS);

  useEffect(() => {
    timeLeft.current = REEL_CYCLE_MS;
  }, [active]);

  useEffect(() => {
    if (paused || features.length < 2) return;
    const startedAt = performance.now();
    const timer = setTimeout(
      () => setActive((index) => (index + 1) % features.length),
      timeLeft.current,
    );
    return () => {
      clearTimeout(timer);
      timeLeft.current = Math.max(
        0,
        timeLeft.current - (performance.now() - startedAt),
      );
    };
  }, [active, features.length, paused]);

  useEffect(() => {
    const next = features[(active + 1) % features.length];
    const src = next
      ? tmdbImageUrl("backdrop", next.backdropPath, REEL_IMAGE_SIZE)
      : null;
    if (!src) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
  }, [active, features]);

  return [active, setActive] as const;
}

export function HomeHero({
  features,
}: {
  features: Feature[];
}): JSX.Element | null {
  const reducedMotion = Boolean(useReducedMotion());
  const setLead = useHomeLead();
  const [hovered, setHovered] = useState(false);
  const { inView, root, visible } = useOnScreen();
  const paused = reducedMotion || hovered || !inView || !visible;
  const [active, setActive] = useReelCycle(features, paused);
  const film = features[active] ?? features[0];

  useEffect(() => {
    if (film) setLead(ambientImage(film.backdropPath));
  }, [film, setLead]);

  if (!film) return null;
  const src = tmdbImageUrl("backdrop", features[0]!.backdropPath, "original")!;
  const reel =
    active === 0
      ? null
      : tmdbImageUrl("backdrop", film.backdropPath, REEL_IMAGE_SIZE);

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

function Caption({ film, shelf }: { film: ShowingFilm; shelf: FilmShelf }) {
  const date =
    shelf === "soon" && film.releaseDate
      ? formatReleaseDay(film.releaseDate)
      : null;
  return (
    <span className="flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums">
      {date ? <span className="text-ink-body">{date}</span> : null}
      {film.waiting > 0 ? (
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          {date ? "·" : null}
          <Icon icon="solar:clock-circle-bold" size={12} />
          {formatCompact(film.waiting)} want to see
        </span>
      ) : null}
    </span>
  );
}

export function HomeShowing({
  soon,
  theatres,
}: {
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}): JSX.Element | null {
  const [shelf, setShelf] = useState<FilmShelf>(
    theatres.length > 0 ? "theatres" : "soon",
  );
  if (theatres.length + soon.length === 0) return null;

  const shelves = [
    { films: theatres, key: "theatres" as const, label: "In theatres" },
    { films: soon, key: "soon" as const, label: "Coming soon" },
  ].filter((entry) => entry.films.length > 0);
  const current = shelves.find((entry) => entry.key === shelf) ?? shelves[0];

  return (
    <HomeSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          shelves.length > 1 ? (
            <SegmentedControl
              ariaLabel="Showing"
              className={TONE.tabs}
              items={shelves}
              onChange={setShelf}
              value={current.key}
            />
          ) : null
        }
        icon="solar:clapperboard-play-bold"
        title="At the cinema"
      />
      <HomeSwap cue="slides" id={current.key}>
        <Carousel
          arrowClassName={TONE.arrows}
          className="rounded-card"
          itemClassName={ROW_ITEM_CLASS}
          label={current.label}
          part="slide"
        >
          {current.films.map((film) => (
            <MoviePosterLink
              caption={<Caption film={film} shelf={current.key} />}
              key={film.id}
              movie={film}
              radius={RADIUS.card}
              sizes={POSTER_SIZES}
            />
          ))}
        </Carousel>
      </HomeSwap>
    </HomeSection>
  );
}
