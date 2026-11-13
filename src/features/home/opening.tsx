"use client";

import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/dock";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { DetailBackdrop } from "@/features/detail/stage";
import { MoviePosterLink } from "@/features/movie/stage";
import { accountHref, CANON_HREF, movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Button } from "@/design/components/button";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { DockAction } from "@/design/components/surface";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import {
  HEADLINE_BOX,
  pageBodyClass,
  PROSE_CLASS,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { FALLBACK_ICON, HERO_LIFT, TEXT_LINK_CLASS } from "./constants";
import { HomePart, HomeSection, HomeText, useHomeLead } from "./motion";
import type { Feature } from "./types";
import { ambientImage, featureReason } from "./utils";

const HEADLINE_CLASS = `${HEADLINE_BOX} block font-zuume type-display-lg leading-none font-bold uppercase sm:type-display-xl lg:type-display-2xl`;

function FilmDock({ film, shown }: { film: Feature; shown: boolean }): null {
  const actionClass = useDockActionClass();
  const { navigate } = useDockActions();

  const config = useMemo(
    () =>
      shown
        ? {
            action: (
              <DockAction>
                <Button
                  aria-label={`Open ${film.title}`}
                  className={actionClass({ className: "w-full" })}
                  onClick={() => void navigate(movieHref(film.id))}
                  type="button"
                >
                  <Icon icon="solar:play-bold" size={16} />
                  <span className="truncate">Open film</span>
                </Button>
              </DockAction>
            ),
            description:
              [film.year, ...film.genres].filter(Boolean).join(" · ") ||
              undefined,
            icon:
              tmdbImageUrl("poster", film.posterPath, "w185") ?? FALLBACK_ICON,
            path: "/",
            title: film.title,
          }
        : null,
    [actionClass, film, navigate, shown],
  );

  useDockRegistration(config);
  return null;
}

function useInView() {
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { inView, root };
}

function Credit({ film }: { film: Feature }): JSX.Element {
  return (
    <HomePart
      className="flex max-w-xs items-center gap-3 self-start lg:self-end"
      name="credit"
    >
      <div className="w-10 shrink-0">
        <MoviePosterLink movie={film} radius={RADIUS.thumb} sizes="40px" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={`${TONE.label} text-ink-muted`}>On screen</span>
        <DockLink
          className={`truncate type-control font-semibold text-ink ${TEXT_LINK_CLASS}`}
          href={movieHref(film.id)}
        >
          {film.title}
          {film.year ? (
            <span className="font-normal text-ink-muted"> ({film.year})</span>
          ) : null}
        </DockLink>
        <span className="truncate type-meta text-ink-muted">
          {featureReason(film)}
        </span>
      </div>
    </HomePart>
  );
}

function Actions({ username }: { username: string | null }): JSX.Element {
  const auth = useAuth();
  const openSignIn = useOpenSignIn();
  const member = Boolean(username) || auth.isAuthenticated;

  return (
    <HomePart className="flex flex-wrap items-center gap-3" name="actions">
      {member ? (
        username ? (
          <Button
            href={`${accountHref(username)}/diary`}
            intent="primary"
            shape="pill"
            size="lg"
          >
            <Icon icon="solar:notebook-bold" size={16} />
            Open your diary
          </Button>
        ) : null
      ) : (
        <Button intent="primary" onClick={openSignIn} shape="pill" size="lg">
          Start your diary
          <span className="font-normal opacity-70">· it’s free</span>
        </Button>
      )}
      <Button href={CANON_HREF} intent="glass" shape="pill" size="lg">
        Browse the Top 100
      </Button>
    </HomePart>
  );
}

export function HomeOpening({
  feature,
  name,
  username,
}: {
  feature: Feature | null;
  name: string | null;
  username: string | null;
}): JSX.Element {
  const setLead = useHomeLead();
  const { inView, root } = useInView();
  const first = name?.split(/\s+/)[0] || null;

  useEffect(() => {
    setLead(ambientImage(feature?.backdropPath ?? null));
  }, [feature, setLead]);

  const src = feature
    ? tmdbImageUrl("backdrop", feature.backdropPath, "original")
    : null;

  return (
    <div ref={root}>
      {feature ? <FilmDock film={feature} shown={inView} /> : null}
      {src ? <DetailBackdrop src={src} /> : null}

      <div className={cn(pageBodyClass(Boolean(src)), src && HERO_LIFT)}>
        {src ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -bottom-24 left-1/2 z-0 w-screen -translate-x-1/2 bg-linear-to-t from-page/85 via-page/40 to-transparent"
          />
        ) : null}
        <HomeSection
          as="div"
          className="relative z-10 flex w-full flex-col"
          cue="opening"
          now
        >
          <HomePart
            as="p"
            className={`${TONE.label} text-grade`}
            name="eyebrow"
          >
            {first ? `Welcome back, ${first}` : "The film diary"}
          </HomePart>
          <h2 className="mt-5 text-balance text-ink">
            <HomeText
              as="span"
              by="word"
              className={HEADLINE_CLASS}
              part="headline"
              text="Every film you’ve seen."
            />
            <HomeText
              as="span"
              by="word"
              className={cn(HEADLINE_CLASS, "text-ink-muted")}
              part="headline"
              text="Every one you’re about to."
            />
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="flex min-w-0 flex-col gap-7">
              <HomePart
                as="p"
                className={cn(PROSE_CLASS, "max-w-[52ch] text-ink-body")}
                name="copy"
              >
                Keep a diary of what you watch. Rate it, write about it, make
                lists worth sharing, and see what the people you follow thought
                of the same film.
              </HomePart>
              <Actions username={username} />
            </div>
            {feature ? <Credit film={feature} /> : null}
          </div>
        </HomeSection>
      </div>
    </div>
  );
}
