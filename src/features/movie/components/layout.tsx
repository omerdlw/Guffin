import { MAIN_COLUMN_CLASS, PROSE_CLASS, RULE_GAP } from "@/ui";
import { cn } from "@/ui/cn";
import { Suspense, type JSX } from "react";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import type {
  Awards,
  MovieDetails,
  MovieImages,
} from "@/infrastructure/tmdb/types";
import { AFTER_TAGLINE, TAGLINE_CLASS, titleClass } from "../styles";
import {
  DetailBloom,
  DetailLayout,
  DetailPart,
  DetailText,
} from "@/features/detail";
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
import { MovieStats } from "./stats";
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

  const hasStats = !!stats && stats.watched + stats.listed + stats.liked > 0;

  const title = (
    <DetailBloom
      as="h1"
      className={titleClass(movie.title)}
      part="title"
      text={movie.title}
    />
  );

  return (
    <ReelProvider>
      <MovieStage movie={movie}>
        <DetailLayout
          after={
            page.kind === "film" ? (
              <>
                <MovieReviewDigest movieId={movie.id} title={movie.title} />
                <Suspense fallback={null}>
                  <MoviePopularLists lists={page.popularLists} />
                </Suspense>
              </>
            ) : null
          }
          backdrop={backdrop ? <MovieBackdropHero movie={movie} /> : null}
          className="movie-page"
          header={
            <>
              {page.kind === "reviews" ? (
                <AccountLink
                  className="ui-fade hover:opacity-80 focus-visible:opacity-80"
                  href={movieHref(movie.id)}
                >
                  {title}
                </AccountLink>
              ) : (
                title
              )}
              {movie.tagline || movie.overview || hasStats ? (
                <div
                  className={`${RULE_GAP} relative flex w-full items-center gap-5`}
                >
                  <DetailPart className="h-px flex-1 bg-grade/40" name="rule" />
                  <MovieStats stats={stats} />
                </div>
              ) : null}
              {movie.tagline ? (
                <DetailText
                  as="p"
                  by="char"
                  className={`${TAGLINE_CLASS} opacity-90`}
                  part="tagline"
                  text={movie.tagline}
                />
              ) : null}
              {movie.overview ? (
                <DetailText
                  as="p"
                  className={cn(
                    PROSE_CLASS,
                    "opacity-70",
                    movie.tagline && AFTER_TAGLINE,
                  )}
                  part="overview"
                  text={movie.overview}
                />
              ) : null}
            </>
          }
          intermission={<MovieProjection movie={movie} />}
          main={
            page.kind === "reviews" ? (
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
            )
          }
          sidebar={<MovieSidebar awards={awards} movie={movie} />}
          wall={
            <MovieGalleryWall
              backdrops={getGalleryImages(images)}
              posters={getPosterImages(images)}
              title={movie.title}
            />
          }
        />
      </MovieStage>
    </ReelProvider>
  );
}
