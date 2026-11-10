import type { JSX, ReactNode } from "react";
import type { MediaType } from "@/features/media/types";
import { MoviePosterLink } from "@/features/movie/stage";
import { PosterStack } from "@/features/profile/blocks";
import { RatingStars } from "@/features/reviews/rating";
import { AvatarStack } from "@/features/social/proof";
import { ProgressBar } from "@/features/tv/progress";
import type { ContinueItem } from "@/features/tv/types";
import { formatEpisodeCode, progressRatio } from "@/features/tv/utils";
import { accountHref, listHref, movieHref, reviewHref } from "@/lib/project";
import { Avatar } from "@/design/components/avatar";
import { Carousel } from "@/design/components/carousel";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { cn } from "@/design/foundations/cn";
import { RADIUS } from "@/design/foundations/geometry";
import { CONTAINER_CLASS, PAGE_CLASS } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { HomeJoin, HomeMembers, HomePulse } from "./community";
import {
  CAPTION_CLASS,
  LEAD_REVIEW_LENGTH,
  POSTER_SIZES,
  RISING_AXIS_MIN,
  ROW_ITEM_CLASS,
  TEXT_LINK_CLASS,
} from "./constants";
import { HomeHero, HomeShowing } from "./hero";
import { HomeIndex } from "./index";
import { Heading, HomePart, HomeSection, HomeStage, HomeText } from "./motion";
import type {
  FriendLog,
  HomeFeed,
  HomeFilm,
  HomeList,
  HomeReview,
  Member,
  RatedFilm,
  RisingFilm,
  SharedFilm,
} from "./types";
import { formatRelativeTime, formatCompact, toAvatarPeople } from "./utils";

function MemberLink({ member }: { member: Member }): JSX.Element {
  return (
    <DockLink
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
    </DockLink>
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
      <DockLink
        aria-label={list.title}
        className="block ui-fade hover:opacity-80 focus-visible:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>
      <h3 className="min-w-0 truncate type-base font-semibold text-ink">
        <DockLink className={TEXT_LINK_CLASS} href={href}>
          {list.title}
        </DockLink>
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
      <Heading title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list, index) => (
          <ListCard index={index} key={list.id} list={list} />
        ))}
      </ul>
    </HomeSection>
  );
}

function ReviewByline({ review }: { review: HomeReview }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 type-control">
      <MemberLink member={review.author} />
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
  );
}

function FilmTitle({ film }: { film: HomeFilm }): JSX.Element {
  return (
    <h3 className="flex min-w-0 items-baseline gap-2">
      <DockLink
        className={`truncate type-base font-semibold text-ink ${TEXT_LINK_CLASS}`}
        href={movieHref(film.id)}
      >
        {film.title}
      </DockLink>
      {film.year ? (
        <span className="shrink-0 type-body text-ink-muted tabular-nums">
          {film.year}
        </span>
      ) : null}
    </h3>
  );
}

function LeadReview({ review }: { review: HomeReview }): JSX.Element {
  const { author, film } = review;
  return (
    <article className="grid grid-cols-1 gap-x-12 gap-y-8 border-b border-rule pb-12 lg:grid-cols-[11rem_minmax(0,1fr)] sm:pb-16">
      <HomePart className="flex w-28 flex-col gap-3 lg:w-full" name="cover">
        <MoviePosterLink movie={film} radius={RADIUS.card} sizes="176px" />
      </HomePart>
      <div className="flex min-w-0 flex-col gap-6">
        <HomePart className="block h-8" name="quote">
          <span
            aria-hidden="true"
            className="block h-8 font-zuume type-display-xl leading-crop font-bold text-ink-faint select-none"
          >
            “
          </span>
        </HomePart>
        <HomePart className="min-w-0" name="quote">
          <FilmTitle film={film} />
        </HomePart>
        <blockquote className="max-w-[40ch] type-heading font-medium text-pretty text-ink sm:max-w-[48ch]">
          <HomeText
            as="p"
            by="word"
            className="line-clamp-8 sm:line-clamp-6"
            part="lead"
            text={review.content}
          />
        </blockquote>
        <HomePart
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          name="byline"
        >
          <ReviewByline review={review} />
          <span className="inline-flex items-center gap-1.5 type-meta font-medium text-ink-muted tabular-nums">
            <Icon icon="solar:heart-bold" size={13} />
            {formatCompact(review.likes)}
          </span>
          <DockLink
            className={`type-meta font-medium text-ink-body hover:text-ink focus-visible:text-ink ${TEXT_LINK_CLASS}`}
            href={reviewHref(film.id, author.username)}
          >
            Read review
          </DockLink>
        </HomePart>
      </div>
    </article>
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
      className="flex min-w-0 flex-col gap-4"
      index={index}
      name="review"
    >
      <article className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 shrink-0">
            <MoviePosterLink movie={film} radius={RADIUS.thumb} sizes="40px" />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <DockLink
              className={`truncate type-copy font-semibold text-ink ${TEXT_LINK_CLASS}`}
              href={movieHref(film.id)}
            >
              {film.title}
            </DockLink>
            <span className="flex items-center gap-2">
              {review.rating ? (
                <RatingStars rating={review.rating} size={11} />
              ) : null}
              <time
                className="type-meta text-ink-muted"
                dateTime={review.createdAt}
              >
                {formatRelativeTime(review.createdAt)}
              </time>
            </span>
          </div>
        </div>
        <p className="line-clamp-5 type-copy text-pretty text-ink-body">
          {review.content}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 type-meta">
          <MemberLink member={author} />
          <DockLink
            className={`shrink-0 font-medium text-ink-muted hover:text-ink focus-visible:text-ink ${TEXT_LINK_CLASS}`}
            href={reviewHref(film.id, author.username)}
          >
            Read
          </DockLink>
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
  const lead =
    reviews.find((review) => review.content.length <= LEAD_REVIEW_LENGTH) ??
    reviews[0]!;
  const rest = reviews.filter((review) => review !== lead).slice(0, 4);
  return (
    <HomeSection className="flex w-full flex-col" cue="reviews">
      <Heading title="Reviews worth reading" />
      <LeadReview review={lead} />
      {rest.length > 0 ? (
        <ul className="grid grid-cols-1 gap-x-10 gap-y-12 pt-12 sm:grid-cols-2 sm:pt-16 lg:grid-cols-4">
          {rest.map((review, index) => (
            <ReviewCard index={index} key={review.id} review={review} />
          ))}
        </ul>
      ) : null}
    </HomeSection>
  );
}

/**
 * Rising films, measured: each bar is this week's members against the film's
 * usual week, on one axis, with a tick where a usual week sits.
 */
function HomeRising({ films }: { films: RisingFilm[] }): JSX.Element | null {
  if (films.length === 0) return null;
  const axis = Math.max(RISING_AXIS_MIN, ...films.map((film) => film.lift));
  const usual = (1 / axis) * 100;
  return (
    <HomeSection className="flex w-full flex-col" cue="rising">
      <Heading title="Rising on Guffin" />
      <ol
        className={`flex flex-col divide-y ${TONE.rules} border-y border-rule`}
      >
        {films.map((film, index) => {
          const lifted = film.lift >= 1;
          return (
            <HomePart
              as="li"
              className="grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-4 sm:grid-cols-[2.5rem_2.75rem_15rem_minmax(0,1fr)_4.5rem] sm:gap-x-6"
              index={index}
              key={film.id}
              name="row"
            >
              <span className="font-zuume text-right type-heading leading-none font-bold text-ink-faint tabular-nums sm:type-display-xs">
                {index + 1}
              </span>
              <MoviePosterLink
                movie={film}
                radius={RADIUS.thumb}
                sizes="44px"
              />
              <div className="flex min-w-0 flex-col gap-1 sm:col-start-3 sm:row-start-1">
                <DockLink
                  className={`truncate type-copy font-semibold text-ink ${TEXT_LINK_CLASS}`}
                  href={movieHref(film.id)}
                >
                  {film.title}
                </DockLink>
                <span className="truncate type-meta text-ink-muted tabular-nums">
                  {[film.year, `${film.week} members this week`]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <span
                className={cn(
                  "text-right font-zuume type-display-xs leading-none font-bold tabular-nums sm:col-start-5 sm:row-start-1",
                  lifted ? "text-ink" : "text-ink-muted",
                )}
                title="Members this week against its usual week"
              >
                {film.lift.toFixed(1)}×
              </span>
              <HomePart
                className="relative col-span-4 col-start-1 h-5 sm:col-span-1 sm:col-start-4 sm:row-start-1"
                name="bar"
              >
                <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-mark bg-line" />
                <span
                  className={cn(
                    "absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-mark",
                    index === 0 ? "bg-ink" : "bg-ink-body",
                  )}
                  style={{ width: `${Math.min(film.lift / axis, 1) * 100}%` }}
                />
                <span
                  className="absolute inset-y-0 w-px bg-ink-muted"
                  style={{ left: `${usual}%` }}
                />
              </HomePart>
            </HomePart>
          );
        })}
      </ol>
      <HomePart as="p" className="mt-4 type-meta text-ink-muted" name="note">
        The tick marks a film’s usual week.
      </HomePart>
    </HomeSection>
  );
}

function ShelfFrame({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <HomeSection className="flex w-full flex-col" cue="row">
      <Heading title={title} />
      <Carousel
        arrowClassName={TONE.arrows}
        itemClassName={ROW_ITEM_CLASS}
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
  mediaType = "movie",
  overlay,
  title,
}: {
  caption?: (film: T) => ReactNode;
  films: T[];
  mediaType?: MediaType;
  overlay?: (film: T) => ReactNode;
  title: string;
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <ShelfFrame title={title}>
      {films.map((film) => (
        <MoviePosterLink
          caption={caption?.(film)}
          key={film.id}
          mediaType={mediaType}
          movie={film}
          overlay={overlay?.(film)}
          radius={RADIUS.card}
          sizes={POSTER_SIZES}
        />
      ))}
    </ShelfFrame>
  );
}

function FriendsRow({ logs }: { logs: FriendLog[] }): JSX.Element | null {
  if (logs.length === 0) return null;
  return (
    <ShelfFrame title="New from friends">
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
      title="Friends are watching"
    />
  );
}

/** The score a film holds, printed over the foot of its poster. */
function RatedRow({ films }: { films: RatedFilm[] }): JSX.Element | null {
  return (
    <FilmRow
      caption={(film) => (
        <span className={CAPTION_CLASS}>
          {formatCompact(film.ratings)} ratings
        </span>
      )}

      films={films}
      overlay={(film) => (
        <span className="on-photo pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-1.5 bg-linear-to-t from-page/80 to-transparent px-3.5 pt-14 pb-3">
          <span className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums">
            {film.rating.toFixed(2)}
          </span>
          <Icon className="mb-1 text-rated" icon="solar:star-bold" size={13} />
        </span>
      )}
      title="Highest rated by members"
    />
  );
}

function ContinueRow({ items }: { items: ContinueItem[] }): JSX.Element | null {
  if (items.length === 0) return null;
  return (
    <ShelfFrame title="Continue watching">
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
    </ShelfFrame>
  );
}

export function HomeView({ feed }: { feed: HomeFeed }): JSX.Element {
  const { circle } = feed;
  const firstName = circle?.name.split(/\s+/)[0] ?? null;

  return (
    <HomeStage backdrop={feed.features[0]?.backdropPath ?? null}>
      <main
        id="main"
        className={`home-page ui-scene overflow-x-clip ${PAGE_CLASS}`}
        data-cinematic=""
      >
        <h1 className="sr-only">Guffin</h1>
        <div className={CONTAINER_CLASS}>
          <HomeHero features={feed.features} />

          <div className="mt-20 flex w-full flex-col gap-24 sm:mt-28 sm:gap-32">
            <HomePulse
              greeting={firstName ? `Welcome back, ${firstName}` : null}
              pulse={feed.pulse}
            />
            {circle ? <FriendsRow logs={circle.friends} /> : null}
            {feed.shows ? (
              <ContinueRow items={feed.shows.continueWatching} />
            ) : null}
            <HomeIndex films={feed.popular} />
            {circle ? <SharedRow films={circle.shared} /> : null}
            {circle?.picks ? (
              <FilmRow
                films={circle.picks.films}
                title={`Because you liked ${circle.picks.because}`}
              />
            ) : null}
            <HomeReviews reviews={feed.reviews} />
            <HomeShowing soon={feed.soon} theatres={feed.theatres} />
            {feed.shows ? (
              <>
                <FilmRow
                  films={feed.shows.trending}
                  mediaType="tv"
                  title="Shows everyone’s watching"
                />
                <FilmRow
                  films={feed.shows.onTheAir}
                  mediaType="tv"
                  title="New episodes this week"
                />
              </>
            ) : null}
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
