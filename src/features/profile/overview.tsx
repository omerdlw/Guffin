import type { JSX } from "react";
import { accountHref } from "@/lib/project";
import { AccountLink } from "@/ui/button";
import { Icon } from "@/ui/media";
import { ActivityFeed } from "./activity";
import { ActivityCalendar } from "./calendar";
import { ReviewList } from "./reviews";
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
} from "./blocks";
import {
  FAVORITES_MAX,
  OVERVIEW_ACTIVITY,
  OVERVIEW_DIARY,
  OVERVIEW_FOLLOWING,
  OVERVIEW_LISTS,
  OVERVIEW_POPULAR,
  OVERVIEW_RECENT,
  OVERVIEW_REVIEWS,
  OVERVIEW_WATCHLIST,
  PROFILE_ROW,
} from "./constants";
import { AccountBio } from "./hero";
import { ListTeaser } from "./lists";
import { AccountPart } from "./motion";
import { getAccountOverview, getUnlockedAccountContext } from "./server";
import { AccountPage } from "./shell";
import type {
  AccountData,
  AccountOverviewData,
  MediaItem,
  ReviewCardData,
} from "./types";

function FavoriteFilms({
  base,
  favorites,
  isOwner,
}: {
  base: string;
  favorites: MediaItem[];
  isOwner: boolean;
}): JSX.Element | null {
  if (favorites.length === 0 && !isOwner) return null;

  return (
    <Section
      action={isOwner ? <ViewAll href={`${base}/likes`} label="Edit" /> : null}
      cue="shelf"
      title="Favorite films"
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
                  <AccountLink
                    aria-label="Pin a favorite from your likes"
                    className="center aspect-[2/3] rounded-card border border-dashed border-edge-focus text-ink-faint hover:border-ink-faint focus-visible:border-ink-faint hover:text-ink focus-visible:text-ink"
                    href={`${base}/likes`}
                  >
                    <Icon icon="solar:add-circle-linear" size={20} />
                  </AccountLink>
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
  base,
  data,
}: {
  account: AccountData;
  actor: { displayName: string; username: string };
  base: string;
  data: AccountOverviewData;
}): JSX.Element {
  const { activity, activityDays, counts, diary, following, followingCount } =
    data;
  const ratings = data.spread.reduce((sum, count) => sum + count, 0);

  return (
    <aside className="grid min-w-0 content-start gap-10 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-1">
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
          action={<CountLink count={counts.diary} href={`${base}/diary`} />}
          title="Diary"
        >
          <DiaryDigest entries={diary} />
        </Section>
      ) : null}

      {ratings > 0 ? (
        <Section
          action={<CountLink count={ratings} href={`${base}/reviews`} />}
          cue="ratings"
          title="Ratings"
        >
          <RatingsChart spread={data.spread} />
        </Section>
      ) : null}

      {activity.length > 0 ? (
        <Section
          action={<ViewAll href={`${base}/activity`} />}
          cue="activity"
          title="Activity"
        >
          <div className="flex flex-col gap-6">
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
  username,
}: {
  username: string;
}): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner, viewerId } = context;

  const base = accountHref(account.username);
  const data = await getAccountOverview({
    accountId: account.id,
    accountUsername: account.username,
    client,
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
  });
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
    <div className="grid w-full gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-12">
        <FavoriteFilms
          base={base}
          favorites={data.favorites.slice(0, FAVORITES_MAX)}
          isOwner={isOwner}
        />

        {watched.length > 0 ? (
          <Section
            action={
              counts.watched > watched.length ? (
                <ViewAll href={`${base}/watched`} />
              ) : null
            }
            cue="shelf"
            title="Recently watched"
          >
            <PosterGrid className={PROFILE_ROW} items={watched} staged />
          </Section>
        ) : null}

        {watchlist.length > 0 ? (
          <Section
            action={
              <CountLink count={counts.watchlist} href={`${base}/watchlist`} />
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
              <ViewAll href={`${base}/reviews`} label="More" />
            ) : null
          }
          reviews={reviews}
          title="Recent reviews"
          {...reviewScope}
        />
        <ReviewsSection
          action={
            <ViewAll href={`${base}/reviews?sort=likes_desc`} label="More" />
          }
          reviews={popular}
          title="Popular reviews"
          {...reviewScope}
        />

        {watched.length === 0 && reviews.length === 0 ? (
          <AccountPage>
            <EmptyState icon="solar:clapperboard-open-bold">
              {isOwner
                ? "Films you watch, rate and review will show up here."
                : "Nothing here yet."}
            </EmptyState>
          </AccountPage>
        ) : null}

        {lists.length > 0 ? (
          <Section
            action={<CountLink count={counts.lists} href={`${base}/lists`} />}
            title="Lists"
          >
            <div className="grid gap-x-4 gap-y-8 sm:grid-cols-3">
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

      <OverviewAside account={account} actor={actor} base={base} data={data} />
    </div>
  );
}
