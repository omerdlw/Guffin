import "server-only";

import { type JSX, Suspense } from "react";
import { notFound } from "next/navigation";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { Tooltip } from "@/design/components/tooltip";
import { RADIUS } from "@/design/foundations/geometry";
import {
  CAROUSEL_ITEM,
  PROSE_CLASS,
  RULE_GAP,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { type Fact, type FactName, hasAwards } from "@/features/detail/detail";
import {
  DetailAwards,
  DetailLayout,
  DetailReviewsLayout,
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
import { MediaReviewsHeader } from "@/features/detail/reviews-header";
import type { PopularList } from "@/features/lists/list";
import { MoviePopularLists } from "@/features/lists/popular";
import { getMoviePopularLists } from "@/features/lists/server";
import type { MovieReviewSort } from "@/features/reviews/review";
import { MovieSocialProof } from "@/features/social/proof";
import { pluralize } from "@/lib/format";
import { movieHref, personHref } from "@/lib/project";
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
import { MoviePeople } from "./cast";
import { MovieCollectionActions } from "./collection";
import { MovieGallery, MovieGalleryWall, MovieVideos } from "./gallery";
import {
  MoneyCount,
  MovieBackdropHero,
  MoviePoster,
  MovieProjection,
} from "./media";
import {
  AFTER_TAGLINE,
  capitalizeWords,
  type FilmStats,
  formatMoney,
  getDirectors,
  getGalleryImages,
  getPosterImages,
  getVideoTypes,
  hasFilmStats,
  movieSwatch,
  movieTitleClass,
  type PersonEntry,
  TAGLINE_CLASS,
  uniqueById,
} from "./movie";
import { MovieReviewDigest, MovieReviews } from "./reviews";
import { getFilmStats, getPeopleKnownFor } from "./server";
import {
  AwardsAction,
  MoviePageChrome,
  MoviePosterLink,
  MovieStage,
} from "./stage";
import { MovieViewProvider, MovieViews, ReelProvider } from "./views";

interface MovieCrewEntry {
  creditId: string;
  department: string | null;
  id: number;
  jobs: string;
  name: string;
  profilePath: string | null;
}

type AwardsRequest = Promise<Awards | null>;

type MoviePageKind =
  | { kind: "film"; popularLists: Promise<PopularList[]> }
  | { kind: "reviews"; reviewer: string | null; sort: MovieReviewSort };

const MOVIE_TAG_LIMIT = 10;

const MOVIE_TAG_MAX_LENGTH = 28;

const MOVIE_RECOMMENDATION_LIMIT = 12;

const MOVIE_WRITER_LIMIT = 10;

const MOVIE_CERTIFICATION_REGION = "US";

const WRITING_JOBS: ReadonlySet<string> = new Set([
  "Screenplay",
  "Writer",
  "Story",
  "Novel",
  "Author",
]);

const RELEASE_TYPE_PRIORITY = [3, 2, 4, 5, 6, 1];

const MOVIE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

const CREW_JOB_PRIORITY = [
  "Director",
  "Screenplay",
  "Writer",
  "Story",
  "Producer",
  "Executive Producer",
  "Director of Photography",
  "Original Music Composer",
  "Editor",
  "Production Design",
  "Costume Design",
];

const MAX_VISIBLE_PEOPLE = 2;

const MAX_VISIBLE_GENRES = 3;

const MAX_VISIBLE_TAGS = 2;

const COMPACT_NUMBER_FORMAT = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
  notation: "compact",
});

function formatReleaseDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? null
    : MOVIE_DATE_FORMAT.format(parsed);
}

function getWriters(movie: MovieDetails, limit = MOVIE_WRITER_LIMIT) {
  return uniqueById(
    movie.credits.crew.filter(
      (c) => c.department === "Writing" && c.job && WRITING_JOBS.has(c.job),
    ),
  ).slice(0, limit);
}

function getCast(movie: MovieDetails) {
  return uniqueById([...movie.credits.cast].sort((a, b) => a.order - b.order));
}

function getCrew(movie: MovieDetails): MovieCrewEntry[] {
  const people = new Map<number, MovieCrewEntry & { rank: number }>();
  const rankOf = (job: string | null) => {
    const index = job ? CREW_JOB_PRIORITY.indexOf(job) : -1;
    return index === -1 ? CREW_JOB_PRIORITY.length : index;
  };

  for (const member of movie.credits.crew) {
    if (!member.job) continue;
    const existing = people.get(member.id);
    if (!existing) {
      people.set(member.id, {
        creditId: member.creditId,
        department: member.department,
        id: member.id,
        jobs: member.job,
        name: member.name,
        profilePath: member.profilePath,
        rank: rankOf(member.job),
      });
    } else {
      if (!existing.jobs.split(" / ").includes(member.job)) {
        existing.jobs = `${existing.jobs} / ${member.job}`;
      }
      existing.rank = Math.min(existing.rank, rankOf(member.job));
    }
  }

  return [...people.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...entry }) => entry);
}

function getTags(movie: MovieDetails, limit = MOVIE_TAG_LIMIT) {
  const genres = new Set(movie.genres.map((g) => g.name.toLowerCase()));
  const seen = new Set<string>();
  return movie.keywords
    .map((keyword) => keyword.name.trim())
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || name.length > MOVIE_TAG_MAX_LENGTH) return false;
      if (genres.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function getOriginalLanguageName(movie: MovieDetails): string | null {
  return (
    movie.spokenLanguages.find((l) => l.code === movie.originalLanguage)
      ?.englishName ?? movie.originalLanguage
  );
}

function getRecommendations(
  movie: MovieDetails,
  limit = MOVIE_RECOMMENDATION_LIMIT,
) {
  return movie.recommendations.filter((m) => m.id !== movie.id).slice(0, limit);
}

function getCertification(
  movie: MovieDetails,
  region: string = MOVIE_CERTIFICATION_REGION,
): string | null {
  const releases =
    movie.releaseDates.find((r) => r.region === region)?.releases ?? [];
  const rank = (type: number) => {
    const index = RELEASE_TYPE_PRIORITY.indexOf(type);
    return index === -1 ? RELEASE_TYPE_PRIORITY.length : index;
  };
  return (
    [...releases]
      .filter((r) => r.certification)
      .sort((a, b) => rank(a.type) - rank(b.type))[0]?.certification ?? null
  );
}

const toFactName = (person: { id: number; name: string }): FactName => ({
  href: personHref(person.id),
  text: person.name,
});

const formatMembers = (count: number) => pluralize(count, "member");

function toPersonEntries(movie: MovieDetails): {
  cast: PersonEntry[];
  crew: PersonEntry[];
} {
  return {
    cast: getCast(movie).map((member) => ({
      id: member.id,
      key: member.creditId,
      name: member.name,
      profilePath: member.profilePath,
      subtitle: member.character ?? "Cast",
    })),
    crew: getCrew(movie).map((member) => ({
      id: member.id,
      key: `${member.id}-${member.creditId}`,
      name: member.name,
      profilePath: member.profilePath,
      subtitle: member.jobs,
    })),
  };
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
      <MovieSocialProof index={5} movieId={movie.id} title={movie.title} />
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
      {FILM_STAT_ROWS.map((row, index) => (
        <DetailPart index={index} key={row.icon} name="stat">
          <Tooltip
            position="top"
            text={row.label(stats)}
            triggerClassName="flex cursor-help items-center gap-1.5 type-control leading-5 font-medium text-ink-body tabular-nums"
          >
            <Icon className="text-ink-muted" icon={row.icon} size={16} />
            {COMPACT_NUMBER_FORMAT.format(row.value(stats))}
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
  stats,
}: {
  movie: MovieDetails;
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
      {title}
      {movie.tagline || movie.overview || hasFilmStats(stats) ? (
        <div className={`${RULE_GAP} relative flex w-full items-center gap-5`}>
          <DetailPart className="h-px flex-1 bg-grade/40" name="rule" />
          <MovieStats stats={stats} />
        </div>
      ) : null}
      {movie.tagline ? (
        <DetailText
          as="p"
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
  const knownFor = getPeopleKnownFor(
    { cast, crew },
    { id: movie.id, mediaType: "movie" },
  );
  const backdrops = getGalleryImages(images);
  const posters = getPosterImages(images);

  if (page.kind === "reviews") {
    return (
      <ReelProvider>
        <MovieStage movie={movie}>
          <DetailReviewsLayout
            backdrop={backdrop ? <MovieBackdropHero movie={movie} /> : null}
            className="movie-page"
            header={
              <MediaReviewsHeader
                href={movieHref(movie.id)}
                media={movie}
                poster={!page.reviewer}
              />
            }
            intermission={<MovieProjection movie={movie} />}
            main={
              <MovieReviews
                key={page.reviewer ?? ""}
                initialSort={page.sort}
                movieId={movie.id}
                reviewer={page.reviewer}
                title={movie.title}
              />
            }
          />
        </MovieStage>
      </ReelProvider>
    );
  }

  return (
    <ReelProvider>
      <MovieStage movie={movie}>
        <DetailLayout
          after={
            <>
              <MovieReviewDigest movieId={movie.id} title={movie.title} />
              <Suspense fallback={null}>
                <MoviePopularLists lists={page.popularLists} />
              </Suspense>
            </>
          }
          backdrop={backdrop ? <MovieBackdropHero movie={movie} /> : null}
          className="movie-page"
          header={<MovieHeader movie={movie} stats={stats} />}
          intermission={<MovieProjection movie={movie} />}
          main={
            <MovieViews
              views={{
                awards: (
                  <Suspense fallback={null}>
                    <MovieAwards awards={awards} />
                  </Suspense>
                ),
                overview: (
                  <>
                    <MoviePeople cast={cast} crew={crew} knownFor={knownFor} />
                    <MovieGallery
                      backdrops={backdrops}
                      now
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
      <MoviePageChrome
        movie={result.data}
        palette={palette}
        reviews={reviews !== null}
      />
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
