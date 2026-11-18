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
import { isAiring } from "@/features/catalog/quality";
import { ensureCatalogEntry } from "@/features/catalog/server";
import type { Fact } from "@/features/detail/detail";
import {
  DetailLayout,
  DetailReviewsLayout,
  DetailSidebar,
  DetailTags,
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
import { MoviePopularLists } from "@/features/lists/popular";
import { getMoviePopularLists } from "@/features/lists/server";
import { MediaTypeProvider } from "@/features/media/media-type";
import { MoviePeople } from "@/features/movie/cast";
import { MovieCollectionActions } from "@/features/movie/collection";
import {
  MovieGallery,
  MovieGalleryWall,
  MovieVideos,
} from "@/features/movie/gallery";
import {
  MovieBackdropHero,
  MoviePoster,
  MovieProjection,
} from "@/features/movie/media";
import {
  AFTER_TAGLINE,
  artworkOf,
  capitalizeWords,
  getGalleryImages,
  getPosterImages,
  pathsOf,
  getVideoTypes,
  hasFilmStats,
  movieSwatch,
  movieTitleClass,
  type PersonEntry,
  TAGLINE_CLASS,
  uniqueById,
} from "@/features/movie/movie";
import { MovieReviewDigest, MovieReviews } from "@/features/movie/reviews";
import { getFilmStats, getPeopleKnownFor } from "@/features/movie/server";
import { MoviePosterLink, MovieStage } from "@/features/movie/stage";
import {
  MovieAwards,
  MovieAwardsAction,
  MovieStats,
} from "@/features/movie/view";
import {
  MovieViewProvider,
  MovieViews,
  ReelProvider,
} from "@/features/movie/views";
import type { MovieReviewSort } from "@/features/reviews/review";
import { MovieSocialProof } from "@/features/social/proof";
import { personHref, tvHref } from "@/lib/project";
import {
  getAmbientPalette,
  getShowAwards,
  getShowDetails,
} from "@/lib/tmdb/server";
import {
  type SeasonSummary,
  type ShowDetails,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import { SeasonShelf, type ShelfProgress, ShowResume } from "./seasons";
import { getSeasonStills, getShowTracking } from "./server";
import {
  daysUntil,
  formatEpisodeCode,
  formatEpisodeDate,
  isAired,
  showChrome,
  type ShowTracking,
  splitSeasons,
} from "./show";
import { ShowPageChrome } from "./stage";
import { ShowStatusAction } from "./status";

type ShowPageKind =
  | { kind: "show" }
  | { kind: "reviews"; reviewer: string | null; sort: ShowReviewSort };

type ShowReviewSort = MovieReviewSort;

const SHOW_CERTIFICATION_REGION = "US";

const SHOW_RECOMMENDATION_LIMIT = 18;

const MAX_VISIBLE_NETWORKS = 3;

const SHOW_STATUS_TEXT: Record<string, string> = {
  "Returning Series": "Returning",
  "In Production": "In production",
  Planned: "Planned",
  Pilot: "Pilot",
  Ended: "Ended",
  Canceled: "Canceled",
};

const SHOW_CREW_JOBS = [
  "Creator",
  "Showrunner",
  "Executive Producer",
  "Director",
  "Writer",
  "Original Music Composer",
  "Director of Photography",
  "Editor",
] as const;

function showStatusText(status: string): string | null {
  return SHOW_STATUS_TEXT[status] ?? null;
}

function getShowCertification(
  show: Pick<ShowDetails, "contentRatings">,
  region: string = SHOW_CERTIFICATION_REGION,
): string | null {
  return (
    show.contentRatings.find((rating) => rating.region === region)?.rating ??
    null
  );
}

function getShowRecommendations(
  show: Pick<ShowDetails, "id" | "recommendations">,
  limit = SHOW_RECOMMENDATION_LIMIT,
) {
  return show.recommendations
    .filter((item) => item.id !== show.id && item.posterPath)
    .slice(0, limit);
}

function toShowPersonEntries(show: Pick<ShowDetails, "credits">): {
  cast: PersonEntry[];
  crew: PersonEntry[];
} {
  const rank = (job: string | null) => {
    const index = job ? (SHOW_CREW_JOBS as readonly string[]).indexOf(job) : -1;
    return index === -1 ? SHOW_CREW_JOBS.length : index;
  };
  const episodes = (count: number) =>
    count > 0 ? `${count} episode${count === 1 ? "" : "s"}` : null;

  return {
    cast: uniqueById(
      [...show.credits.cast].sort(
        (a, b) => a.order - b.order || b.episodeCount - a.episodeCount,
      ),
    ).map((member) => ({
      id: member.id,
      name: member.name,
      profilePath: member.profilePath,
      subtitle:
        [member.character, episodes(member.episodeCount)]
          .filter(Boolean)
          .join(" · ") || "Cast",
    })),
    crew: uniqueById(
      show.credits.crew
        .filter((member) => member.job)
        .sort(
          (a, b) =>
            rank(a.job) - rank(b.job) || b.episodeCount - a.episodeCount,
        ),
    ).map((member) => ({
      id: member.id,
      name: member.name,
      profilePath: member.profilePath,
      subtitle: [member.job, episodes(member.episodeCount)]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

export const facts = (list: (Fact | false | null | "" | undefined)[]): Fact[] =>
  list.filter((fact): fact is Fact => Boolean(fact));

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function Stat({
  icon,
  index,
  tip,
  tone = "text-ink-muted",
  value,
}: {
  icon: string;
  index?: number;
  tip: string;
  tone?: string;
  value: string;
}): JSX.Element {
  return (
    <DetailPart index={index} name="stat">
      <Tooltip
        position="top"
        text={tip}
        triggerClassName="flex cursor-help items-center gap-1.5 type-control leading-5 font-medium text-ink-body tabular-nums"
      >
        <Icon className={tone} icon={icon} size={16} />
        {value}
      </Tooltip>
    </DetailPart>
  );
}

function NextEpisodeStat({ show }: { show: ShowDetails }): JSX.Element | null {
  const next = show.nextEpisode;
  if (!next) return null;
  const code = formatEpisodeCode(next.seasonNumber, next.episodeNumber);
  const days = daysUntil(next.airDate);
  const when =
    days === null
      ? (formatEpisodeDate(next.airDate) ?? "soon")
      : days === 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : days < 14
            ? `in ${days} days`
            : (formatEpisodeDate(next.airDate) ?? "soon");
  return (
    <Stat
      icon="solar:calendar-bold"
      tip={`Next: ${code}${next.name ? ` “${next.name}”` : ""}, ${formatEpisodeDate(next.airDate) ?? "date to be announced"}`}
      tone="text-grade"
      value={`${code} ${when}`}
    />
  );
}

const SHOW_TAG_LIMIT = 8;

const MAX_VISIBLE_CREATORS = 3;

// The dock already carries the years, the run and the network, the seasons
// have their own shelf and the keywords sit under the synopsis as chips.
function buildShowFacts(show: ShowDetails): Fact[] {
  const genres = show.genres.map((genre) => ({ text: genre.name }));
  const certification = getShowCertification(show);
  const status = showStatusText(show.status);
  return facts([
    show.creators.length > 0 &&
      namesFact(
        plural(show.creators.length, "Creator", "Creators"),
        MAX_VISIBLE_CREATORS,
        show.creators.map((person) => ({
          href: personHref(person.id),
          text: person.name,
        })),
      ),
    genres.length > 0 &&
      namesFact(plural(genres.length, "Genre", "Genres"), 3, genres),
    show.networks.length > 0 &&
      namesFact(
        plural(show.networks.length, "Network", "Networks"),
        MAX_VISIBLE_NETWORKS,
        show.networks.map((network) => ({ text: network.name })),
      ),
    show.runtimeMinutes
      ? textFact("Episode", `${show.runtimeMinutes} min`)
      : null,
    certification && textFact("Rated", certification),
    status && textFact("Status", status),
  ]);
}

function ShowHeader({
  show,
  stats,
}: {
  show: ShowDetails;
  stats: Awaited<ReturnType<typeof getFilmStats>>;
}): JSX.Element {
  const title = (
    <DetailBloom
      as="h1"
      className={movieTitleClass(show.title)}
      part="title"
      text={show.title}
    />
  );
  return (
    <>
      {title}
      <div className={`${RULE_GAP} relative flex w-full items-center gap-5`}>
        <DetailPart className="h-px flex-1 bg-grade/40" name="rule" />
        <div className="relative flex shrink-0 items-center gap-5">
          <NextEpisodeStat show={show} />
          {hasFilmStats(stats) ? <MovieStats stats={stats} /> : null}
        </div>
      </div>
      {show.tagline ? (
        <DetailText
          as="p"
          className={cn(TAGLINE_CLASS, "opacity-90")}
          part="tagline"
          text={show.tagline}
        />
      ) : null}
      {show.overview ? (
        <DetailText
          as="p"
          className={cn(
            PROSE_CLASS,
            "opacity-70",
            show.tagline && AFTER_TAGLINE,
          )}
          part="overview"
          text={show.overview}
        />
      ) : null}
      <DetailTags
        tags={show.keywords
          .slice(0, SHOW_TAG_LIMIT)
          .map((tag) => capitalizeWords(tag.name))}
      />
    </>
  );
}

function Recommendations({ show }: { show: ShowDetails }): JSX.Element | null {
  const items = getShowRecommendations(show);
  if (items.length === 0) return null;
  return (
    <DetailSection className="flex w-full flex-col" cue="row">
      <Heading icon="solar:stars-minimalistic-bold" title="More like this" />
      <Carousel
        arrowClassName={TONE.arrows}
        itemClassName={CAROUSEL_ITEM}
        label="More like this"
        part="slide"
      >
        {items.map((item) => (
          <MoviePosterLink
            key={item.id}
            mediaType="tv"
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

export function seasonShelf(show: ShowDetails, tracking: ShowTracking | null) {
  const { regular, specials } = splitSeasons(show.seasons);
  const seasons: SeasonSummary[] = specials ? [...regular, specials] : regular;
  const watchedBySeason: Record<number, number> = {};
  for (const key of tracking?.watched ?? []) {
    const season = Number(key.split(":")[0]);
    watchedBySeason[season] = (watchedBySeason[season] ?? 0) + 1;
  }
  return { regular, seasons, watchedBySeason };
}

function shelfProgress(
  show: ShowDetails,
  tracking: ShowTracking | null,
  regular: readonly SeasonSummary[],
): ShelfProgress | null {
  const progress = tracking?.progress;
  if (!progress) return null;
  const aired = progress.airedEpisodes ?? show.episodesCount;
  let next: ShelfProgress["next"] = null;
  if (progress.status === "watching" && progress.lastSeason !== null) {
    const season = regular.find((s) => s.seasonNumber === progress.lastSeason);
    const following = regular.find(
      (s) => s.seasonNumber > (progress.lastSeason ?? 0),
    );
    if (season && (progress.lastEpisode ?? 0) < season.episodeCount) {
      next = {
        episode: (progress.lastEpisode ?? 0) + 1,
        season: season.seasonNumber,
      };
    } else if (following && isAired(following.airDate)) {
      next = { episode: 1, season: following.seasonNumber };
    }
  }
  return { aired, next, watched: progress.watchedEpisodes };
}

export async function loadShow(id: number) {
  const details = getShowDetails(id);
  const [result, palette, stats, tracking] = await Promise.all([
    details,
    details.then((outcome) =>
      outcome.success
        ? getAmbientPalette(
            movieSwatch(outcome.data.backdropPath, outcome.data.posterPath),
          )
        : null,
    ),
    getFilmStats(id, "tv"),
    getShowTracking(id),
  ]);
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Show ${id} is unavailable (${result.error.kind})`);
  }
  void ensureCatalogEntry("tv", id).catch(() => null);
  return { palette, show: result.data, stats, tracking };
}

export async function ShowPageContent({
  id,
  reviews = null,
}: {
  id: number;
  reviews?: Extract<ShowPageKind, { kind: "reviews" }> | null;
}): Promise<JSX.Element> {
  const { palette, show, stats, tracking } = await loadShow(id);
  const page: ShowPageKind = reviews ?? { kind: "show" };
  const backdrop = tmdbImageUrl("backdrop", show.backdropPath, "original");
  const art = artworkOf(show);
  const { cast, crew } = toShowPersonEntries(show);
  const knownFor = getPeopleKnownFor(
    { cast, crew },
    { id: show.id, mediaType: "tv" },
  );
  const backdrops = getGalleryImages(show.images);
  // The opening's reel: text-free stills only, so no title fights the name.
  const frames = backdrops
    .filter((image) => !image.language)
    .map((image) => image.filePath);
  const posters = getPosterImages(show.images);
  // Sent once, shared by the gallery and its wall.
  const gallery = { backdrops: pathsOf(backdrops), posters: pathsOf(posters) };
  const { regular, seasons, watchedBySeason } = seasonShelf(show, tracking);
  const stills = await getSeasonStills(show.id, seasons, isAiring(show.status));
  const progress = shelfProgress(show, tracking, regular);

  if (page.kind === "reviews") {
    return (
      <MediaTypeProvider mediaType="tv">
        <MovieViewProvider>
          <ShowPageChrome palette={palette} reviews {...showChrome(show)} />
          <ReelProvider>
            <MovieStage>
              <DetailReviewsLayout
                backdrop={
                  backdrop ? (
                    <MovieBackdropHero frames={frames} movie={art} />
                  ) : null
                }
                className="movie-page"
                header={
                  <MediaReviewsHeader
                    href={tvHref(show.id)}
                    media={art}
                    poster={!page.reviewer}
                  />
                }
                intermission={<MovieProjection movie={art} />}
                main={
                  <MovieReviews
                    key={page.reviewer ?? ""}
                    initialSort={page.sort}
                    movieId={show.id}
                    reviewer={page.reviewer}
                    title={show.title}
                  />
                }
              />
            </MovieStage>
          </ReelProvider>
        </MovieViewProvider>
      </MediaTypeProvider>
    );
  }

  const awards = getShowAwards(show.id).then((outcome) =>
    outcome.success ? outcome.data : null,
  );

  return (
    <MediaTypeProvider mediaType="tv">
      <MovieViewProvider>
        <ShowPageChrome palette={palette} {...showChrome(show)} />
        <ReelProvider>
          <MovieStage>
            <DetailLayout
              after={
                <>
                  <MovieReviewDigest movieId={show.id} title={show.title} />
                  <Suspense fallback={null}>
                    <MoviePopularLists
                      lists={getMoviePopularLists(show.id, "tv")}
                    />
                  </Suspense>
                </>
              }
              backdrop={
                backdrop ? (
                  <MovieBackdropHero frames={frames} movie={art} />
                ) : null
              }
              className="movie-page"
              header={<ShowHeader show={show} stats={stats} />}
              intermission={<MovieProjection movie={art} />}
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
                        <SeasonShelf
                          backdropFallback={show.backdropPath}
                          now
                          progress={progress}
                          seasons={seasons}
                          showId={show.id}
                          stills={stills}
                          watchedBySeason={watchedBySeason}
                        />
                        <MoviePeople
                          cast={cast}
                          crew={crew}
                          knownFor={knownFor}
                        />
                        <MovieGallery
                          backdrops={gallery.backdrops}
                          posters={gallery.posters}
                          title={show.title}
                        />
                        <MovieVideos
                          types={getVideoTypes(show)}
                          videos={show.videos}
                        />
                        <Recommendations show={show} />
                      </>
                    ),
                  }}
                />
              }
              sidebar={
                <DetailSidebar facts={buildShowFacts(show)}>
                  <MoviePoster awards={awards} movie={art} />
                  <MovieCollectionActions mediaType="tv" movieId={show.id}>
                    <ShowStatusAction
                      index={3}
                      secondary
                      showId={show.id}
                      title={show.title}
                    />
                    <Suspense fallback={null}>
                      <MovieAwardsAction awards={awards} />
                    </Suspense>
                  </MovieCollectionActions>
                  <ShowResume
                    fallback={show.backdropPath}
                    progress={progress}
                    showId={show.id}
                    stills={stills}
                  />
                  <MovieSocialProof
                    index={5}
                    movieId={show.id}
                    title={show.title}
                  />
                </DetailSidebar>
              }
              wall={
                <MovieGalleryWall
                  backdrops={gallery.backdrops}
                  posters={gallery.posters}
                  title={show.title}
                />
              }
            />
          </MovieStage>
        </ReelProvider>
      </MovieViewProvider>
    </MediaTypeProvider>
  );
}
