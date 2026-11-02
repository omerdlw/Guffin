import {
  ASIDE_CLASS,
  COLUMNS_CLASS,
  CONTAINER_CLASS,
  HEADER_CLASS,
  MAIN_COLUMN_CLASS,
  PAGE_CLASS,
  pageBodyClass,
  PROSE_CLASS,
  RULE_GAP,
  StickyAside,
} from "@/ui";
import { cn } from "@/ui/cn";
import { Suspense, type JSX } from "react";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type {
  Awards,
  MovieDetails,
  MovieImages,
} from "@/infrastructure/tmdb/types";
import { AFTER_TAGLINE, TAGLINE_CLASS, titleClass } from "../styles";
import { MoviePart, MovieText, MovieWallStage } from "../motion";
import type { FilmStats, PersonEntry } from "../types";
import type { MovieReviewSort } from "@/features/reviews";
import { AccountLink } from "@/features/account";
import { movieHref } from "@/config/routes";
import {
  getCast,
  getCrew,
  getGalleryImages,
  getPosterImages,
  getVideoTypes,
} from "../utils";
import { MovieBackdropHero } from "./artwork";
import { MovieAwards } from "./awards";
import { MovieGallery, MovieGalleryWall } from "./gallery";
import { MovieStage } from "./stage";
import { MoviePeople } from "./people";
import { MovieProjection } from "./projection";
import { MovieRecommendations } from "./recommendations";
import { ReelProvider } from "./reel";
import { MoviePopularLists, type PopularList } from "@/features/lists";
import { MovieReviewDigest } from "./review-digest";
import { MovieReviews } from "./reviews";
import { MovieSidebar } from "./sidebar";
import { MovieViews } from "./view-switcher";
import { MovieVideos } from "./videos";

export type MoviePageKind =
  | { kind: "film"; popularLists: Promise<PopularList[]> }
  | { kind: "reviews"; reviewer: string | null; sort: MovieReviewSort };

export function MovieView({
  awards,
  images,
  movie,
  page,
  stats,
}: {
  awards: Promise<Awards | null>;
  images: MovieImages;
  movie: MovieDetails;
  page: MoviePageKind;
  stats: FilmStats | null;
}): JSX.Element {
  const backdrop = tmdbImageUrl("backdrop", movie.backdropPath, "original");

  const cast: PersonEntry[] = getCast(movie).map((member) => ({
    id: member.id,
    key: member.creditId,
    name: member.name,
    profilePath: member.profilePath,
    subtitle: member.character ?? "Cast",
  }));
  const crew: PersonEntry[] = getCrew(movie).map((member) => ({
    id: member.id,
    key: `${member.id}-${member.creditId}`,
    name: member.name,
    profilePath: member.profilePath,
    subtitle: member.jobs,
  }));

  const title = (
    <MovieText
      as="h1"
      className={titleClass(movie.title)}
      mask
      part="title"
      text={movie.title}
    />
  );

  return (
    <ReelProvider>
      <MovieStage movie={movie}>
        <main
          className={`movie-page ui-scene overflow-x-clip ${PAGE_CLASS}`}
          data-cinematic=""
        >
          <MovieProjection movie={movie} />
          <MovieWallStage
            cue="wall"
            wall={
              <MovieGalleryWall
                backdrops={getGalleryImages(images)}
                posters={getPosterImages(images)}
                title={movie.title}
              />
            }
          >
            <div className={CONTAINER_CLASS}>
              {backdrop ? <MovieBackdropHero movie={movie} /> : null}

              <div className={pageBodyClass(Boolean(backdrop))}>
                <div className={COLUMNS_CLASS}>
                  <header className={HEADER_CLASS}>
                    {page.kind === "reviews" ? (
                      <AccountLink
                        className="ui-fade hover:opacity-80"
                        href={movieHref(movie.id)}
                      >
                        {title}
                      </AccountLink>
                    ) : (
                      title
                    )}
                    {movie.tagline || movie.overview ? (
                      <MoviePart
                        className={`${RULE_GAP} h-px w-full bg-grade/40`}
                        name="rule"
                      />
                    ) : null}
                    {movie.tagline ? (
                      <MovieText
                        as="p"
                        className={`${TAGLINE_CLASS} opacity-90`}
                        part="tagline"
                        text={movie.tagline}
                      />
                    ) : null}
                    {movie.overview ? (
                      <MovieText
                        as="p"
                        by="line"
                        className={cn(
                          PROSE_CLASS,
                          "opacity-70",
                          movie.tagline && AFTER_TAGLINE,
                        )}
                        part="overview"
                        text={movie.overview}
                      />
                    ) : null}
                  </header>

                  <StickyAside className={ASIDE_CLASS}>
                    <MovieSidebar awards={awards} movie={movie} stats={stats} />
                  </StickyAside>

                  {page.kind === "reviews" ? (
                    <div className={MAIN_COLUMN_CLASS}>
                      <MovieReviews
                        initialSort={page.sort}
                        movieId={movie.id}
                        reviewer={page.reviewer}
                        title={movie.title}
                      />
                    </div>
                  ) : (
                    <MovieViews
                      views={{
                        awards: (
                          <Suspense fallback={null}>
                            <MovieAwards awards={awards} />
                          </Suspense>
                        ),
                        overview: (
                          <>
                            <MoviePeople cast={cast} crew={crew} />
                            <MovieGallery
                              backdrops={getGalleryImages(images)}
                              posters={getPosterImages(images)}
                              title={movie.title}
                            />
                            <MovieVideos
                              types={getVideoTypes(movie)}
                              videos={movie.videos}
                            />
                            <MovieRecommendations movie={movie} />
                          </>
                        ),
                      }}
                    />
                  )}
                </div>

                {page.kind === "film" ? (
                  <>
                    <MovieReviewDigest movieId={movie.id} title={movie.title} />
                    <Suspense fallback={null}>
                      <MoviePopularLists lists={page.popularLists} />
                    </Suspense>
                  </>
                ) : null}
              </div>
            </div>
          </MovieWallStage>
        </main>
      </MovieStage>
    </ReelProvider>
  );
}
