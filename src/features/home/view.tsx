import type { JSX, ReactNode } from "react";
import { MoviePosterLink } from "@/features/movie/stage";
import { PosterStack } from "@/features/profile/blocks";
import { RatingStars } from "@/features/reviews/rating";
import { AvatarStack } from "@/features/social/proof";
import { accountHref, listHref, movieHref, reviewHref } from "@/lib/project";
import { AccountLink } from "@/ui/button";
import { cn } from "@/ui/cn";
import { Avatar, Carousel, Icon } from "@/ui/media";
import {
  CAROUSEL_ITEM,
  CONTAINER_CLASS,
  PAGE_CLASS,
  RADIUS,
  TONE,
} from "@/ui/tokens";
import { HomeJoin, HomeMembers, HomePulse } from "./community";
import {
  CAPTION_CLASS,
  POSTER_SIZES,
  ROW_ITEM_CLASS,
  TEXT_LINK_CLASS,
} from "./constants";
import { HomeHero, HomeShowing } from "./hero";
import { Heading, HomePart, HomeSection, HomeStage } from "./motion";
import type {
  FriendLog,
  HomeFeed,
  HomeFilm,
  HomeList,
  HomeReview,
  Member,
  PopularFilm,
  RatedFilm,
  RisingFilm,
  SharedFilm,
} from "./types";
import { formatRelativeTime, formatCompact, toAvatarPeople } from "./utils";

function MemberLink({ member }: { member: Member }): JSX.Element {
  return (
    <AccountLink
      className="flex min-w-0 items-center gap-2 font-semibold text-ink-body hover:text-ink focus-visible:text-ink"
      href={accountHref(member.username)}
    >
      <Avatar
        className="shrink-0 rounded-full"
        name={member.displayName}
        size={20}
        src={member.avatarUrl ?? undefined}
      />
      <span className="truncate">{member.displayName}</span>
    </AccountLink>
  );
}

function ListCard({
  index,
  list,
}: {
  index: number;
  list: HomeList;
}): JSX.Element {
  const href = listHref(list.owner.username, list.slug);
  return (
    <HomePart
      as="li"
      className="flex min-w-0 flex-col gap-3"
      index={index}
      name="list"
    >
      <AccountLink
        aria-label={list.title}
        className="block ui-fade hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </AccountLink>
      <h3 className="min-w-0 truncate type-base font-semibold text-ink">
        <AccountLink className={TEXT_LINK_CLASS} href={href}>
          {list.title}
        </AccountLink>
      </h3>
      <div className="flex min-w-0 items-center gap-x-4 type-control text-ink-muted tabular-nums">
        <MemberLink member={list.owner} />
        <span className="shrink-0">{list.films} films</span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Icon icon="solar:heart-bold" size={13} />
          {formatCompact(list.likes)}
        </span>
      </div>
    </HomePart>
  );
}

function HomeLists({ lists }: { lists: HomeList[] }): JSX.Element | null {
  if (lists.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="lists">
      <Heading icon="solar:widget-bold" title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list, index) => (
          <ListCard index={index} key={list.id} list={list} />
        ))}
      </ul>
    </HomeSection>
  );
}

function ReviewCard({
  index,
  review,
}: {
  index: number;
  review: HomeReview;
}): JSX.Element {
  const { author, film } = review;
  return (
    <HomePart
      as="li"
      className="flex gap-4 py-6 sm:gap-5"
      index={index}
      name="review"
    >
      <div className="w-16 shrink-0 sm:w-20">
        <MoviePosterLink movie={film} radius={RADIUS.tile} sizes="80px" />
      </div>
      <article className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h3 className="flex min-w-0 items-baseline gap-2">
          <AccountLink
            className="truncate type-base font-semibold text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
            href={movieHref(film.id)}
          >
            {film.title}
          </AccountLink>
          {film.year ? (
            <span className="shrink-0 type-body text-ink-muted tabular-nums">
              {film.year}
            </span>
          ) : null}
        </h3>
        <div className="flex min-w-0 items-center gap-2.5 type-control">
          <MemberLink member={author} />
          {review.rating ? (
            <span className="flex shrink-0">
              <RatingStars rating={review.rating} size={12} />
            </span>
          ) : null}
          <time
            className="shrink-0 type-meta text-ink-muted"
            dateTime={review.createdAt}
          >
            {formatRelativeTime(review.createdAt)}
          </time>
        </div>
        <p className="line-clamp-4 type-copy leading-7 text-pretty text-ink-body">
          {review.content}
        </p>
        <div className="flex items-center gap-4 type-meta font-medium text-ink-muted tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <Icon icon="solar:heart-bold" size={13} />
            {formatCompact(review.likes)}{" "}
            {review.likes === 1 ? "like" : "likes"}
          </span>
          <AccountLink
            className="text-ink-body underline underline-offset-2 decoration-transparent hover:text-ink focus-visible:text-ink hover:decoration-current focus-visible:decoration-current"
            href={reviewHref(film.id, author.username)}
          >
            Read review
          </AccountLink>
        </div>
      </article>
    </HomePart>
  );
}

function HomeReviews({
  reviews,
}: {
  reviews: HomeReview[];
}): JSX.Element | null {
  if (reviews.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="reviews">
      <Heading
        icon="solar:chat-square-like-bold"
        title="Reviews worth reading"
      />
      <ul
        className={`-my-6 grid grid-cols-1 gap-x-12 divide-y ${TONE.rules} lg:grid-cols-2 lg:divide-y-0 lg:[&>li]:border-b lg:[&>li]:border-rule lg:[&>li:nth-last-child(-n+2)]:border-b-0`}
      >
        {reviews.map((review, index) => (
          <ReviewCard index={index} key={review.id} review={review} />
        ))}
      </ul>
    </HomeSection>
  );
}

function HomeRising({ films }: { films: RisingFilm[] }): JSX.Element | null {
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

function ShelfFrame({
  actions,
  children,
  icon,
  title,
  wide = true,
}: {
  actions?: ReactNode;
  children: ReactNode;
  icon: string;
  title: string;
  wide?: boolean;
}): JSX.Element {
  return (
    <HomeSection className="flex w-full flex-col" cue="row">
      <Heading actions={actions} icon={icon} title={title} />
      <Carousel
        arrowClassName={TONE.arrows}
        className="rounded-card"
        itemClassName={wide ? ROW_ITEM_CLASS : CAROUSEL_ITEM}
        label={title}
        part="slide"
      >
        {children}
      </Carousel>
    </HomeSection>
  );
}

function FilmRow<T extends HomeFilm>({
  caption,
  films,
  icon,
  title,
}: {
  caption?: (film: T) => ReactNode;
  films: T[];
  icon: string;
  title: string;
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <ShelfFrame icon={icon} title={title}>
      {films.map((film) => (
        <MoviePosterLink
          caption={caption?.(film)}
          key={film.id}
          movie={film}
          radius={RADIUS.card}
          sizes={POSTER_SIZES}
        />
      ))}
    </ShelfFrame>
  );
}

function PopularRow({ films }: { films: PopularFilm[] }): JSX.Element | null {
  return (
    <FilmRow
      caption={(film) => (
        <span className={CAPTION_CLASS}>
          <Icon icon="solar:eye-bold" size={13} />
          {formatCompact(film.members)}
          {film.rating ? (
            <>
              <Icon className="ml-1.5" icon="solar:star-bold" size={12} />
              {film.rating.toFixed(1)}
            </>
          ) : null}
        </span>
      )}
      films={films}
      icon="solar:fire-bold"
      title="Popular this week"
    />
  );
}

function FriendsRow({ logs }: { logs: FriendLog[] }): JSX.Element | null {
  if (logs.length === 0) return null;
  return (
    <ShelfFrame icon="solar:users-group-rounded-bold" title="New from friends">
      {logs.map((log) => (
        <MoviePosterLink
          caption={<FriendLogCaption log={log} />}
          detail={`logged by ${log.author.displayName}`}
          key={log.id}
          movie={log.film}
          radius={RADIUS.card}
          sizes={POSTER_SIZES}
        />
      ))}
    </ShelfFrame>
  );
}

function FriendLogCaption({ log }: { log: FriendLog }): JSX.Element {
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

function SharedRow({ films }: { films: SharedFilm[] }): JSX.Element | null {
  return (
    <FilmRow
      caption={(film) => (
        <span className={CAPTION_CLASS}>
          <AvatarStack people={toAvatarPeople(film.faces)} round size={18} />
          {film.friends} friends
        </span>
      )}
      films={films}
      icon="solar:eye-bold"
      title="Friends are watching"
    />
  );
}

function RatedRow({ films }: { films: RatedFilm[] }): JSX.Element | null {
  return (
    <FilmRow
      caption={(film) => (
        <span className={CAPTION_CLASS}>
          <Icon className="text-rated" icon="solar:star-bold" size={12} />
          <span className="text-ink-body">{film.rating.toFixed(2)}</span>
          <span className="hidden truncate sm:inline">
            · {formatCompact(film.ratings)} ratings
          </span>
        </span>
      )}
      films={films}
      icon="solar:cup-star-bold"
      title="Highest rated by members"
    />
  );
}

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;
  const firstName = circle?.name.split(/\s+/)[0] ?? null;

  return (
    <HomeStage backdrop={feed.features[0]?.backdropPath ?? null}>
      <main
        className={`home-page ui-scene overflow-x-clip ${PAGE_CLASS}`}
        data-cinematic=""
      >
        <h1 className="sr-only">Guffin</h1>
        <div className={CONTAINER_CLASS}>
          <HomeHero features={feed.features} />

          <div className="mt-16 flex w-full flex-col gap-16 sm:mt-20 sm:gap-20">
            <HomePulse
              greeting={firstName ? `Welcome back, ${firstName}` : null}
              pulse={feed.pulse}
            />
            {circle ? <FriendsRow logs={circle.friends} /> : null}
            <PopularRow films={feed.popular} />
            {circle ? <SharedRow films={circle.shared} /> : null}
            {circle?.picks ? (
              <FilmRow
                films={circle.picks.films}
                icon="solar:magic-stick-3-bold"
                title={`Because you liked ${circle.picks.because}`}
              />
            ) : null}
            <HomeReviews reviews={feed.reviews} />
            <HomeShowing soon={feed.soon} theatres={feed.theatres} />
            <HomeRising films={feed.rising} />
            <RatedRow films={feed.rated} />
            <HomeLists lists={feed.lists} />
            <HomeMembers
              members={feed.members}
              title={
                circle && circle.following > 0
                  ? "People you may know"
                  : "Reviewers to follow"
              }
            />
            <HomeJoin members={feed.pulse.members} />
          </div>
        </div>
      </main>
    </HomeStage>
  );
}
