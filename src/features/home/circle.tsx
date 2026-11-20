import type { JSX } from "react";
import { Avatar } from "@omerdlw/base-framework/ui";
import { Icon } from "@/design/components/icon";
import { RADIUS } from "@/design/foundations/geometry";
import { cn } from "@/design/ui";
import { MoviePosterLink } from "@/features/movie/stage";
import { RatingStars } from "@/features/reviews/rating";
import { REVIEW_ICON } from "@/features/reviews/review";
import {
  CAPTION_CLASS,
  type Circle,
  type FriendLog,
  POSTER_SIZES,
} from "./feed";
import { Shelf } from "./shelf";

function FriendCaption({ log }: { log: FriendLog }): JSX.Element {
  const marks = [
    log.liked && { icon: "solar:heart-bold", tone: "text-liked" },
    log.reviewed && { icon: REVIEW_ICON, tone: "" },
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

export function HomeCircle({ circle }: { circle: Circle }): JSX.Element {
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
