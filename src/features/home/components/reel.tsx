"use client";

import {
  type JSX,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useDockActionClass,
  useDockActions,
  useDockRegistration,
} from "@omerdlw/base-framework/dock";
import { Button } from "@omerdlw/base-framework/ui";
import { ActionIcon, ActionLabel } from "@/design/components/action-content";
import { BACKDROP_FILL } from "@/design/components/backdrop";
import { Icon } from "@/design/components/icon";
import { headlineClass, HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { DockAction } from "@/design/surface/surface";
import { cn } from "@/design/ui";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { BackdropProjection } from "@/features/detail-page/components/stage";
import { AvatarStack } from "@/features/social/components/social-proof";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { formatCompact, formatRuntime } from "@/shared/format";
import { accountHref, movieHref } from "@/shared/site";
import {
  ambientImage,
  type Feature,
  REEL_BLEED,
  REEL_CLASS,
  REEL_MARK_BOX,
  REEL_MASK,
} from "../model";
import {
  HomePart,
  HomeSection,
  HomeSwap,
  HomeText,
  useHomeLead,
} from "../motion";

const FALLBACK_ICON = "solar:clapperboard-play-bold";

const BLEED = REEL_BLEED;

const SCRIM_FADE =
  "[mask-image:linear-gradient(to_bottom,#000_40%,transparent)]";

const READY_LATE_MS = 2500;

const original = (path: string) => tmdbImageUrl("backdrop", path, "original")!;

const PICK_LINE =
  "relative mx-[var(--radius-tile)] block h-0.5 overflow-hidden rounded-full bg-line";

const featureKey = (film: Feature) => String(film.id);

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
                  <ActionIcon icon="solar:play-bold" />
                  <ActionLabel>Open film</ActionLabel>
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

const MARK_BOX = REEL_MARK_BOX;

function Title({ film }: { film: Feature }): JSX.Element {
  if (!film.logo) {
    return (
      <div className={MARK_BOX}>
        <HomeText
          as="h2"
          className={cn(
            headlineClass(film.title, [10, 18, 30]),
            "line-clamp-2 text-ink",
          )}
          part="headline"
          text={film.title}
        />
      </div>
    );
  }
  const w500 = tmdbImageUrl("logo", film.logo.path, "w500")!;
  const full = tmdbImageUrl("logo", film.logo.path, "original")!;
  return (
    <HomePart as="h2" className={MARK_BOX} name="logo">
      <img
        alt={film.title}
        className="h-auto max-h-full w-auto max-w-[min(100%,24rem)] object-contain object-left-bottom drop-shadow-lg sm:max-w-[28rem] lg:max-w-[32rem]"
        decoding="async"
        height={Math.round(500 / film.logo.aspect)}
        src={w500}
        srcSet={`${w500} 1x, ${full} 2x`}
        width={500}
      />
    </HomePart>
  );
}

function Fact({ children }: { children: ReactNode }): JSX.Element {
  return (
    <li className="flex items-center gap-3 before:h-3 before:w-px before:bg-line first:before:hidden">
      {children}
    </li>
  );
}

function Meta({ film }: { film: Feature }): JSX.Element {
  const length = film.runtime ? formatRuntime(film.runtime) : null;

  return (
    <HomePart
      as="ul"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 type-meta font-medium text-ink-body tabular-nums"
      name="meta"
    >
      {film.year ? <Fact>{film.year}</Fact> : null}
      {film.genres.length > 0 ? (
        <Fact>{film.genres.slice(0, 2).join(", ")}</Fact>
      ) : null}
      {length ? <Fact>{length}</Fact> : null}
      {film.social ? (
        <Fact>
          <span className="inline-flex items-center gap-2 text-ink-muted">
            {film.social.faces.length > 0 ? (
              <AvatarStack
                people={film.social.faces
                  .slice(0, 3)
                  .map((face) => ({ ...face, id: face.username }))}
                round
                size={16}
              />
            ) : null}
            {formatCompact(film.social.watchers)} members
            {film.social.rating ? (
              <span className="inline-flex items-center gap-1 text-ink-body">
                <Icon className="text-rated" icon="solar:star-bold" size={12} />
                {film.social.rating.toFixed(1)}
              </span>
            ) : null}
          </span>
        </Fact>
      ) : null}
    </HomePart>
  );
}

function Actions({
  film,
  username,
}: {
  film: Feature;
  username: string | null;
}): JSX.Element {
  const auth = useAuth();
  const openSignIn = useOpenSignIn();
  const member = Boolean(username) || auth.isAuthenticated;

  return (
    <HomePart className="flex flex-wrap items-center gap-3" name="actions">
      <Button href={movieHref(film.id)} intent="primary" shape="pill" size="lg">
        <Icon icon="solar:play-bold" size={16} />
        Open film
      </Button>
      {member ? (
        username ? (
          <Button
            href={`${accountHref(username)}/diary`}
            intent="glass"
            shape="pill"
            size="lg"
          >
            <Icon icon="solar:notebook-bold" size={16} />
            Your diary
          </Button>
        ) : null
      ) : (
        <Button intent="glass" onClick={openSignIn} shape="pill" size="lg">
          Start your diary
          <span className="font-normal opacity-70">· free</span>
        </Button>
      )}
    </HomePart>
  );
}

function Copy({
  film,
  username,
}: {
  film: Feature;
  username: string | null;
}): JSX.Element {
  return (
    <div className="flex max-w-[32rem] flex-col">
      <Title film={film} />
      <div className="mt-6">
        <Meta film={film} />
      </div>
      <HomeText
        as="p"
        className="mt-3 line-clamp-2 min-h-[2lh] max-w-[46ch] type-copy text-pretty text-ink-muted"
        part="copy"
        text={film.logline ?? ""}
      />
      <div className="mt-8">
        <Actions film={film} username={username} />
      </div>
    </div>
  );
}

function Picks({
  at,
  features,
  onChoose,
  onDone,
  playing,
  round,
}: {
  at: number;
  features: Feature[];
  onChoose: (index: number) => void;
  onDone: () => void;
  playing: boolean;
  round: number;
}): JSX.Element {
  return (
    <HomePart
      as="ol"
      className="scrollbar-none -mx-4 -mt-2 flex gap-3 overflow-x-auto px-4 pt-2 pb-1 sm:mx-0 sm:px-0 lg:justify-end"
      name="picks"
    >
      {features.map((film, index) => {
        const active = index === at;
        return (
          <HomePart
            as="li"
            className="shrink-0 lg:max-w-44 lg:min-w-0 lg:flex-1"
            index={index}
            key={featureKey(film)}
            name="pick"
          >
            <button
              aria-current={active ? "true" : undefined}
              aria-label={`Show ${film.title}`}
              className="group flex w-36 cursor-pointer flex-col gap-2 text-left opacity-55 data-active:opacity-100 sm:w-44 lg:w-full"
              data-active={active ? "" : undefined}
              data-slot="thumb"
              onClick={() => onChoose(index)}
              type="button"
            >
              <span
                className="relative block aspect-video w-full overflow-hidden rounded-tile bg-plate"
                data-cursor-frame=""
                data-slot="frame"
              >
                <img
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                  crossOrigin="anonymous"
                  decoding="async"
                  loading="lazy"
                  src={tmdbImageUrl("backdrop", film.backdropPath, "w300")!}
                />
              </span>
              <span className={PICK_LINE}>
                {active && playing ? (
                  <span
                    className="absolute inset-0 block rounded-full bg-ink"
                    data-part="tick"
                    key={`${featureKey(film)}-${round}`}
                    onAnimationEnd={(event) => {
                      if (event.target === event.currentTarget) onDone();
                    }}
                  />
                ) : active ? (
                  <span className="absolute inset-0 block rounded-full bg-ink" />
                ) : null}
              </span>
            </button>
          </HomePart>
        );
      })}
    </HomePart>
  );
}

function Welcome(): JSX.Element {
  return (
    <HomeSection
      as="div"
      className={cn(REEL_CLASS, "relative flex flex-col justify-end")}
      cue="opening"
      now
    >
      <HomeText
        as="p"
        className={`${TONE.label} text-grade`}
        part="eyebrow"
        text="The film diary"
      />
      <h2 className="mt-5 text-balance text-ink">
        <HomeText
          as="span"
          className={`${HEADLINE_BOX} block font-zuume type-display-lg leading-none font-bold uppercase sm:type-display-xl lg:type-display-2xl`}
          part="headline"
          text="Every film you’ve seen."
        />
      </h2>
    </HomeSection>
  );
}

export function HomeReel({
  features,
  username,
}: {
  features: Feature[];
  username: string | null;
}): JSX.Element {
  const setLead = useHomeLead();
  const { inView, root } = useInView();
  const [at, setAt] = useState(0);
  const [round, setRound] = useState(0);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const film = features[at] ?? features[0] ?? null;
  const first = features[0] ?? null;

  useEffect(() => {
    setLead(ambientImage(film?.backdropPath ?? null));
  }, [film, setLead]);

  useEffect(() => {
    const late = setTimeout(() => setReady(true), READY_LATE_MS);
    return () => clearTimeout(late);
  }, []);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const next = features[(at + 1) % features.length];
    if (!next || features.length < 2) return;
    const warm = new Image();
    warm.crossOrigin = "anonymous";
    warm.src = original(next.backdropPath);
  }, [at, features]);

  if (!film || !first) return <Welcome />;

  const choose = (index: number) => {
    setAt(index);
    setRound((count) => count + 1);
  };

  return (
    <div
      className={cn(REEL_CLASS, "relative flex flex-col justify-end")}
      data-ready={ready ? "" : undefined}
      ref={root}
    >
      <FilmDock film={film} shown={inView} />

      <div aria-hidden="true" className={cn(BLEED, "-bottom-24")}>
        <HomePart className="absolute inset-0" name="backdrop">
          <BackdropProjection
            className={BACKDROP_FILL}
            mask={REEL_MASK}
            onReady={() => setReady(true)}
            src={original(first.backdropPath)}
            still={at === 0 ? null : original(film.backdropPath)}
          />
        </HomePart>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          BLEED,
          SCRIM_FADE,
          "-bottom-24 bg-linear-to-r from-page/80 via-page/25 to-transparent",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          BLEED,
          SCRIM_FADE,
          "-bottom-24 bg-linear-to-t from-page via-page/70 via-45% to-transparent to-85% sm:via-page/50 sm:via-30% sm:to-70%",
        )}
      />

      <div className="relative z-10 grid w-full grid-cols-1 items-end gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
        <HomeSection as="div" className="min-w-0" cue="opening" now>
          <HomeSwap cue="feature" id={featureKey(film)}>
            <Copy film={film} username={username} />
          </HomeSwap>
        </HomeSection>
        {features.length > 1 ? (
          <Picks
            at={at}
            features={features}
            onChoose={choose}
            onDone={() => setAt((index) => (index + 1) % features.length)}
            playing={inView && visible}
            round={round}
          />
        ) : null}
      </div>
    </div>
  );
}
