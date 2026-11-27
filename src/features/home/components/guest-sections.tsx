"use client";

import { type JSX } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { DockLink } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { Logo } from "@/design/components/logo";
import { HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { movieHref } from "@/shared/site";
import { tmdbImageUrl } from "@/infrastructure/tmdb/model";
import { CRAFT, type HomeFilm } from "../model";
import { formatWhole } from "@/shared/format";
import { Heading, HomePart, HomeSection, HomeText } from "../motion";
import { GuestOnly } from "./primitives";

export function HomeCraft(): JSX.Element {
  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="craft">
        <Heading title="What you can do here" />
        <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {CRAFT.map((item, index) => (
            <HomePart
              as="li"
              className="flex min-w-0 flex-col gap-4 border-t border-rule py-8"
              index={index}
              key={item.verb}
              name="verb"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`${TONE.label} text-ink-faint tabular-nums`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon className="text-ink-muted" icon={item.icon} size={18} />
              </div>
              <h3 className="font-zuume type-display-sm leading-none font-bold text-ink uppercase">
                {item.verb}
              </h3>
              <p className="max-w-[36ch] type-copy text-pretty text-ink-body">
                {item.text}
              </p>
            </HomePart>
          ))}
        </ol>
      </HomeSection>
    </GuestOnly>
  );
}

export function HomeJoin({ members }: { members: number }): JSX.Element {
  const openSignIn = useOpenSignIn();

  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="join">
        <HomePart className="h-px w-full bg-line" name="rule" />
        <HomePart
          className="grid grid-cols-1 items-end gap-x-16 gap-y-8 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          name="close"
        >
          <div className="flex flex-col gap-6">
            <HomeText
              as="p"
              className={`${TONE.label} text-ink-muted`}
              part="tag"
              text="Roll credits"
            />
            <HomeText
              as="h2"
              className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance text-ink uppercase sm:type-display-xl lg:type-display-2xl`}
              part="finale"
              text="Start your diary tonight"
            />
          </div>
          <div className="flex flex-col items-start gap-6">
            <HomeText
              as="p"
              className="max-w-[40ch] type-base leading-7 text-pretty text-ink-body"
              part="pitch"
              text={`${
                members > 0
                  ? `Join ${formatWhole(members)} members who keep track of what they watch.`
                  : "Keep track of what you watch."
              } It’s free, and your first film takes a minute to log.`}
            />
            <HomePart name="cta">
              <Button
                intent="primary"
                onClick={openSignIn}
                shape="pill"
                size="lg"
              >
                Create your account
              </Button>
            </HomePart>
          </div>
        </HomePart>
      </HomeSection>
    </GuestOnly>
  );
}

// The pitch's art: a wall of whole posters in staggered columns, cut by the
// panel's edges and faded into it at the top and bottom.
const WALL_COLUMNS = 4;
const WALL_LIMIT = WALL_COLUMNS * 3;
const WALL_FADE =
  "[mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent)]";
const WALL_COLUMN_CLASS =
  "flex min-w-0 flex-col gap-3 self-center even:-translate-y-[9%] odd:translate-y-[9%]";

export function HomePitch({
  films,
  members,
}: {
  films: HomeFilm[];
  members: number;
}): JSX.Element | null {
  const openSignIn = useOpenSignIn();
  const posters = films.filter((film) => film.posterPath).slice(0, WALL_LIMIT);
  const columns = Array.from({ length: WALL_COLUMNS }, (_, column) =>
    posters.filter((_, index) => index % WALL_COLUMNS === column),
  );
  if (posters.length < 3) return null;

  return (
    <GuestOnly>
      <HomeSection
        className="grid w-full grid-cols-1 overflow-hidden rounded-shell border border-rule bg-plate lg:min-h-[30rem] lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]"
        cue="pitch"
      >
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10">
          <HomePart className="text-ink" name="mark">
            <Logo size={44} />
          </HomePart>
          <HomeText
            as="p"
            className={`${TONE.label} text-ink-muted`}
            part="tag"
            text="The film diary"
          />
          <h2 className="text-balance text-ink">
            <HomeText
              as="span"
              className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold uppercase sm:type-display-lg`}
              part="finale"
              text="Every film you’ve seen."
            />
            <HomeText
              as="span"
              className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold text-ink-muted uppercase sm:type-display-lg`}
              index={1}
              part="finale"
              text="Every one you’re about to."
            />
          </h2>
          <HomeText
            as="p"
            className="max-w-[40ch] type-copy text-pretty text-ink-body"
            part="pitch"
            text={`Log what you watch, rate it, write about it and keep lists worth sharing.${
              members > 0 ? ` ${formatWhole(members)} members already do.` : ""
            }`}
          />
          <HomePart className="flex" name="cta">
            <Button
              intent="primary"
              onClick={openSignIn}
              shape="pill"
              size="lg"
            >
              Start your diary
              <span className="font-normal opacity-70">· it’s free</span>
            </Button>
          </HomePart>
        </div>

        <div
          className={cn(
            WALL_FADE,
            "relative h-80 min-w-0 overflow-hidden sm:h-96 lg:h-auto",
          )}
        >
          <div className="absolute inset-0 grid grid-cols-4 gap-3 px-3 lg:pl-0">
            {columns.map((column, columnIndex) => (
              <ul className={WALL_COLUMN_CLASS} key={columnIndex}>
                {column.map((film) => (
                  <HomePart
                    as="li"
                    className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-tile bg-plate"
                    index={posters.indexOf(film)}
                    key={film.id}
                    name="slice"
                  >
                    <DockLink
                      aria-label={film.title}
                      className="absolute inset-0 block"
                      data-slot="frame"
                      href={movieHref(film.id)}
                    >
                      <img
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                        decoding="async"
                        loading="lazy"
                        src={tmdbImageUrl("poster", film.posterPath, "w342")!}
                      />
                    </DockLink>
                  </HomePart>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </HomeSection>
    </GuestOnly>
  );
}
