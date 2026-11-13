import type { JSX } from "react";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { resolveVitrin } from "@/features/media/server";
import { withVitrin } from "@/features/media/vitrin";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { ActivityCalendar } from "@/features/profile/activity/calendar";
import { ActivityFeed } from "@/features/profile/activity/feed";
import {
  CountLink,
  DiaryDigest,
  EmptyState,
  PeopleGrid,
  PosterGrid,
  PosterTile,
  RatingsChart,
  Section,
  ViewAll,
} from "@/features/profile/blocks";
import { AccountBio } from "@/features/profile/hero";
import { ListTeaser } from "@/features/profile/lists/lists";
import { AccountPart } from "@/features/profile/motion";
import {
  type AccountData,
  type AccountOverviewData,
  FAVORITES_MAX,
  type MediaItem,
  PROFILE_ROW,
  type ReviewCardData,
} from "@/features/profile/profile";
import { getWatchingShows } from "@/features/profile/progress/server";
import { ReviewList } from "@/features/profile/reviews/list";
import { AccountPage } from "@/features/profile/shell";
import { ShowProgressGrid } from "@/features/tv/progress";
import type { SearchParams } from "@/lib/http";
import { accountHref } from "@/lib/project";
import type { MediaType } from "@/lib/tmdb/shared";
import { getAccountOverview } from "./server";

const OVERVIEW_WATCHLIST = 5;

const OVERVIEW_RECENT = 5;

const OVERVIEW_REVIEWS = 3;

const OVERVIEW_POPULAR = 3;

const OVERVIEW_DIARY = 10;

const OVERVIEW_LISTS = 3;

const OVERVIEW_FOLLOWING = 18;

const OVERVIEW_ACTIVITY = 5;

function FavoriteFilms({
  favorites,
  isOwner,
  link,
  mediaType,
}: {
  favorites: MediaItem[];
  isOwner: boolean;
  link: (path: string) => string;
  mediaType: MediaType;
}): JSX.Element | null {
  if (favorites.length === 0 && !isOwner) return null;

  return (
    <Section
      action={isOwner ? <ViewAll href={link("/likes")} label="Edit" /> : null}
      cue="shelf"
      title={mediaType === "tv" ? "Favorite shows" : "Favorite films"}
    >
      <ul className={`grid ${PROFILE_ROW}`}>
        {favorites.map((film, index) => (
          <PosterTile index={index} item={film} key={film.tmdbId} staged />
        ))}
        {isOwner
          ? Array.from(
              { length: FAVORITES_MAX - favorites.length },
              (_, index) => (
                <AccountPart
                  as="li"
                  index={favorites.length + index}
                  key={`slot-${index}`}
                  name="tile"
                >
                  <DockLink
                    aria-label="Pin a favorite from your likes"
                    className="center aspect-[2/3] rounded-card border border-dashed border-edge-focus text-ink-faint hover:border-ink-faint focus-visible:border-ink-faint hover:text-ink focus-visible:text-ink"
                    href={link("/likes")}
                  >
                    <Icon icon="solar:add-circle-linear" size={20} />
                  </DockLink>
                </AccountPart>
              ),
            )
          : null}
      </ul>
    </Section>
  );
}

function OverviewAside({
  account,
  actor,
  data,
  link,
}: {
  account: AccountData;
  actor: { displayName: string; username: string };
  data: AccountOverviewData;
  link: (path: string) => string;
}): JSX.Element {
  const { activity, activityDays, counts, diary, following, followingCount } =
    data;
  const ratings = data.spread.reduce((sum, count) => sum + count, 0);

  return (
    <aside className="plan-aside grid min-w-0 content-start gap-fib-6 sm:grid-cols-2 sm:gap-x-fib-5 lg:grid-cols-1">
      {account.bio ? (
        <Section title="Bio">
          <AccountPart name="row">
            <AccountBio
              bio={account.bio}
              displayName={account.displayName || account.username}
              username={account.username}
            />
          </AccountPart>
        </Section>
      ) : null}

      {diary.length > 0 ? (
        <Section
          action={<CountLink count={counts.diary} href={link("/diary")} />}
          title="Diary"
        >
          <DiaryDigest entries={diary} />
        </Section>
      ) : null}

      {ratings > 0 ? (
        <Section
          action={<CountLink count={ratings} href={link("/reviews")} />}
          cue="ratings"
          title="Ratings"
        >
          <RatingsChart spread={data.spread} />
        </Section>
      ) : null}

      {activity.length > 0 ? (
        <Section
          action={<ViewAll href={link("/activity")} />}
          cue="activity"
          title="Activity"
        >
          <div className="flex flex-col gap-fib-4">
            <ActivityCalendar days={activityDays} />
            <ActivityFeed actor={actor} items={activity} />
          </div>
        </Section>
      ) : null}

      {following.length > 0 ? (
        <Section
          cue="faces"
          summary={followingCount.toLocaleString("en-US")}
          title="Following"
        >
          <PeopleGrid people={following} />
        </Section>
      ) : null}
    </aside>
  );
}

function ReviewsSection({
  action,
  isOwner,
  reviews,
  signedIn,
  title,
  username,
}: {
  action: JSX.Element | null;
  isOwner: boolean;
  reviews: ReviewCardData[];
  signedIn: boolean;
  title: string;
  username: string;
}): JSX.Element | null {
  if (reviews.length === 0) return null;
  return (
    <Section action={action} title={title}>
      <ReviewList
        isOwner={isOwner}
        reviews={reviews}
        signedIn={signedIn}
        staged
        username={username}
      />
    </Section>
  );
}

export async function AccountOverviewView({
  query,
  username,
}: {
  query?: SearchParams;
  username: string;
}): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner, viewerId } = context;

  const mediaType = await resolveVitrin(query);
  const base = accountHref(account.username);
  const link = (path: string) => withVitrin(`${base}${path}`, mediaType);
  const [data, watching] = await Promise.all([
    getAccountOverview({
      accountId: account.id,
      accountUsername: account.username,
      client,
      mediaType,
      limits: {
        activity: OVERVIEW_ACTIVITY,
        diary: OVERVIEW_DIARY,
        following: OVERVIEW_FOLLOWING,
        lists: OVERVIEW_LISTS,
        popular: OVERVIEW_REVIEWS + OVERVIEW_POPULAR,
        reviews: OVERVIEW_REVIEWS,
        watched: OVERVIEW_RECENT,
        watchlist: OVERVIEW_WATCHLIST,
      },
    }),
    mediaType === "tv"
      ? getWatchingShows({ accountId: account.id, client })
      : Promise.resolve([]),
  ]);
  const { counts, lists, reviews, watched, watchlist } = data;

  const shown = new Set(reviews.map((review) => review.id));
  const popular = data.popular
    .filter((review) => !shown.has(review.id))
    .slice(0, OVERVIEW_POPULAR);
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };
  const reviewScope = {
    isOwner,
    signedIn: viewerId !== null,
    username: account.username,
  };

  return (
    <div className="plan w-full gap-y-fib-6">
      <div className="plan-main flex min-w-0 flex-col gap-fib-6">
        <FavoriteFilms
          link={link}
          mediaType={mediaType}
          favorites={data.favorites.slice(0, FAVORITES_MAX)}
          isOwner={isOwner}
        />

        {watching.length > 0 ? (
          <Section cue="shelf" title="Watching">
            <ShowProgressGrid shows={watching} />
          </Section>
        ) : null}

        {watched.length > 0 ? (
          <Section
            action={
              counts.watched > watched.length ? (
                <ViewAll href={link("/watched")} />
              ) : null
            }
            cue="shelf"
            title={
              mediaType === "tv" ? "Recently finished" : "Recently watched"
            }
          >
            <PosterGrid className={PROFILE_ROW} items={watched} staged />
          </Section>
        ) : null}

        {watchlist.length > 0 ? (
          <Section
            action={
              <CountLink count={counts.watchlist} href={link("/watchlist")} />
            }
            cue="shelf"
            title="Watchlist"
          >
            <PosterGrid className={PROFILE_ROW} items={watchlist} staged />
          </Section>
        ) : null}

        <ReviewsSection
          action={
            counts.reviews > reviews.length ? (
              <ViewAll href={link("/reviews")} label="More" />
            ) : null
          }
          reviews={reviews}
          title="Recent reviews"
          {...reviewScope}
        />
        <ReviewsSection
          action={
            <ViewAll href={link("/reviews?sort=likes_desc")} label="More" />
          }
          reviews={popular}
          title="Popular reviews"
          {...reviewScope}
        />

        {watched.length === 0 &&
        reviews.length === 0 &&
        watching.length === 0 ? (
          <AccountPage>
            <EmptyState icon="solar:clapperboard-open-bold">
              {isOwner
                ? mediaType === "tv"
                  ? "Shows you track, rate and review will show up here."
                  : "Films you watch, rate and review will show up here."
                : "Nothing here yet."}
            </EmptyState>
          </AccountPage>
        ) : null}

        {lists.length > 0 ? (
          <Section
            action={<CountLink count={counts.lists} href={link("/lists")} />}
            title="Lists"
          >
            <div className="grid gap-x-fib-4 gap-y-fib-5 sm:grid-cols-3">
              {lists.map((list, index) => (
                <ListTeaser
                  index={index}
                  key={list.id}
                  list={list}
                  username={account.username}
                />
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <OverviewAside account={account} actor={actor} data={data} link={link} />
    </div>
  );
}
