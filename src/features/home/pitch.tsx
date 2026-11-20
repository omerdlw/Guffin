"use client";

import type { JSX } from "react";
import { Button } from "@omerdlw/base-framework/ui";
import { DockLink } from "@/design/components/link";
import { Logo } from "@/design/components/logo";
import { HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { movieHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { GuestOnly } from "./craft";
import type { HomeFilm } from "./feed";
import { formatWhole } from "./format";
import { HomePart, HomeSection, HomeText } from "./motion";

const SLICE_LIMIT = 6;

const SLICE_CLASS =
  "relative -ml-[14%] h-full min-w-0 flex-1 overflow-hidden rounded-l-[32%_50%] border-l-2 border-line first:ml-0 first:rounded-none first:border-l-0";

export function HomePitch({
  films,
  members,
}: {
  films: HomeFilm[];
  members: number;
}): JSX.Element | null {
  const openSignIn = useOpenSignIn();
  const posters = films.filter((film) => film.posterPath).slice(0, SLICE_LIMIT);
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

        <ul className="flex h-80 min-w-0 sm:h-96 lg:h-auto">
          {posters.map((film, index) => (
            <HomePart
              as="li"
              className={SLICE_CLASS}
              index={index}
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
                  src={tmdbImageUrl("poster", film.posterPath, "w500")!}
                />
              </DockLink>
            </HomePart>
          ))}
        </ul>
      </HomeSection>
    </GuestOnly>
  );
}
