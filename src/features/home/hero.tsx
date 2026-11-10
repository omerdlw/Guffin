"use client";

import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/modules/dock";
import { useReducedMotion } from "@/motion/lib";
import { DetailBackdrop } from "@/features/detail/stage";
import { MoviePosterLink } from "@/features/movie/stage";
import { formatRuntime } from "@/features/movie/utils";
import { AvatarStack } from "@/features/social/proof";
import { movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Link, LinkButton } from "@/design/components/link";
import { Button } from "@/design/components/button";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { SegmentedControl } from "@/design/components/segmented-control";
import { DockAction } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import { pageBodyClass, PROSE_CLASS } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import {
  FALLBACK_ICON,
  HERO_LIFT,
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
  ambientImage,
  featureReason,
  featureTitleClass,
  formatCompact,
  formatReleaseDay,
} from "./utils";
import hero from "./hero.module.css";
import { Image } from "@/design/components/image";

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

function Synopsis({
  film,
  index,
  total,
}: {
  film: Feature;
  index: number;
  total: number;
}): JSX.Element {
  const facts = [film.year, film.genres.join(", "), formatRuntime(film.runtime)]
    .filter(Boolean)
    .join(" · ");
  const position = String(index + 1).padStart(2, "0");

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-4">
        <HomePart as="p" className={`${TONE.label} text-grade`} name="reason">
          {featureReason(film)}
        </HomePart>
        {total > 1 ? (
          <HomePart
            as="p"
            className="type-label font-semibold tracking-label text-ink-muted tabular-nums"
            name="tally"
          >
            <span className="text-ink">{position}</span>
            <span className="mx-1.5 text-ink-faint">/</span>
            {String(total).padStart(2, "0")}
          </HomePart>
        ) : null}
      </div>
      <h2 className={cn(featureTitleClass(film.title), "mt-5")}>
        <Link
          className="ui-fade hover:opacity-80 focus-visible:opacity-80"
          href={movieHref(film.id)}
        >
          <HomeText as="span" part="title" text={film.title} />
        </Link>
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 flex-col gap-4">
          {facts ? (
            <HomePart
              as="p"
              className="type-body font-medium text-ink-body"
              name="facts"
            >
              {facts}
            </HomePart>
          ) : null}
          {film.logline ? (
            <HomePart
              as="p"
              className={cn(PROSE_CLASS, "text-ink-body")}
              name="logline"
            >
              {film.logline}
            </HomePart>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 lg:flex-col lg:items-end lg:gap-y-4">
          <HomePart name="open">
            <LinkButton
              href={movieHref(film.id)}
              intent="primary"
              shape="pill"
              size="lg"
            >
              <Icon icon="solar:play-bold" size={14} />
              Open film
            </LinkButton>
          </HomePart>
          <SocialLine film={film} />
        </div>
      </div>
    </div>
  );
}

/**
 * The strip: the week's features laid out like frames on a film. The chosen
 * frame opens (a golden ratio wider than the rest) and burns its own length
 * of leader, the others wait with their number.
 */
function Strip({
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
        className="flex h-20 gap-2 sm:h-24 sm:gap-3 lg:h-28"
      >
        {features.map((film, index) => {
          const on = index === active;
          const still = tmdbImageUrl("backdrop", film.backdropPath, "w300");
          return (
            <li
              className={cn("group/frame", hero.frame)}
              data-on={on ? "" : undefined}
              key={film.id}
            >
              <HomePart className="size-full" index={index} name="reel">
                <Button
                  aria-current={on ? "true" : undefined}
                  aria-label={`Show ${film.title}`}
                  className="on-photo group/pick relative block size-full cursor-pointer overflow-hidden rounded-card text-left ring-1 ring-edge-hover ring-inset focus-visible:ring-edge-focus group-data-[on]/frame:ring-grade/30"
                  onClick={() => onPick(index)}
                  type="button"
                >
                  {still ? (
                    <Image
                      alt=""
                      src={still}
                      wrapperClassName="absolute inset-0 opacity-50 ui-fade group-hover/pick:opacity-80 group-focus-visible/pick:opacity-80 group-data-[on]/frame:opacity-100"
                    />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-linear-to-t from-page/80 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2.5 p-2.5 sm:p-3.5">
                    <span
                      className={cn(
                        "type-label font-semibold tracking-label tabular-nums ui-fade",
                        on
                          ? "text-ink"
                          : "text-ink-body group-hover/pick:text-ink group-focus-visible/pick:text-ink",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="hidden min-w-0 truncate type-control font-medium text-ink opacity-0 ui-fade group-data-[on]/frame:opacity-100 sm:block">
                      {film.title}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
                  >
                    {on ? (
                      <span
                        className={cn(
                          hero.reel,
                          "absolute inset-0 origin-left bg-ink",
                        )}
                        key={film.id}
                        style={{
                          animationDuration: `${REEL_CYCLE_MS}ms`,
                          animationPlayState: paused ? "paused" : "running",
                        }}
                      />
                    ) : null}
                  </span>
                </Button>
              </HomePart>
            </li>
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
    const image = new window.Image();
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

      <div className={cn(pageBodyClass(true), HERO_LIFT)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -bottom-24 left-1/2 z-0 w-screen -translate-x-1/2 bg-linear-to-t from-page/80 to-transparent"
        />
        <div
          className="relative z-10 flex w-full flex-col gap-10 sm:gap-12"
          onBlur={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <HomeSwap className="min-w-0" cue="feature" id={String(film.id)} now>
            <Synopsis film={film} index={active} total={features.length} />
          </HomeSwap>
          {features.length > 1 ? (
            <Strip
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

function Ticket({
  film,
  shelf,
}: {
  film: ShowingFilm;
  shelf: FilmShelf;
}): JSX.Element {
  const date = film.releaseDate ? formatReleaseDay(film.releaseDate) : null;
  const waiting = film.waiting > 0 ? formatCompact(film.waiting) : null;
  const big = date ?? waiting ?? "Now";
  const small = waiting
    ? `${waiting} want to see`
    : shelf === "soon"
      ? "Release day"
      : "In theatres";

  return (
    <span className="mt-1 flex min-w-0 flex-col gap-1.5 border-t border-dashed border-line pt-3">
      <span className="font-zuume truncate type-display-xs leading-none font-bold text-ink uppercase tabular-nums">
        {big}
      </span>
      <span className="truncate type-meta font-medium text-ink-muted">
        {small}
      </span>
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
              items={shelves}
              onChange={setShelf}
              value={current.key}
            />
          ) : null
        }
        title="At the cinema"
      />
      <HomeSwap cue="slides" id={current.key}>
        <Carousel
          arrowClassName={TONE.arrows}
          itemClassName={ROW_ITEM_CLASS}
          label={current.label}
          part="slide"
        >
          {current.films.map((film) => (
            <MoviePosterLink
              caption={<Ticket film={film} shelf={current.key} />}
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
