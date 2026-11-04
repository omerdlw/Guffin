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
  compact,
  reasonOf,
  releaseDay,
  roomOf,
  runtime,
  titleClass,
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

  const left = useRef(REEL_CYCLE_MS);
  useEffect(() => {
    left.current = REEL_CYCLE_MS;
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
    const src = next
      ? tmdbImageUrl("backdrop", next.backdropPath, REEL_IMAGE_SIZE)
      : null;
    if (!src) return;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
  }, [active, features]);

  useEffect(() => {
    if (film) setLead(roomOf(film.backdropPath));
  }, [film, setLead]);

  if (!film) return null;
  const first = features[0]!;
  const src = tmdbImageUrl("backdrop", first.backdropPath, "original")!;
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
    shelf === "soon" && film.releaseDate ? releaseDay(film.releaseDate) : null;
  return (
    <span className="flex min-h-5 min-w-0 items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums">
      {date ? <span className="text-ink-body">{date}</span> : null}
      {film.waiting > 0 ? (
        <span className="inline-flex min-w-0 items-center gap-1 truncate">
          {date ? "·" : null}
          <Icon icon="solar:clock-circle-bold" size={12} />
          {compact(film.waiting)} want to see
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
  const films = shelf === "theatres" ? theatres : soon;
  if (theatres.length + soon.length === 0) return null;

  const items = [
    ...(theatres.length > 0
      ? [{ key: "theatres" as const, label: "In theatres" }]
      : []),
    ...(soon.length > 0
      ? [{ key: "soon" as const, label: "Coming soon" }]
      : []),
  ];

  return (
    <HomeSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          items.length > 1 ? (
            <SegmentedControl
              ariaLabel="Showing"
              className={TONE.tabs}
              items={items}
              onChange={setShelf}
              value={shelf}
            />
          ) : null
        }
        icon="solar:clapperboard-play-bold"
        title="At the cinema"
      />
      <HomeSwap cue="slides" id={shelf}>
        <Carousel
          arrowClassName={TONE.arrows}
          className="rounded-card"
          itemClassName={ROW_ITEM_CLASS}
          label={shelf === "theatres" ? "In theatres" : "Coming soon"}
          part="slide"
        >
          {films.map((film) => (
            <MoviePosterLink
              caption={<Caption film={film} shelf={shelf} />}
              key={film.id}
              movie={film}
              radius={RADIUS.card}
              sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 30vw"
            />
          ))}
        </Carousel>
      </HomeSwap>
    </HomeSection>
  );
}
