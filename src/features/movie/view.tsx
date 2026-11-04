import "server-only";
import { type JSX, Suspense } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { notFound } from "next/navigation";
import {
  DetailAwards,
  DetailLayout,
  DetailSidebar,
  FactNames,
  FactText,
  Heading,
} from "@/features/detail/layout";
import {
  DetailBloom,
  DetailPart,
  DetailSection,
  DetailText,
} from "@/features/detail/motion";
import type { Fact } from "@/features/detail/types";
import { hasAwards } from "@/features/detail/utils";
import {
  getMoviePopularLists,
  MoviePopularLists,
} from "@/features/lists/popular";
import type { MovieReviewSort } from "@/features/reviews/types";
import { MovieSocialProof } from "@/features/social/proof";
import { movieHref } from "@/lib/project";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import { AccountLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/feedback";
import { Carousel, Icon } from "@/ui/media";
import {
  CAROUSEL_ITEM,
  MAIN_COLUMN_CLASS,
  PROSE_CLASS,
  RADIUS,
  RULE_GAP,
  TONE,
} from "@/ui/tokens";
import { MoviePeople } from "./cast";
import {
  AFTER_TAGLINE,
  COMPACT_NUMBER_FORMAT,
  EXACT_NUMBER_FORMAT,
  MAX_VISIBLE_GENRES,
  MAX_VISIBLE_PEOPLE,
  MAX_VISIBLE_TAGS,
  TAGLINE_CLASS,
} from "./constants";
import {
  MoneyCount,
  MovieBackdropHero,
  MovieGallery,
  MovieGalleryWall,
  MoviePoster,
  MovieProjection,
  MovieVideos,
  MovieViewProvider,
  MovieViews,
  ReelProvider,
} from "./media";
import { MovieReviewDigest, MovieReviews } from "./reviews";
import {
  AwardsAction,
  MovieCollectionActions,
  MoviePageChrome,
  MoviePosterLink,
  MovieStage,
} from "./stage";
import type {
  AwardsRequest,
  FilmStats,
  MoviePageKind,
  PersonEntry,
} from "./types";
import {
  asName,
  capitalize,
  formatMoney,
  formatReleaseDate,
  getCast,
  getCertification,
  getCrew,
  getDirectors,
  getGalleryImages,
  getOriginalLanguageName,
  getPosterImages,
  getRecommendations,
  getTags,
  getVideoTypes,
  getWriters,
  membersLabel,
  movieSwatch,
  titleClass,
} from "./utils";

async function getFilmStats(tmdbId: number): Promise<FilmStats | null> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("film_stats")
      .select(
        "watched_count, liked_count, listed_count, watchlist_count, reviews_count, ratings",
      )
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      liked: data.liked_count,
      listed: data.listed_count,
      ratings: data.ratings,
      reviews: data.reviews_count,
      watched: data.watched_count,
      watchlist: data.watchlist_count,
    };
  } catch (error) {
    report("Film stats read", error);
    return null;
  }
}

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

function MovieSidebar({
  awards,
  movie,
}: {
  awards: Promise<Awards | null>;
  movie: MovieDetails;
}): JSX.Element {
  const directors = getDirectors(movie);
  const writers = getWriters(movie);
  const certification = getCertification(movie);
  const language = getOriginalLanguageName(movie);
  const released = formatReleaseDate(movie.releaseDate);
  const budget = formatMoney(movie.budget);
  const revenue = formatMoney(movie.revenue);
  const tags = getTags(movie);
  const genres = movie.genres.map((genre) => genre.name);

  const facts: Fact[] = [];
  if (genres.length > 0) {
    facts.push({
      label: genres.length > 1 ? "Genres" : "Genre",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_GENRES}
          names={genres.map((text) => ({ text }))}
          index={index}
        />
      ),
    });
  }
  if (tags.length > 0) {
    facts.push({
      label: "Tags",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_TAGS}
          names={tags.map((tag) => ({ text: capitalize(tag) }))}
          index={index}
        />
      ),
    });
  }
  if (directors.length > 0) {
    facts.push({
      label: directors.length > 1 ? "Directors" : "Director",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_PEOPLE}
          names={directors.map(asName)}
          index={index}
        />
      ),
    });
  }
  if (writers.length > 0) {
    facts.push({
      label: writers.length > 1 ? "Writers" : "Writer",
      value: (index) => (
        <FactNames
          max={MAX_VISIBLE_PEOPLE}
          names={writers.map(asName)}
          index={index}
        />
      ),
    });
  }
  if (released) {
    facts.push({
      label: "Released",
      value: (index) => <FactText index={index}>{released}</FactText>,
    });
  }
  if (certification) {
    facts.push({
      label: "Rated",
      value: (index) => <FactText index={index}>{certification}</FactText>,
    });
  }
  if (language) {
    facts.push({
      label: "Language",
      value: (index) => <FactText index={index}>{language}</FactText>,
    });
  }
  if (movie.status !== "Unknown") {
    facts.push({
      label: "Status",
      value: (index) => <FactText index={index}>{movie.status}</FactText>,
    });
  }
  if (budget) {
    facts.push({
      label: "Budget",
      value: (index) => <MoneyCount index={index} value={movie.budget ?? 0} />,
    });
  }
  if (revenue) {
    facts.push({
      label: "Revenue",
      value: (index) => <MoneyCount index={index} value={movie.revenue ?? 0} />,
    });
  }

  return (
    <DetailSidebar facts={facts}>
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

const STATS = [
  {
    icon: "solar:eye-bold",
    label: (stats: FilmStats) => `Watched by ${membersLabel(stats.watched)}`,
    value: (stats: FilmStats) => stats.watched,
  },
  {
    icon: "solar:widget-bold",
    label: (stats: FilmStats) =>
      `Appears in ${EXACT_NUMBER_FORMAT.format(stats.listed)} ${stats.listed === 1 ? "list" : "lists"}`,
    value: (stats: FilmStats) => stats.listed,
  },
  {
    icon: "solar:heart-bold",
    label: (stats: FilmStats) => `Liked by ${membersLabel(stats.liked)}`,
    value: (stats: FilmStats) => stats.liked,
  },
] as const;

function MovieStats({
  stats,
}: {
  stats: FilmStats | null;
}): JSX.Element | null {
  if (!stats || stats.watched + stats.listed + stats.liked === 0) return null;

  return (
    <div className="relative flex shrink-0 items-center gap-5">
      {STATS.map((stat) => (
        <DetailPart key={stat.icon} name="stat">
          <Tooltip position="top" text={stat.label(stats)}>
            <span className="flex cursor-help items-center gap-1.5 type-control leading-5 font-medium text-ink-body tabular-nums">
              <Icon className="text-ink-muted" icon={stat.icon} size={16} />
              {COMPACT_NUMBER_FORMAT.format(stat.value(stats))}
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
        className="rounded-card"
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
