import "server-only";
import { type JSX, Suspense } from "react";
import { notFound } from "next/navigation";
import {
  DetailAwards,
  DetailLayout,
  DetailSidebar,
  Heading,
  namesFact,
  textFact,
} from "@/features/detail/layout";
import {
  DetailBloom,
  DetailPart,
  DetailSection,
  DetailText,
} from "@/features/detail/motion";
import type { Fact } from "@/features/detail/types";
import { hasAwards } from "@/features/detail/utils";
import { MoviePopularLists } from "@/features/lists/popular";
import { getMoviePopularLists } from "@/features/lists/server";
import type { MovieReviewSort } from "@/features/reviews/types";
import { MovieSocialProof } from "@/features/social/proof";
import { pluralize } from "@/lib/format";
import { movieHref } from "@/lib/project";
import {
  getAmbientPalette,
  getMovieAwards,
  getMovieDetails,
  getMovieImages,
} from "@/lib/tmdb/server";
import {
  type Awards,
  type MovieDetails,
  type MovieImages,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { Tooltip } from "@/design/components/tooltip";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import {
  CAROUSEL_ITEM,
  MAIN_COLUMN_CLASS,
  PROSE_CLASS,
  RULE_GAP,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { MoviePeople } from "./cast";
import { MovieCollectionActions } from "./collection";
import {
  AFTER_TAGLINE,
  COMPACT_NUMBER_FORMAT,
  MAX_VISIBLE_GENRES,
  MAX_VISIBLE_PEOPLE,
  MAX_VISIBLE_TAGS,
  TAGLINE_CLASS,
} from "./constants";
import { MovieGallery, MovieGalleryWall, MovieVideos } from "./gallery";
import {
  MoneyCount,
  MovieBackdropHero,
  MoviePoster,
  MovieProjection,
} from "./media";
import { MovieViewProvider, MovieViews, ReelProvider } from "./views";
import { MovieReviewDigest, MovieReviews } from "./reviews";
import { getFilmStats } from "./server";
import {
  AwardsAction,
  MoviePageChrome,
  MoviePosterLink,
  MovieStage,
} from "./stage";
import type { AwardsRequest, FilmStats, MoviePageKind } from "./types";
import {
  capitalizeWords,
  formatMembers,
  formatMoney,
  formatReleaseDate,
  getCertification,
  getDirectors,
  getGalleryImages,
  getOriginalLanguageName,
  getPosterImages,
  getRecommendations,
  getTags,
  getVideoTypes,
  getWriters,
  hasFilmStats,
  movieSwatch,
  movieTitleClass,
  toFactName,
  toPersonEntries,
} from "./utils";

function MovieAwards({ awards }: { awards: AwardsRequest }): JSX.Element {
  return (
    <DetailAwards
      awards={awards}
      groupings={["organizations", "timeline"]}
      showRecipients
    />
  );
}

async function MovieAwardsAction({
  awards,
}: {
  awards: AwardsRequest;
}): Promise<JSX.Element | null> {
  if (!hasAwards(await awards)) return null;
  return <AwardsAction />;
}

function pluralLabel(count: number, one: string, many: string): string {
  return count > 1 ? many : one;
}

function buildFacts(movie: MovieDetails): Fact[] {
  const directors = getDirectors(movie);
  const writers = getWriters(movie);
  const certification = getCertification(movie);
  const language = getOriginalLanguageName(movie);
  const released = formatReleaseDate(movie.releaseDate);
  const tags = getTags(movie);
  const genres = movie.genres.map((genre) => ({ text: genre.name }));

  const facts: (Fact | false | null | "")[] = [
    genres.length > 0 &&
      namesFact(
        pluralLabel(genres.length, "Genre", "Genres"),
        MAX_VISIBLE_GENRES,
        genres,
      ),
    tags.length > 0 &&
      namesFact(
        "Tags",
        MAX_VISIBLE_TAGS,
        tags.map((tag) => ({ text: capitalizeWords(tag) })),
      ),
    directors.length > 0 &&
      namesFact(
        pluralLabel(directors.length, "Director", "Directors"),
        MAX_VISIBLE_PEOPLE,
        directors.map(toFactName),
      ),
    writers.length > 0 &&
      namesFact(
        pluralLabel(writers.length, "Writer", "Writers"),
        MAX_VISIBLE_PEOPLE,
        writers.map(toFactName),
      ),
    released && textFact("Released", released),
    certification && textFact("Rated", certification),
    language && textFact("Language", language),
    movie.status !== "Unknown" && textFact("Status", movie.status),
    formatMoney(movie.budget) && {
      label: "Budget",
      value: (index) => <MoneyCount index={index} value={movie.budget ?? 0} />,
    },
    formatMoney(movie.revenue) && {
      label: "Revenue",
      value: (index) => <MoneyCount index={index} value={movie.revenue ?? 0} />,
    },
  ];
  return facts.filter((fact): fact is Fact => Boolean(fact));
}

function MovieSidebar({
  awards,
  movie,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
}): JSX.Element {
  return (
    <DetailSidebar facts={buildFacts(movie)}>
      <MoviePoster awards={awards} movie={movie} />
      <MovieCollectionActions movieId={movie.id}>
        <Suspense fallback={null}>
          <MovieAwardsAction awards={awards} />
        </Suspense>
      </MovieCollectionActions>
      <MovieSocialProof movieId={movie.id} title={movie.title} />
    </DetailSidebar>
  );
}

const FILM_STAT_ROWS = [
  {
    icon: "solar:eye-bold",
    label: (stats: FilmStats) => `Watched by ${formatMembers(stats.watched)}`,
    value: (stats: FilmStats) => stats.watched,
  },
  {
    icon: "solar:widget-bold",
    label: (stats: FilmStats) =>
      `Appears in ${pluralize(stats.listed, "list")}`,
    value: (stats: FilmStats) => stats.listed,
  },
  {
    icon: "solar:heart-bold",
    label: (stats: FilmStats) => `Liked by ${formatMembers(stats.liked)}`,
    value: (stats: FilmStats) => stats.liked,
  },
] as const;

export function MovieStats({
  stats,
}: {
  stats: FilmStats | null;
}): JSX.Element | null {
  if (!hasFilmStats(stats)) return null;

  return (
    <div className="relative flex shrink-0 items-center gap-5">
      {FILM_STAT_ROWS.map((row) => (
        <DetailPart key={row.icon} name="stat">
          <Tooltip position="top" text={row.label(stats)}>
            <span className="flex cursor-help items-center gap-1.5 type-control leading-5 font-medium text-ink-body tabular-nums">
              <Icon className="text-ink-muted" icon={row.icon} size={16} />
              {COMPACT_NUMBER_FORMAT.format(row.value(stats))}
            </span>
          </Tooltip>
        </DetailPart>
      ))}
    </div>
  );
}

function MovieRecommendations({
  movie,
}: {
  movie: MovieDetails;
}): JSX.Element | null {
  const recommendations = getRecommendations(movie);
  if (recommendations.length === 0) return null;

  return (
    <DetailSection className="flex w-full flex-col" cue="row">
      <Heading icon="solar:stars-minimalistic-bold" title="More like this" />
      <Carousel
        arrowClassName={TONE.arrows}
        itemClassName={CAROUSEL_ITEM}
        label="More like this"
        part="slide"
      >
        {recommendations.map((item) => (
          <MoviePosterLink
            key={item.id}
            movie={{
              id: item.id,
              posterPath: item.posterPath,
              title: item.title,
              year: item.releaseYear,
            }}
            radius={RADIUS.card}
            sizes="(min-width: 768px) 22vw, 30vw"
          />
        ))}
      </Carousel>
    </DetailSection>
  );
}

function MovieHeader({
  movie,
  page,
  stats,
}: {
  movie: MovieDetails;
  page: MoviePageKind;
  stats: FilmStats | null;
}): JSX.Element {
  const title = (
    <DetailBloom
      as="h1"
      className={movieTitleClass(movie.title)}
      part="title"
      text={movie.title}
    />
  );

  return (
    <>
      {page.kind === "reviews" ? (
        <DockLink
          className="ui-fade hover:opacity-80 focus-visible:opacity-80"
          href={movieHref(movie.id)}
        >
          {title}
        </DockLink>
      ) : (
        title
      )}
      {movie.tagline || movie.overview || hasFilmStats(stats) ? (
        <div className={`${RULE_GAP} relative flex w-full items-center gap-5`}>
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
  );
}

function MovieView({
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
  const { cast, crew } = toPersonEntries(movie);
  const backdrops = getGalleryImages(images);
  const posters = getPosterImages(images);

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
          header={<MovieHeader movie={movie} page={page} stats={stats} />}
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
                        backdrops={backdrops}
                        posters={posters}
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
              backdrops={backdrops}
              posters={posters}
              title={movie.title}
            />
          }
        />
      </MovieStage>
    </ReelProvider>
  );
}

export async function MoviePageContent({
  id,
  reviews = null,
}: {
  id: number;
  reviews?: { reviewer: string | null; sort: MovieReviewSort } | null;
}): Promise<JSX.Element> {
  const details = getMovieDetails(id);
  const [result, pictures, palette, stats] = await Promise.all([
    details,
    getMovieImages(id),
    details.then((outcome) =>
      outcome.success
        ? getAmbientPalette(
            movieSwatch(outcome.data.backdropPath, outcome.data.posterPath),
          )
        : null,
    ),
    getFilmStats(id),
  ]);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Movie ${id} is unavailable (${result.error.kind})`);
  }

  const awards = getMovieAwards(id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );

  return (
    <MovieViewProvider>
      <MoviePageChrome movie={result.data} palette={palette} />
      <MovieView
        awards={awards}
        images={pictures.success ? pictures.data : result.data.images}
        movie={result.data}
        page={
          reviews
            ? { kind: "reviews", ...reviews }
            : { kind: "film", popularLists: getMoviePopularLists(id) }
        }
        stats={stats}
      />
    </MovieViewProvider>
  );
}
