"use client";

import {
  type JSX,
  type ReactNode,
  useState,
  useTransition,
} from "react";
import { Avatar, Button, Image } from "@omerdlw/base-framework/ui";
import { globalEvents } from "@omerdlw/base-framework/events";
import { useToast } from "@omerdlw/base-framework/notification";
import { Carousel } from "@/design/components/carousel";
import { DockLink } from "@/design/components/link";
import { Icon } from "@/design/components/icon";
import { Logo } from "@/design/components/logo";
import { SegmentedControl } from "@/design/components/segmented-control";
import { RADIUS } from "@/design/foundations/geometry";
import { HEADLINE_BOX } from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { SOCIAL_EVENTS } from "@/features/account/account";
import { useAuth } from "@/features/auth/provider";
import { useOpenSignIn } from "@/features/auth/sign-in";
import { PosterStack } from "@/features/lists/poster-stack";
import { MoviePosterLink } from "@/features/movie/stage";
import { RatingStars } from "@/features/reviews/rating";
import { REVIEW_ICON } from "@/features/reviews/review";
import { ReviewCard, ReviewMeta, REVIEW_ROW } from "@/features/reviews/card";
import { AvatarStack } from "@/features/social/proof";
import {
  followUserAction,
  unfollowUserAction,
} from "@/features/social/actions";
import { accountHref, listHref, movieHref, reviewHref } from "@/shared/project";
import { tmdbImageUrl } from "@/infrastructure/tmdb/shared";
import {
  CANON_LIMIT,
  CAPTION_CLASS,
  CRAFT,
  type Circle,
  type FriendLog,
  type HomeFilm,
  type HomeList,
  type HomeMember,
  type HomeReview,
  LIST_LIMIT,
  type Member,
  POPULAR_LIMIT,
  POSTER_SIZES,
  type PopularFilm,
  type RatedFilm,
  type RecentLog,
  ROW_ITEM_CLASS,
  type ShowingFilm,
  TEXT_LINK_CLASS,
} from "./feed";
import { formatCompact, formatReleaseDay, formatRelativeTime, formatWhole } from "./format";
import { Heading, HomePart, HomeSection, HomeSwap, HomeText } from "./motion";

// --- Shared Shelf & Links ---

export function MemberLink({
  className,
  member,
  size = 20,
}: {
  className?: string;
  member: Member;
  size?: number;
}): JSX.Element {
  return (
    <DockLink
      className={cn(
        "flex min-w-0 items-center gap-2 font-semibold text-ink-body hover:text-ink",
        className,
      )}
      href={accountHref(member.username)}
    >
      <Avatar
        className="shrink-0 rounded-full"
        name={member.displayName}
        size={size}
        src={member.avatarUrl ?? undefined}
      />
      <span className="truncate">{member.displayName}</span>
    </DockLink>
  );
}

export function FilmTitle({
  as: Tag = "h3",
  className,
  film,
}: {
  as?: "h3" | "p";
  className?: string;
  film: HomeFilm;
}): JSX.Element {
  return (
    <Tag className={cn("flex min-w-0 items-baseline gap-2", className)}>
      <DockLink
        className={`truncate font-semibold text-ink ${TEXT_LINK_CLASS}`}
        href={movieHref(film.id)}
      >
        {film.title}
      </DockLink>
      {film.year ? (
        <span className="shrink-0 text-ink-muted tabular-nums">
          {film.year}
        </span>
      ) : null}
    </Tag>
  );
}

export function Shelf({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <HomeSection className="flex w-full flex-col" cue="row">
      <Heading actions={actions} title={title} />
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

export function GuestOnly({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return auth.isAuthenticated ? null : children;
}

// --- HomeCraft ---

export function HomeCraft(): JSX.Element {
  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="craft">
        <Heading title="What you can do here" />
        <ol className="grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {CRAFT.map((item, index) => (
            <HomePart
              as="li"
              className="flex min-w-0 flex-col gap-4 border-t border-rule py-8"
              index={index}
              key={item.verb}
              name="verb"
            >
              <div className="flex items-center justify-between gap-4">
                <span className={`${TONE.label} text-ink-faint tabular-nums`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon className="text-ink-muted" icon={item.icon} size={18} />
              </div>
              <h3 className="font-zuume type-display-sm leading-none font-bold text-ink uppercase">
                {item.verb}
              </h3>
              <p className="max-w-[36ch] type-copy text-pretty text-ink-body">
                {item.text}
              </p>
            </HomePart>
          ))}
        </ol>
      </HomeSection>
    </GuestOnly>
  );
}

// --- HomeJoin ---

export function HomeJoin({ members }: { members: number }): JSX.Element {
  const openSignIn = useOpenSignIn();

  return (
    <GuestOnly>
      <HomeSection className="flex w-full flex-col" cue="join">
        <HomePart className="h-px w-full bg-line" name="rule" />
        <HomePart
          className="grid grid-cols-1 items-end gap-x-16 gap-y-8 pt-14 sm:pt-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          name="close"
        >
          <div className="flex flex-col gap-6">
            <HomeText
              as="p"
              className={`${TONE.label} text-ink-muted`}
              part="tag"
              text="Roll credits"
            />
            <HomeText
              as="h2"
              className={`${HEADLINE_BOX} font-zuume type-display-lg leading-none font-bold text-balance text-ink uppercase sm:type-display-xl lg:type-display-2xl`}
              part="finale"
              text="Start your diary tonight"
            />
          </div>
          <div className="flex flex-col items-start gap-6">
            <HomeText
              as="p"
              className="max-w-[40ch] type-base leading-7 text-pretty text-ink-body"
              part="pitch"
              text={`${
                members > 0
                  ? `Join ${formatWhole(members)} members who keep track of what they watch.`
                  : "Keep track of what you watch."
              } It’s free, and your first film takes a minute to log.`}
            />
            <HomePart name="cta">
              <Button
                intent="primary"
                onClick={openSignIn}
                shape="pill"
                size="lg"
              >
                Create your account
              </Button>
            </HomePart>
          </div>
        </HomePart>
      </HomeSection>
    </GuestOnly>
  );
}

// --- HomePitch ---

// The pitch's art: a wall of whole posters in staggered columns, cut by the
// panel's edges and faded into it at the top and bottom.
const WALL_COLUMNS = 4;
const WALL_LIMIT = WALL_COLUMNS * 3;
const WALL_FADE =
  "[mask-image:linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent)]";
const WALL_COLUMN_CLASS =
  "flex min-w-0 flex-col gap-3 self-center even:-translate-y-[9%] odd:translate-y-[9%]";

export function HomePitch({
  films,
  members,
}: {
  films: HomeFilm[];
  members: number;
}): JSX.Element | null {
  const openSignIn = useOpenSignIn();
  const posters = films.filter((film) => film.posterPath).slice(0, WALL_LIMIT);
  const columns = Array.from({ length: WALL_COLUMNS }, (_, column) =>
    posters.filter((_, index) => index % WALL_COLUMNS === column),
  );
  if (posters.length < 3) return null;

  return (
    <GuestOnly>
      <HomeSection
        className="grid w-full grid-cols-1 overflow-hidden rounded-shell border border-rule bg-plate lg:min-h-[30rem] lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]"
        cue="pitch"
      >
        <div className="flex flex-col justify-center gap-6 p-8 sm:p-10">
          <HomePart className="text-ink" name="mark">
            <Logo size={44} />
          </HomePart>
          <HomeText
            as="p"
            className={`${TONE.label} text-ink-muted`}
            part="tag"
            text="The film diary"
          />
          <h2 className="text-balance text-ink">
            <HomeText
              as="span"
              className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold uppercase sm:type-display-lg`}
              part="finale"
              text="Every film you’ve seen."
            />
            <HomeText
              as="span"
              className={`${HEADLINE_BOX} block font-zuume type-display-md leading-none font-bold text-ink-muted uppercase sm:type-display-lg`}
              index={1}
              part="finale"
              text="Every one you’re about to."
            />
          </h2>
          <HomeText
            as="p"
            className="max-w-[40ch] type-copy text-pretty text-ink-body"
            part="pitch"
            text={`Log what you watch, rate it, write about it and keep lists worth sharing.${
              members > 0 ? ` ${formatWhole(members)} members already do.` : ""
            }`}
          />
          <HomePart className="flex" name="cta">
            <Button
              intent="primary"
              onClick={openSignIn}
              shape="pill"
              size="lg"
            >
              Start your diary
              <span className="font-normal opacity-70">· it’s free</span>
            </Button>
          </HomePart>
        </div>

        <div
          className={cn(
            WALL_FADE,
            "relative h-80 min-w-0 overflow-hidden sm:h-96 lg:h-auto",
          )}
        >
          <div className="absolute inset-0 grid grid-cols-4 gap-3 px-3 lg:pl-0">
            {columns.map((column, columnIndex) => (
              <ul className={WALL_COLUMN_CLASS} key={columnIndex}>
                {column.map((film) => (
                  <HomePart
                    as="li"
                    className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-tile bg-plate"
                    index={posters.indexOf(film)}
                    key={film.id}
                    name="slice"
                  >
                    <DockLink
                      aria-label={film.title}
                      className="absolute inset-0 block"
                      data-slot="frame"
                      href={movieHref(film.id)}
                    >
                      <img
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                        decoding="async"
                        loading="lazy"
                        src={tmdbImageUrl("poster", film.posterPath, "w342")!}
                      />
                    </DockLink>
                  </HomePart>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </HomeSection>
    </GuestOnly>
  );
}

// --- HomeCircle ---

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

// --- HomeLogged ---

function Entry({ log }: { log: RecentLog }): JSX.Element {
  return (
    <li className="w-28 shrink-0 sm:w-32 lg:w-36">
      <MoviePosterLink
        caption={
          <span className={CAPTION_CLASS}>
            <Avatar
              className="shrink-0 rounded-full"
              name={log.author.displayName}
              size={16}
              src={log.author.avatarUrl ?? undefined}
            />
            <span className="min-w-0 truncate">
              {log.author.displayName.split(/\s+/)[0]}
            </span>
            <time className="ml-auto shrink-0" dateTime={log.watchedAt}>
              {formatRelativeTime(log.watchedAt)}
            </time>
          </span>
        }
        detail={`logged by ${log.author.displayName}`}
        movie={log.film}
        radius={RADIUS.card}
        sizes="144px"
      />
    </li>
  );
}

function Live(): JSX.Element {
  return (
    <HomePart
      as="span"
      className={`${TONE.label} inline-flex items-center gap-2 text-ink-muted`}
      name="live"
    >
      <span aria-hidden="true" className="relative flex size-2">
        <span className="absolute inset-0 rounded-full bg-watched opacity-60 motion-reduce:hidden" />
        <span className="relative size-2 rounded-full bg-watched" />
      </span>
      Live
    </HomePart>
  );
}

export function HomeLogged({
  logs,
}: {
  logs: RecentLog[];
}): JSX.Element | null {
  if (logs.length === 0) return null;

  return (
    <HomeSection className="flex w-full flex-col" cue="logged">
      <Heading actions={<Live />} title="Just logged" />
      <HomePart className="mx-[calc(50%-50vw)]" name="poster">
        <ul className="scrollbar-none flex gap-3 overflow-x-auto px-3 sm:gap-4 sm:px-4">
          {logs.map((log) => (
            <Entry key={log.id} log={log} />
          ))}
        </ul>
      </HomePart>
    </HomeSection>
  );
}

// --- HomeShowing ---

type FilmShelf = "theatres" | "soon";

function Ticket({
  film,
  shelf,
}: {
  film: ShowingFilm;
  shelf: FilmShelf;
}): JSX.Element {
  const date = film.releaseDate ? formatReleaseDay(film.releaseDate) : null;
  const waiting = film.waiting > 0 ? formatCompact(film.waiting) : null;
  const big = date ?? waiting ?? "Now";
  const small =
    shelf === "theatres"
      ? "In theatres"
      : waiting
        ? `${waiting} want to see`
        : "Release day";

  return (
    <span className="mt-1 flex min-w-0 flex-col gap-1.5 border-t border-dashed border-line pt-3">
      <span className="font-zuume truncate type-display-xs leading-none font-bold text-ink uppercase tabular-nums">
        {big}
      </span>
      <span className="truncate type-meta font-medium text-ink-muted">
        {small}
      </span>
    </span>
  );
}

export function HomeShowing({
  soon,
  theatres,
}: {
  soon: ShowingFilm[];
  theatres: ShowingFilm[];
}): JSX.Element | null {
  const [shelf, setShelf] = useState<FilmShelf>(
    theatres.length > 0 ? "theatres" : "soon",
  );
  if (theatres.length + soon.length === 0) return null;

  const shelves = [
    { films: theatres, key: "theatres" as const, label: "In theatres" },
    { films: soon, key: "soon" as const, label: "Coming soon" },
  ].filter((entry) => entry.films.length > 0);
  const current = shelves.find((entry) => entry.key === shelf) ?? shelves[0];

  return (
    <HomeSection className="flex w-full flex-col" cue="shelf">
      <Heading
        actions={
          shelves.length > 1 ? (
            <SegmentedControl
              ariaLabel="Showing"
              items={shelves}
              onChange={setShelf}
              value={current.key}
            />
          ) : null
        }
        title="At the cinema"
      />
      <HomeSwap cue="slides" id={current.key}>
        <Carousel
          arrowClassName={TONE.arrows}
          itemClassName={ROW_ITEM_CLASS}
          label={current.label}
          part="slide"
        >
          {current.films.map((film) => (
            <MoviePosterLink
              caption={<Ticket film={film} shelf={current.key} />}
              key={film.id}
              movie={film}
              radius={RADIUS.card}
              sizes={POSTER_SIZES}
            />
          ))}
        </Carousel>
      </HomeSwap>
    </HomeSection>
  );
}

// --- HomePopular & HomeCanon ---

const toAvatarPeople = (members: Member[]) =>
  members.map((member) => ({ ...member, id: member.username }));

export function HomePopular({
  films,
}: {
  films: PopularFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="popular">
      <Heading title="Popular with members" />
      <ul className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-4 lg:grid-cols-6">
        {films.slice(0, POPULAR_LIMIT).map((film, index) => (
          <HomePart as="li" index={index} key={film.id} name="card">
            <MoviePosterLink
              caption={
                <span className={CAPTION_CLASS}>
                  {film.faces.length > 0 ? (
                    <AvatarStack
                      people={toAvatarPeople(film.faces.slice(0, 3))}
                      round
                      size={16}
                    />
                  ) : (
                    <Icon icon="solar:eye-bold" size={12} />
                  )}
                  <span className="truncate">
                    {formatCompact(film.members)}
                  </span>
                  {film.rating ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-0.5">
                      <Icon
                        className="text-rated"
                        icon="solar:star-bold"
                        size={11}
                      />
                      {film.rating.toFixed(1)}
                    </span>
                  ) : null}
                </span>
              }
              movie={film}
              radius={RADIUS.card}
              sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 30vw"
            />
          </HomePart>
        ))}
      </ul>
    </HomeSection>
  );
}

function Rank({
  film,
  index,
}: {
  film: RatedFilm;
  index: number;
}): JSX.Element {
  return (
    <HomePart
      as="li"
      className="grid grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4"
      index={index}
      name="rank"
    >
      <span className="text-right font-zuume type-display-xs leading-none font-bold text-ink-faint tabular-nums">
        {index + 1}
      </span>
      <MoviePosterLink movie={film} radius={RADIUS.thumb} sizes="48px" />
      <div className="flex min-w-0 flex-col gap-1">
        <FilmTitle className="type-copy" film={film} />
        <span className="type-meta text-ink-muted tabular-nums">
          {formatCompact(film.ratings)} ratings
        </span>
      </div>
      <span className="flex items-center gap-1.5">
        <span className="font-zuume type-display-xs leading-none font-bold text-ink tabular-nums">
          {film.rating.toFixed(2)}
        </span>
        <Icon className="text-rated" icon="solar:star-bold" size={14} />
      </span>
    </HomePart>
  );
}

export function HomeCanon({
  films,
}: {
  films: RatedFilm[];
}): JSX.Element | null {
  if (films.length === 0) return null;
  const ranked = films.slice(0, CANON_LIMIT);
  const half = Math.ceil(ranked.length / 2);
  const columns = [ranked.slice(0, half), ranked.slice(half)];

  return (
    <HomeSection className="flex w-full flex-col" cue="canon">
      <Heading title="Highest rated by members" />
      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
        {columns.map((column, side) =>
          column.length > 0 ? (
            <ol
              className={`flex flex-col divide-y ${TONE.rules} border-t border-rule max-lg:not-first:border-t-0 lg:border-b`}
              key={side}
              start={side * half + 1}
            >
              {column.map((film, index) => (
                <Rank film={film} index={side * half + index} key={film.id} />
              ))}
            </ol>
          ) : null,
        )}
      </div>
    </HomeSection>
  );
}

// --- HomeLists ---

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
      className="flex min-w-0 flex-col gap-4"
      index={index}
      name="list"
    >
      <DockLink
        aria-label={list.title}
        data-cursor-fit="snug"
        className="block ui-fade hover:opacity-80"
        href={href}
      >
        <PosterStack paths={list.previews} />
      </DockLink>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="min-w-0 truncate type-title font-semibold text-ink">
          <DockLink className={TEXT_LINK_CLASS} href={href}>
            {list.title}
          </DockLink>
        </h3>
        {list.description ? (
          <p className="line-clamp-2 type-body text-pretty text-ink-muted">
            {list.description}
          </p>
        ) : null}
      </div>
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

export function HomeLists({
  lists,
}: {
  lists: HomeList[];
}): JSX.Element | null {
  if (lists.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="lists">
      <Heading title="Popular lists" />
      <ul className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {lists.slice(0, LIST_LIMIT).map((list, index) => (
          <ListCard index={index} key={list.id} list={list} />
        ))}
      </ul>
    </HomeSection>
  );
}

// --- HomeMembers ---

type MemberFollowState = "accepted" | "pending" | null;

function FollowButton({ member }: { member: HomeMember }): JSX.Element {
  const auth = useAuth();
  const toast = useToast();
  const openSignIn = useOpenSignIn();
  const [status, setStatus] = useState<MemberFollowState>(null);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (!auth.isAuthenticated) {
      openSignIn();
      return;
    }
    const was = status;
    setStatus(was ? null : "accepted");
    start(async () => {
      const result = was
        ? await unfollowUserAction(member.id, member.username)
        : await followUserAction(member.id, member.username);
      if (!result.success) {
        setStatus(was);
        toast(result.error);
        return;
      }
      const next: MemberFollowState = was
        ? null
        : (result.data as MemberFollowState);
      setStatus(next);
      globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
        followingId: member.id,
        status: next,
      });
    });
  };

  return (
    <Button
      aria-pressed={status !== null}
      intent={status ? "chosen" : "neutral"}
      shape="pill"
      size="sm"
      width="full"
      disabled={pending}
      onClick={toggle}
    >
      {status === "pending" ? "Requested" : status ? "Following" : "Follow"}
    </Button>
  );
}

function MemberCard({
  index,
  member,
}: {
  index: number;
  member: HomeMember;
}): JSX.Element {
  const href = accountHref(member.username);
  return (
    <HomePart
      as="li"
      className="flex min-w-0 flex-col items-center gap-3 text-center"
      index={index}
      name="member"
    >
      <DockLink className="flex ui-fade hover:opacity-80" href={href}>
        <Avatar
          className="rounded-full"
          name={member.displayName}
          size={72}
          src={member.avatarUrl ?? undefined}
        />
      </DockLink>
      <div className="flex w-full min-w-0 flex-col gap-0.5">
        <DockLink
          className={`truncate type-copy font-semibold text-ink ${TEXT_LINK_CLASS}`}
          href={href}
        >
          {member.displayName}
        </DockLink>
        <span className="truncate type-meta text-ink-muted">
          @{member.username}
        </span>
      </div>
      <p className="line-clamp-2 min-h-8 type-meta text-ink-muted">
        {member.reason}
      </p>
      <p className="type-meta text-ink-muted tabular-nums">
        {formatCompact(member.watched)} films · {formatCompact(member.reviews)}{" "}
        reviews
      </p>
      <div className="mt-auto w-full max-w-36">
        <FollowButton member={member} />
      </div>
    </HomePart>
  );
}

export function HomeMembers({
  members,
  title,
}: {
  members: HomeMember[];
  title: string;
}): JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <HomeSection className="flex w-full flex-col" cue="members">
      <Heading title={title} />
      <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
        {members.map((member, index) => (
          <MemberCard index={index} key={member.id} member={member} />
        ))}
      </ul>
    </HomeSection>
  );
}

// --- HomeReviews ---

const LEAD_REVIEW_LENGTH = 320;

function Byline({ review }: { review: HomeReview }): JSX.Element {
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

function Likes({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 type-meta text-ink-muted tabular-nums">
      <Icon className="text-liked" icon="solar:heart-bold" size={13} />
      {formatCompact(count)}
    </span>
  );
}

function Lead({ review }: { review: HomeReview }): JSX.Element {
  const { author, film } = review;
  const still = tmdbImageUrl("backdrop", film.backdropPath, "w1280");

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <HomePart name="cover">
        {still ? (
          <DockLink
            aria-label={film.title}
            className="cine-card relative block aspect-[16/9] overflow-hidden rounded-panel bg-plate"
            href={movieHref(film.id)}
            data-slot="frame"
          >
            <Image
              alt=""
              className="object-cover"
              sizes="(min-width: 1024px) 640px, 100vw"
              src={still}
              wrapperClassName="absolute inset-0"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-page/90 via-page/20 to-transparent"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
              <span className="flex min-w-0 flex-col gap-1">
                <span className={`${TONE.label} text-ink-body`}>Review of</span>
                <span className="truncate font-zuume type-display-xs leading-none font-bold text-ink uppercase sm:type-display-sm">
                  {film.title}
                </span>
              </span>
              {film.year ? (
                <span className="shrink-0 type-body text-ink-body tabular-nums">
                  {film.year}
                </span>
              ) : null}
            </span>
            <span className="cine-afterglow" />
          </DockLink>
        ) : (
          <div className="flex items-end gap-5">
            <div className="w-24 shrink-0">
              <MoviePosterLink movie={film} radius={RADIUS.card} sizes="96px" />
            </div>
            <FilmTitle className="type-title" film={film} />
          </div>
        )}
      </HomePart>
      <blockquote className="flex flex-col gap-6">
        <HomeText
          as="p"
          className="line-clamp-8 max-w-[44ch] type-heading font-medium text-pretty text-ink sm:line-clamp-6"
          part="lead"
          text={`“${review.content}”`}
        />
        <HomePart
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          name="byline"
        >
          <Byline review={review} />
          <Likes count={review.likes} />
          <DockLink
            className={`type-meta font-medium text-ink-body hover:text-ink ${TEXT_LINK_CLASS}`}
            href={reviewHref(film.id, author.username)}
          >
            Read review
          </DockLink>
        </HomePart>
      </blockquote>
    </article>
  );
}

function Brief({
  index,
  review,
}: {
  index: number;
  review: HomeReview;
}): JSX.Element {
  const { author, film } = review;
  const href = reviewHref(film.id, author.username);
  return (
    <HomePart as="li" className={REVIEW_ROW} index={index} name="review">
      <ReviewCard
        actions={
          <span className="flex items-center gap-5">
            <Likes count={review.likes} />
            <DockLink
              className={`type-meta font-medium text-ink-muted hover:text-ink ${TEXT_LINK_CLASS}`}
              href={href}
            >
              Read
            </DockLink>
          </span>
        }
        actionsInset={false}
        clamp
        content={review.content}
        date={review.createdAt}
        dateLabel={formatRelativeTime(review.createdAt)}
        href={movieHref(film.id)}
        lead={
          <MoviePosterLink movie={film} radius={RADIUS.tile} sizes="72px" />
        }
        meta={
          <>
            {film.year ? <ReviewMeta faint>{film.year}</ReviewMeta> : null}
            <MemberLink
              className="type-meta font-medium"
              member={author}
              size={16}
            />
          </>
        }
        rating={review.rating}
        title={film.title}
      />
    </HomePart>
  );
}

function pickLead(reviews: HomeReview[]): HomeReview {
  return (
    reviews.find(
      (review) =>
        review.film.backdropPath && review.content.length <= LEAD_REVIEW_LENGTH,
    ) ??
    reviews.find((review) => review.content.length <= LEAD_REVIEW_LENGTH) ??
    reviews[0]!
  );
}

export function HomeReviews({
  reviews,
}: {
  reviews: HomeReview[];
}): JSX.Element | null {
  if (reviews.length === 0) return null;
  const lead = pickLead(reviews);
  const rest = reviews.filter((review) => review !== lead).slice(0, 3);

  return (
    <HomeSection className="flex w-full flex-col" cue="reviews">
      <Heading title="Popular reviews" />
      <div className="grid grid-cols-1 gap-x-16 gap-y-14 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Lead review={lead} />
        {rest.length > 0 ? (
          <ul className="flex flex-col">
            {rest.map((review, index) => (
              <Brief index={index} key={review.id} review={review} />
            ))}
          </ul>
        ) : null}
      </div>
    </HomeSection>
  );
}
