import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatShortDate } from "@/features/account/utils";
import { FollowedBy } from "@/features/social/proof";
import { accountHref, project, shareMetadata } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { AccountLink } from "@/ui/button";
import { Icon } from "@/ui/media";
import {
  ActivityCalendar,
  ActivityFeed,
  ActivityLog,
  ActivityRow,
  ReviewList,
} from "./activity";
import {
  CountLink,
  DiaryDigest,
  EmptyState,
  PeopleGrid,
  PosterGrid,
  PosterTile,
  ProfileStats,
  RatingsChart,
  Section,
  ViewAll,
} from "./blocks";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  FAVORITES_MAX,
  LIST_ITEM_SORTS,
  LIST_SORTS,
  MEDIA_FILTERS,
  MEDIA_PAGE_SIZE,
  MEDIA_SORTS,
  MEDIA_VIEW_KINDS,
  OVERVIEW_ACTIVITY,
  OVERVIEW_DIARY,
  OVERVIEW_FOLLOWING,
  OVERVIEW_LISTS,
  OVERVIEW_POPULAR,
  OVERVIEW_RECENT,
  OVERVIEW_REVIEWS,
  PROFILE_ROW,
  REVIEW_KINDS,
  REVIEW_SORTS,
  VIEW_MONTH_FORMAT,
} from "./constants";
import { FilterBar, Pagination } from "./controls";
import { DiaryChrome, DiaryLedger } from "./diary";
import { AccountBio } from "./hero";
import {
  ListChrome,
  ListComments,
  ListRows,
  ListsChrome,
  ListTeaser,
} from "./lists";
import { AccountPart, AccountSection } from "./motion";
import {
  getAccountAmbientPalette,
  getAccountHeader,
  getAccountOverview,
  getAccountPageContext,
  getActivityPage,
  getDiaryMonth,
  getListPage,
  getListsPage,
  getMediaPage,
  getReviewsPage,
} from "./server";
import { AccountPage, AccountShell } from "./shell";
import type { AccountViewProps, MediaKind } from "./types";
import {
  countLabel,
  hasMediaFilters,
  parseActivityFilters,
  parseListItemFilters,
  parseListSort,
  parseMediaFilters,
  parseReviewFilters,
  readMonth,
  readPageParam,
  shiftMonth,
} from "./utils";

export async function getAccountMetadata(username: string): Promise<Metadata> {
  const { account } = await getAccountPageContext(username);

  const title = account.displayName
    ? `${account.displayName} (@${account.username})`
    : `@${account.username}`;
  return shareMetadata({
    card: "summary",
    description:
      account.bio ||
      `View ${account.displayName || account.username}'s profile on ${project.name}.`,
    image: account.avatarUrl,
    title,
  });
}

export async function AccountProfileLayout({
  children,
  username,
}: {
  children: ReactNode;
  username: string;
}): Promise<JSX.Element> {
  const { account, client, isOwner } = await getAccountPageContext(username);

  const [header, palette] = await Promise.all([
    getAccountHeader({ accountId: account.id, client }),
    getAccountAmbientPalette(account.backgroundUrl || account.avatarUrl),
  ]);
  const { library, mutual } = header;
  const base = accountHref(account.username);

  return (
    <AccountShell
      account={account}
      followersCount={header.followersCount}
      followingCount={header.followingCount}
      initialFollowStatus={header.followStatus}
      isFollower={header.followStatus === "accepted"}
      isOwner={isOwner}
      palette={palette}
      proofSlot={mutual ? <FollowedBy mutual={mutual} /> : null}
      statsSlot={
        library ? (
          <ProfileStats
            stats={[
              {
                count: library.watched,
                href: `${base}/watched`,
                label: "Films",
              },
              {
                count: library.thisYear,
                href: `${base}/diary`,
                label: "This year",
              },
              {
                count: library.lists,
                href: `${base}/lists`,
                label: "Lists",
              },
            ]}
          />
        ) : null
      }
    >
      {children}
    </AccountShell>
  );
}

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
      activity: OVERVIEW_ACTIVITY,
      diary: OVERVIEW_DIARY,
      following: OVERVIEW_FOLLOWING,
      lists: OVERVIEW_LISTS,
      popular: OVERVIEW_REVIEWS + OVERVIEW_POPULAR,
      reviews: OVERVIEW_REVIEWS,
      watched: OVERVIEW_RECENT,
      watchlist: 5,
    },
  });

  const favorites = pinned.slice(0, FAVORITES_MAX);
  const shown = new Set(reviews.map((review) => review.id));
  const popular = liked
    .filter((review) => !shown.has(review.id))
    .slice(0, OVERVIEW_POPULAR);
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

export async function AccountActivityView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseActivityFilters(query);
  const result = await getActivityPage({
    accountId: account.id,
    accountUsername: account.username,
    client,
    filters,
  });
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        {result.total > 0 || filters.group !== "all" ? (
          <FilterBar
            fields={[
              { defaultValue: "all", key: "type", options: ACTIVITY_GROUPS },
              { defaultValue: "newest", key: "sort", options: ACTIVITY_SORTS },
            ]}
            searchPlaceholder={null}
          />
        ) : null}

        {result.items.length > 0 ? (
          <>
            <ActivityLog>
              {result.items.map((item) => (
                <ActivityRow actor={actor} item={item} key={item.id} />
              ))}
            </ActivityLog>
            <Pagination page={result.page} pageCount={result.pageCount} />
          </>
        ) : (
          <EmptyState icon="solar:bolt-bold">
            {filters.group !== "all"
              ? "No activity of this kind"
              : isOwner
                ? "What you do on Guffin shows up here"
                : "No activity yet"}
          </EmptyState>
        )}
      </div>
    </AccountPage>
  );
}

export async function AccountDiaryView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const diary = await getDiaryMonth({
    accountId: account.id,
    client,
    month: readMonth(query),
  });

  const base = accountHref(account.username);
  const href = (month: string) => `${base}/diary?month=${month}`;
  const hasPrevious = diary.first !== null && diary.month > diary.first;
  const hasNext = diary.last !== null && diary.month < diary.last;

  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        {diary.first ? (
          <DiaryChrome
            label={VIEW_MONTH_FORMAT.format(
              new Date(`${diary.month}-01T00:00:00Z`),
            )}
            latest={
              diary.last && diary.month !== diary.last ? href(diary.last) : null
            }
            next={hasNext ? href(shiftMonth(diary.month, 1)) : null}
            previous={hasPrevious ? href(shiftMonth(diary.month, -1)) : null}
          />
        ) : null}

        {diary.rows.length > 0 ? (
          <DiaryLedger
            isOwner={isOwner}
            username={account.username}
            rows={diary.rows}
          />
        ) : (
          <EmptyState icon="solar:calendar-mark-bold">
            {diary.first
              ? "No diary entries in this month"
              : isOwner
                ? "Use “Log to diary” on a movie page to start your diary"
                : "Nothing in the diary yet"}
          </EmptyState>
        )}
      </div>
    </AccountPage>
  );
}

export async function AccountListsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const result = await getListsPage({
    accountId: account.id,
    client,
    page: readPageParam(query),
    sort: parseListSort(query),
  });

  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        <ListsChrome isOwner={isOwner} username={account.username} />
        {result.total > 1 ? (
          <FilterBar
            fields={[
              {
                defaultValue: "updated_desc",
                key: "sort",
                options: LIST_SORTS,
              },
            ]}
            searchPlaceholder={null}
          />
        ) : null}

        {result.items.length > 0 ? (
          <>
            <ListRows
              lists={result.items}
              ownerEdit={isOwner}
              username={account.username}
            />
            <Pagination page={result.page} pageCount={result.pageCount} />
          </>
        ) : (
          <EmptyState icon="solar:list-bold">
            {isOwner
              ? "Start a list here, or from any movie page"
              : "No lists yet"}
          </EmptyState>
        )}
      </div>
    </AccountPage>
  );
}

export async function AccountListView({
  query,
  slug,
  username,
}: AccountViewProps & { slug: string }): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;

  const filters = parseListItemFilters(query);
  const page = await getListPage({
    client,
    filters,
    owner: account,
    slug,
  });
  if (!page) notFound();
  const { commentCount, comments, items, list, ownComment } = page;

  const filtered = hasMediaFilters(filters);
  const ranked = list.isRanked && filters.sort === "position" && !filtered;
  const lists = `${accountHref(account.username)}/lists`;

  return (
    <AccountPage>
      <div className="flex w-full flex-col gap-10">
        <ListChrome
          comment={ownComment}
          icon={tmdbImageUrl("poster", list.posterPath, "w185")}
          isOwner={isOwner}
          list={list}
          signedIn={viewerId !== null}
        />
        <header className="flex flex-col gap-5">
          <AccountLink
            className="inline-flex w-fit items-center gap-1.5 type-label font-semibold tracking-label text-ink-muted uppercase hover:text-ink focus-visible:text-ink"
            href={lists}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={13} />
            All lists
          </AccountLink>

          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="type-heading font-semibold break-words text-ink">
                {list.title}
              </h1>
              {list.isPrivate ? (
                <Icon
                  aria-label="Private list"
                  className="shrink-0 text-ink-muted"
                  icon="solar:lock-bold"
                  size={16}
                />
              ) : null}
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 type-body text-ink-muted">
              <span>
                By{" "}
                <AccountLink
                  className="font-medium text-ink-body hover:text-ink focus-visible:text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
                  href={accountHref(list.owner.username)}
                >
                  {list.owner.displayName}
                </AccountLink>
              </span>
              {[
                countLabel(list.itemsCount, "film"),
                list.isRanked ? "Ranked" : null,
                `Updated ${formatShortDate(list.updatedAt)}`,
              ]
                .filter(Boolean)
                .map((part) => (
                  <span
                    className="inline-flex items-center gap-x-2 whitespace-nowrap"
                    key={part}
                  >
                    <span aria-hidden="true" className="text-ink-faint">
                      ·
                    </span>
                    {part}
                  </span>
                ))}
            </p>
            {list.description ? (
              <p className="max-w-2xl type-body leading-6 whitespace-pre-line text-ink-body">
                {list.description}
              </p>
            ) : null}
          </div>
        </header>

        <div className="flex w-full flex-col">
          {list.itemsCount > 0 || filtered ? (
            <FilterBar
              fields={[
                ...MEDIA_FILTERS,
                {
                  defaultValue: "position",
                  key: "sort",
                  options: LIST_ITEM_SORTS,
                },
              ]}
              searchPlaceholder="Search this list"
            />
          ) : null}

          {items.items.length > 0 ? (
            <>
              <PosterGrid
                items={items.items}
                numberFrom={
                  ranked ? (items.page - 1) * MEDIA_PAGE_SIZE + 1 : undefined
                }
                source={isOwner ? { kind: "list", listId: list.id } : null}
              />
              <Pagination page={items.page} pageCount={items.pageCount} />
            </>
          ) : (
            <EmptyState icon="solar:clapperboard-play-bold">
              {filtered
                ? "No films match these filters"
                : isOwner
                  ? "Add films from any movie page with “Add to list”"
                  : "This list is empty"}
            </EmptyState>
          )}
        </div>

        <Section summary={countLabel(commentCount, "comment")} title="Comments">
          <ListComments
            comments={comments}
            listId={list.id}
            listTitle={list.title}
            viewerId={viewerId}
          />
        </Section>
      </div>
    </AccountPage>
  );
}

export async function AccountMediaView({
  kind,
  query,
  username,
}: AccountViewProps & { kind: MediaKind }): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseMediaFilters(query);
  const result = await getMediaPage({
    accountId: account.id,
    client,
    filters,
    kind,
  });
  const copy = MEDIA_VIEW_KINDS[kind];
  const filtered = hasMediaFilters(filters);
  const showBar = result.total > 0 || filtered;

  return (
    <AccountSection as="div" className="flex w-full flex-col" cue="shelf" now>
      {showBar ? (
        <AccountPart name="row">
          <FilterBar
            fields={[
              ...MEDIA_FILTERS,
              {
                defaultValue: "added_desc",
                key: "sort",
                options: MEDIA_SORTS,
              },
            ]}
            searchPlaceholder="Search titles"
          />
        </AccountPart>
      ) : null}

      {result.items.length > 0 ? (
        <>
          <PosterGrid
            items={result.items}
            source={isOwner ? { kind } : null}
            staged
          />
          <AccountPart name="row">
            <Pagination page={result.page} pageCount={result.pageCount} />
          </AccountPart>
        </>
      ) : (
        <AccountPart name="row">
          <EmptyState icon={copy.icon}>
            {filtered
              ? "No films match these filters"
              : isOwner
                ? copy.emptyOwn
                : copy.empty}
          </EmptyState>
        </AccountPart>
      )}
    </AccountSection>
  );
}

export async function AccountReviewsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const { account, client, isOwner, locked, viewerId } =
    await getAccountPageContext(username);
  if (locked) return null;
  const filters = parseReviewFilters(query);
  const result = await getReviewsPage({
    accountId: account.id,
    client,
    filters,
    viewerId,
  });
  const filtered = Boolean(filters.query) || filters.kind !== "all";

  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        {result.total > 0 || filtered ? (
          <FilterBar
            fields={[
              { defaultValue: "all", key: "kind", options: REVIEW_KINDS },
              { defaultValue: "newest", key: "sort", options: REVIEW_SORTS },
            ]}
            searchPlaceholder="Search reviews"
          />
        ) : null}

        {result.items.length > 0 ? (
          <>
            <ReviewList
              isOwner={isOwner}
              reviews={result.items}
              signedIn={viewerId !== null}
              username={account.username}
            />
            <Pagination page={result.page} pageCount={result.pageCount} />
          </>
        ) : (
          <EmptyState icon="solar:pen-new-square-bold">
            {filtered
              ? "No reviews match these filters"
              : isOwner
                ? "Your reviews and ratings show up here"
                : "No reviews yet"}
          </EmptyState>
        )}
      </div>
    </AccountPage>
  );
}
