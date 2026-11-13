import "server-only";

import type { JSX } from "react";
import { notFound } from "next/navigation";
import { DockLink } from "@/design/components/link";
import { PROSE_CLASS, RULE_GAP } from "@/design/foundations/layout";
import { cn } from "@/design/ui";
import { ArtworkPrint } from "@/features/artwork/artwork";
import { isAiring } from "@/features/catalog/quality";
import type { Fact } from "@/features/detail/detail";
import {
  DetailLayout,
  DetailSidebar,
  namesFact,
  textFact,
} from "@/features/detail/layout";
import { DetailBloom, DetailPart, DetailText } from "@/features/detail/motion";
import {
  DetailBackdrop,
  DetailIntermission,
  DetailViews,
} from "@/features/detail/stage";
import { MediaTypeProvider } from "@/features/media/media-type";
import {
  AFTER_TAGLINE,
  movieTitleClass,
  readableUrl,
  TAGLINE_CLASS,
} from "@/features/movie/movie";
import { MovieStage } from "@/features/movie/stage";
import { MovieViewProvider, ReelProvider } from "@/features/movie/views";
import { tvHref } from "@/lib/project";
import { getSeasonDetails } from "@/lib/tmdb/server";
import {
  type SeasonDetails,
  type ShowDetails,
  tmdbImageUrl,
} from "@/lib/tmdb/shared";
import {
  EpisodeList,
  SeasonTrackerProvider,
  SeasonWatchAction,
  SeasonWatchedStat,
} from "./episodes";
import { SeasonShelf } from "./seasons";
import { getSeasonStills } from "./server";
import { formatEpisodeDate } from "./show";
import { ShowPageChrome } from "./stage";
import { ShowStatusAction } from "./status";
import { facts, formatRuntime, loadShow, seasonShelf, Stat } from "./view";

function seasonPicture(season: SeasonDetails, show: ShowDetails) {
  const still =
    season.episodes.find((episode) => episode.stillPath)?.stillPath ?? null;
  return tmdbImageUrl("backdrop", still ?? show.backdropPath, "original");
}

function seasonFacts(
  season: SeasonDetails,
  show: ShowDetails,
  runtime: number,
): Fact[] {
  const first = season.episodes[0]?.airDate ?? season.airDate;
  const last = season.episodes.at(-1)?.airDate ?? null;
  const span = [formatEpisodeDate(first), formatEpisodeDate(last)]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(" – ");
  const next = show.nextEpisode;
  return facts([
    namesFact("Show", 1, [{ href: tvHref(show.id), text: show.title }]),
    span && textFact("Aired", span),
    textFact("Episodes", String(season.episodes.length)),
    runtime > 0 && textFact("Runtime", formatRuntime(runtime)),
    next?.seasonNumber === season.seasonNumber &&
      textFact(
        "Next",
        `E${next.episodeNumber} · ${formatEpisodeDate(next.airDate) ?? "TBA"}`,
      ),
    show.networks[0] && textFact("Network", show.networks[0].name),
  ]);
}

function SeasonHeader({
  name,
  runtime,
  season,
  show,
  total,
}: {
  name: string;
  runtime: number;
  season: SeasonDetails;
  show: ShowDetails;
  total: number;
}): JSX.Element {
  const position =
    season.seasonNumber > 0
      ? `Season ${season.seasonNumber} of ${total}`
      : "Specials";
  return (
    <>
      <DetailBloom
        as="h1"
        className={movieTitleClass(name)}
        part="title"
        text={name}
      />
      <div className={`${RULE_GAP} relative flex w-full items-center gap-5`}>
        <DetailPart className="h-px flex-1 bg-grade/40" name="rule" />
        <div className="relative flex shrink-0 items-center gap-5">
          <Stat
            icon="solar:play-stream-bold"
            tip={`${season.episodes.length} episodes`}
            value={String(season.episodes.length)}
          />
          {runtime > 0 ? (
            <Stat
              icon="solar:clock-circle-bold"
              tip="Running time of the whole season"
              value={formatRuntime(runtime)}
            />
          ) : null}
          {season.voteAverage > 0 ? (
            <Stat
              icon="solar:star-bold"
              tip="TMDB rating of the season"
              tone="text-rated"
              value={season.voteAverage.toFixed(1)}
            />
          ) : null}
          <SeasonWatchedStat />
        </div>
      </div>
      <DetailPart className={TAGLINE_CLASS} name="tagline">
        <DockLink
          className="text-ink-lead underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:decoration-current"
          href={tvHref(show.id)}
        >
          {show.title}
        </DockLink>
        <span className="text-ink-muted"> · {position}</span>
      </DetailPart>
      {season.overview ? (
        <DetailText
          as="p"
          className={cn(PROSE_CLASS, "opacity-70", AFTER_TAGLINE)}
          part="overview"
          text={season.overview}
        />
      ) : null}
    </>
  );
}

export async function SeasonPageContent({
  id,
  season: seasonNumber,
}: {
  id: number;
  season: number;
}): Promise<JSX.Element> {
  const { palette, show, tracking } = await loadShow(id);
  if (!show.seasons.some((s) => s.seasonNumber === seasonNumber)) notFound();
  const result = await getSeasonDetails(
    id,
    seasonNumber,
    isAiring(show.status),
  );
  if (!result.success) {
    if (result.error.kind === "not_found") notFound();
    throw new Error(`Season ${seasonNumber} of ${id} is unavailable`);
  }
  const season = result.data;
  const name = season.name ?? `Season ${seasonNumber}`;
  const runtime = season.episodes.reduce(
    (sum, episode) => sum + (episode.runtimeMinutes ?? 0),
    0,
  );
  const { regular, seasons, watchedBySeason } = seasonShelf(show, tracking);
  const stills = await getSeasonStills(show.id, seasons, isAiring(show.status));
  const picture = seasonPicture(season, show);
  const posterPath = season.posterPath ?? show.posterPath;
  const prefix = `${seasonNumber}:`;

  return (
    <MediaTypeProvider mediaType="tv">
      <MovieViewProvider>
        <ShowPageChrome palette={palette} show={show} />
        <ReelProvider>
          <MovieStage movie={show}>
            <SeasonTrackerProvider
              initialRatings={tracking?.ratings ?? []}
              initialWatched={(tracking?.watched ?? []).filter((key) =>
                key.startsWith(prefix),
              )}
              season={season}
              showId={show.id}
            >
              <DetailLayout
                backdrop={
                  picture ? <DetailBackdrop src={picture} title={name} /> : null
                }
                className="movie-page"
                header={
                  <SeasonHeader
                    name={name}
                    runtime={runtime}
                    season={season}
                    show={show}
                    total={regular.length}
                  />
                }
                intermission={
                  <DetailIntermission
                    image={readableUrl(picture)}
                    title={`${show.title} · ${name}`}
                  />
                }
                main={
                  <DetailViews
                    shown="overview"
                    views={{
                      overview: (
                        <>
                          <EpisodeList />
                          <SeasonShelf
                            backdropFallback={show.backdropPath}
                            current={seasonNumber}
                            seasons={seasons}
                            showId={show.id}
                            stills={stills}
                            title="All seasons"
                            watchedBySeason={watchedBySeason}
                          />
                        </>
                      ),
                    }}
                  />
                }
                sidebar={
                  <DetailSidebar facts={seasonFacts(season, show, runtime)}>
                    <ArtworkPrint
                      alt={`${name} poster`}
                      className="@container w-full shrink-0"
                      fallbackIcon="solar:tv-bold"
                      frameClassName="h-[round(150cqw,1px)]"
                      part="poster"
                      path={posterPath}
                      src={tmdbImageUrl("poster", posterPath, "w780")}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <SeasonWatchAction />
                      <ShowStatusAction showId={show.id} title={show.title} />
                    </div>
                  </DetailSidebar>
                }
                wall={null}
              />
            </SeasonTrackerProvider>
          </MovieStage>
        </ReelProvider>
      </MovieViewProvider>
    </MediaTypeProvider>
  );
}
