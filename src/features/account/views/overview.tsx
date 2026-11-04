import type { JSX } from "react";
import { Icon } from "@/ui";
import { AccountPart } from "../motion";
import { FAVORITES_MAX } from "../browse-types";
import { getAccountOverview } from "../server/browse";
import { getAccountPageContext } from "../server/context";
import { AccountBio } from "../components/bio";
import { AccountLink } from "../components/link";
import { ActivityCalendar } from "../components/activity-calendar";
import { ActivityFeed } from "../components/activity-row";
import { EmptyState } from "../components/empty-state";
import { AccountPage } from "../components/view";
import { ListTeaser } from "../components/list-row";
import { PosterGrid, PosterTile } from "../components/poster-grid";
import { PROFILE_ROW } from "../poster";
import { DiaryDigest, PeopleGrid, RatingsChart } from "../components/sidebar";
import { ReviewList } from "../components/review-list";
import { CountLink, Section, ViewAll } from "../components/section";
import { accountHref } from "@/config/routes";

const RECENT = 5;
const REVIEWS = 3;
const POPULAR = 3;
const DIARY = 10;
const LISTS = 3;
const FOLLOWING = 18;
const ACTIVITY = 5;

export async function AccountOverviewView({
  username,
}: {
  username: string;
}): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;

  const base = accountHref(account.username);

  const {
    activity,
    activityDays,
    counts,
    diary,
    favorites: pinned,
    following,
    followingCount,
    lists,
    popular: liked,
    reviews,
    spread,
    watched,
    watchlist,
  } = await getAccountOverview({
    accountId: account.id,
    accountUsername: account.username,
    client,
    limits: {
      activity: ACTIVITY,
      diary: DIARY,
      following: FOLLOWING,
      lists: LISTS,
      popular: REVIEWS + POPULAR,
      reviews: REVIEWS,
      watched: RECENT,
      watchlist: 5,
    },
  });

  const favorites = pinned.slice(0, FAVORITES_MAX);
  const shown = new Set(reviews.map((review) => review.id));
  const popular = liked
    .filter((review) => !shown.has(review.id))
    .slice(0, POPULAR);
  const ratings = spread.reduce((sum, count) => sum + count, 0);
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  return (
    <div className="grid w-full gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-12">
        {favorites.length > 0 || isOwner ? (
          <Section
            action={
              isOwner ? <ViewAll href={`${base}/likes`} label="Edit" /> : null
            }
            cue="shelf"
            title="Favorite films"
          >
            <ul className={`grid ${PROFILE_ROW}`}>
              {favorites.map((film, index) => (
                <PosterTile
                  index={index}
                  item={film}
                  key={film.tmdbId}
                  staged
                />
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
        ) : null}

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

        {reviews.length > 0 ? (
          <Section
            action={
              counts.reviews > reviews.length ? (
                <ViewAll href={`${base}/reviews`} label="More" />
              ) : null
            }
            title="Recent reviews"
          >
            <ReviewList
              isOwner={isOwner}
              reviews={reviews}
              signedIn={viewerId !== null}
              staged
              username={account.username}
            />
          </Section>
        ) : null}

        {popular.length > 0 ? (
          <Section
            action={
              <ViewAll href={`${base}/reviews?sort=likes_desc`} label="More" />
            }
            title="Popular reviews"
          >
            <ReviewList
              isOwner={isOwner}
              reviews={popular}
              signedIn={viewerId !== null}
              staged
              username={account.username}
            />
          </Section>
        ) : null}

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
            <RatingsChart spread={spread} />
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
    </div>
  );
}
