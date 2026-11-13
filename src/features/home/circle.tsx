import type { JSX } from "react";
import { MoviePosterLink } from "@/features/movie/stage";
import { RatingStars } from "@/features/reviews/rating";
import { ProgressBar } from "@/features/tv/progress";
import type { ContinueItem } from "@/features/tv/types";
import { formatEpisodeCode, progressRatio } from "@/features/tv/utils";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { cn } from "@/design/ui";
import { RADIUS } from "@/design/foundations/geometry";
import { CAPTION_CLASS, POSTER_SIZES } from "./constants";
import { Shelf } from "./shared";
import type { Circle, FriendLog } from "./types";

function FriendCaption({ log }: { log: FriendLog }): JSX.Element {
  const marks = [
    log.liked && { icon: "solar:heart-bold", tone: "text-liked" },
    log.reviewed && { icon: "solar:document-text-bold", tone: "" },
    log.rewatch && { icon: "solar:restart-bold", tone: "" },
  ].filter((mark) => mark !== false);

  return (
    <span className={CAPTION_CLASS}>
      <Avatar
        className="shrink-0 rounded-full"
        name={log.author.displayName}
        size={18}
        src={log.author.avatarUrl ?? undefined}
      />
      <span className="min-w-0 truncate">
        {log.author.displayName.split(/\s+/)[0]}
      </span>
      {log.rating ? (
        <span className="flex shrink-0">
          <RatingStars rating={log.rating} size={10} />
        </span>
      ) : null}
      {marks.map((mark) => (
        <Icon
          className={cn("shrink-0", mark.tone)}
          icon={mark.icon}
          key={mark.icon}
          size={12}
        />
      ))}
    </span>
  );
}

function ContinueRow({ items }: { items: ContinueItem[] }): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <Shelf title="Continue watching">
      {items.map((item) => {
        const aired = item.airedEpisodes ?? 0;
        return (
          <MoviePosterLink
            caption={
              <span className={CAPTION_CLASS}>
                {item.lastSeason !== null && item.lastEpisode !== null
                  ? `Last ${formatEpisodeCode(item.lastSeason, item.lastEpisode)}`
                  : `${item.watchedEpisodes} episodes`}
              </span>
            }
            key={item.showId}
            mediaType="tv"
            movie={{
              id: item.showId,
              posterPath: item.posterPath,
              title: item.title,
              year: null,
            }}
            overlay={
              aired > 0 ? (
                <span className="pointer-events-none absolute inset-x-3 bottom-3">
                  <ProgressBar
                    ratio={progressRatio(item.watchedEpisodes, aired)}
                  />
                </span>
              ) : null
            }
            radius={RADIUS.card}
            sizes={POSTER_SIZES}
          />
        );
      })}
    </Shelf>
  );
}

export function HomeCircle({
  circle,
  continueWatching,
}: {
  circle: Circle;
  continueWatching: ContinueItem[];
}): JSX.Element {
  return (
    <>
      {circle.friends.length > 0 ? (
        <Shelf title="New from friends">
          {circle.friends.map((log) => (
            <MoviePosterLink
              caption={<FriendCaption log={log} />}
              detail={`logged by ${log.author.displayName}`}
              key={log.id}
              movie={log.film}
              radius={RADIUS.card}
              sizes={POSTER_SIZES}
            />
          ))}
        </Shelf>
      ) : null}
      <ContinueRow items={continueWatching} />
      {circle.picks ? (
        <Shelf title={`Because you liked ${circle.picks.because}`}>
          {circle.picks.films.map((film) => (
            <MoviePosterLink
              key={film.id}
              movie={film}
              radius={RADIUS.card}
              sizes={POSTER_SIZES}
            />
          ))}
        </Shelf>
      ) : null}
    </>
  );
}
