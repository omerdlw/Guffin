import type { JSX } from "react";
import { AccountLink } from "@/features/account";
import { MoviePosterLink } from "@/features/movie";
import { RADIUS, TONE } from "@/ui";
import { movieHref } from "@/config/routes";
import type { RisingFilm } from "../types";
import { HomePart, HomeSection } from "../motion";
import { Heading } from "./heading";

export function HomeRising({
  films,
}: {
  films: RisingFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="rising">
      <Heading icon="solar:graph-up-bold" title="Rising on Guffin" />
      <ol
        className={`-my-4 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} sm:grid-cols-2 sm:divide-y-0 sm:[&>li]:border-b sm:[&>li]:border-rule sm:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {films.map((film, index) => (
          <HomePart
            as="li"
            className="flex items-center gap-4 py-4"
            index={index}
            key={film.id}
            name="entry"
          >
            <span className="font-zuume w-9 shrink-0 text-right type-display-xs leading-none font-bold text-ink-faint tabular-nums">
              {index + 1}
            </span>
            <div className="w-11 shrink-0">
              <MoviePosterLink
                movie={film}
                radius={RADIUS.thumb}
                sizes="44px"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <AccountLink
                className="truncate type-copy font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
                href={movieHref(film.id)}
              >
                {film.title}
              </AccountLink>
              <span className="truncate type-meta text-ink-muted tabular-nums">
                {[film.year, `${film.week} members this week`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 type-meta font-semibold tabular-nums ${TONE.chosen}`}
              title="Members this week against its usual week"
            >
              {film.lift.toFixed(1)}×
            </span>
          </HomePart>
        ))}
      </ol>
    </HomeSection>
  );
}
