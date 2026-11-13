import type { JSX, ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatShortDate } from "@/features/account/utils";
import { MEDIA_TYPE_COPY } from "@/features/media/constants";
import { resolveVitrin } from "@/features/media/server";
import { mediaNoun } from "@/features/media/utils";
import { FollowedBy } from "@/features/social/proof";
import { SHOW_STATUS_ICONS, SHOW_STATUS_LABELS } from "@/features/tv/constants";
import { ShowProgressGrid } from "@/features/tv/progress";
import { TV_ENABLED } from "@/lib/env";
import { pluralize } from "@/lib/format";
import { accountHref, project, shareMetadata } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { ActivityChrome, ActivityRhythm, ActivityTimeline } from "./activity";
import { EmptyState, PosterGrid, ProfileStats, Section } from "./blocks";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
  LIST_ITEM_SORTS,
  LIST_SORTS,
  MEDIA_FILTERS,
  MEDIA_PAGE_SIZE,
  MEDIA_SORTS,
  MEDIA_VIEW_KINDS,
  REVIEW_KINDS,
  REVIEW_SORTS,
  VIEW_MONTH_FORMAT,
  PROGRESS_ORDER,
  PROGRESS_SECTION_LIMIT,
} from "./constants";
import { Pagination } from "./controls";
import { FilterBar } from "./filter-bar";
import { DiaryChrome, DiaryMonthView } from "./diary";
import { ListChrome, ListComments, ListRows, ListsChrome } from "./lists";
import { AccountPart, AccountSection } from "./motion";
import {
  getAccountAmbientPalette,
  getAccountHeader,
  getAccountPageContext,
  getUnlockedAccountContext,
} from "./access";
import { getDiaryMonth, getTrackedShows } from "./progress";
import {
  getActivityPage,
  getActivitySummary,
  getListPage,
  getListsPage,
  getMediaPage,
  getReviewsPage,
} from "./server";
import { ReviewList } from "./reviews";
import { AccountPage, AccountShell } from "./shell";
import type { AccountViewProps, ListPageData, MediaKind } from "./types";
import {
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

function ResultsView({
  children,
  empty,
  paging,
  toolbar,
}: {
  children?: ReactNode;
  empty: { icon: string; message: string } | null;
  paging?: { page: number; pageCount: number };
  toolbar?: ReactNode;
}): JSX.Element {
  return (
    <AccountPage>
      <div className="flex w-full flex-col">
        {toolbar}
        {empty ? (
          <EmptyState icon={empty.icon}>{empty.message}</EmptyState>
        ) : (
          <>
            {children}
            {paging ? (
              <Pagination page={paging.page} pageCount={paging.pageCount} />
            ) : null}
          </>
        )}
      </div>
    </AccountPage>
  );
}

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

  const [header, palette, rememberedVitrin] = await Promise.all([
    getAccountHeader({ accountId: account.id, client }),
    getAccountAmbientPalette(account.backgroundUrl || account.avatarUrl),
    resolveVitrin(undefined),
  ]);
  const { library, mutual } = header;
  const base = accountHref(account.username);

  return (
    <AccountShell
      account={account}
      rememberedVitrin={rememberedVitrin}
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
                href: `${base}/watched?v=movie`,
                label: "Films",
              },
              ...(TV_ENABLED
                ? [
                    {
                      count: library.shows,
                      href: `${base}/watched?v=tv`,
                      label: "Shows",
                    },
                  ]
                : []),
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

export async function AccountActivityView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const filters = parseActivityFilters(query);
  const mediaType = await resolveVitrin(query);
  const [result, summary] = await Promise.all([
    getActivityPage({
      accountId: account.id,
      accountUsername: account.username,
      client,
      filters,
      mediaType,
    }),
    getActivitySummary({ accountId: account.id, client }),
  ]);
  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  const emptyMessage =
    filters.group !== "all"
      ? "No activity of this kind"
      : isOwner
        ? "What you do on Guffin shows up here"
        : "No activity yet";

  const empty = result.items.length === 0;

  return (
    <AccountPage>
      <ActivityChrome summary={summary} />
      <div className="flex w-full flex-col gap-fib-5">
        {summary.year > 0 ? <ActivityRhythm summary={summary} /> : null}
        {result.total > 0 || filters.group !== "all" ? (
          <FilterBar
            fields={[
              { defaultValue: "all", key: "type", options: ACTIVITY_GROUPS },
              { defaultValue: "newest", key: "sort", options: ACTIVITY_SORTS },
            ]}
            searchPlaceholder={null}
          />
        ) : null}
        {empty ? (
          <EmptyState icon="solar:bolt-bold">{emptyMessage}</EmptyState>
        ) : (
          <>
            <ActivityTimeline actor={actor} items={result.items} />
            <Pagination page={result.page} pageCount={result.pageCount} />
          </>
        )}
      </div>
    </AccountPage>
  );
}

export async function AccountDiaryView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const mediaType = await resolveVitrin(query);
  const diary = await getDiaryMonth({
    accountId: account.id,
    client,
    mediaType,
    month: readMonth(query),
  });

  const base = accountHref(account.username);
  const href = (month: string) =>
    `${base}/diary?month=${month}${mediaType === "tv" ? "&v=tv" : ""}`;
  const hasPrevious = diary.first !== null && diary.month > diary.first;
  const hasNext = diary.last !== null && diary.month < diary.last;

  const emptyMessage = diary.first
    ? "No diary entries in this month"
    : isOwner
      ? mediaType === "tv"
        ? "Episodes you log show up in your activity"
        : "Use “Log to diary” on a movie page to start your diary"
      : "Nothing in the diary yet";

  return (
    <ResultsView
      empty={
        diary.rows.length > 0
          ? null
          : { icon: "solar:calendar-mark-bold", message: emptyMessage }
      }
      toolbar={
        diary.first ? (
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
        ) : null
      }
    >
      <DiaryMonthView
        isOwner={isOwner}
        month={diary.month}
        rows={diary.rows}
        username={account.username}
      />
    </ResultsView>
  );
}

export async function AccountListsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const mediaType = await resolveVitrin(query);
  const result = await getListsPage({
    accountId: account.id,
    client,
    mediaType,
    page: readPageParam(query),
    sort: parseListSort(query),
  });

  return (
    <ResultsView
      empty={
        result.items.length > 0
          ? null
          : {
              icon: "solar:list-bold",
              message: isOwner
                ? `Start a list here, or from any ${MEDIA_TYPE_COPY[mediaType].singular} page`
                : "No lists yet",
            }
      }
      paging={result}
      toolbar={
        <>
          <ListsChrome
            isOwner={isOwner}
            mediaType={mediaType}
            username={account.username}
          />
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
        </>
      }
    >
      <ListRows
        lists={result.items}
        ownerEdit={isOwner}
        username={account.username}
      />
    </ResultsView>
  );
}

function ListHeader({
  backHref,
  list,
}: {
  backHref: string;
  list: ListPageData["list"];
}): JSX.Element {
  return (
    <header className="flex flex-col gap-5">
      <DockLink
        className="inline-flex w-fit items-center gap-1.5 type-label font-semibold tracking-label text-ink-muted uppercase hover:text-ink focus-visible:text-ink"
        href={backHref}
      >
        <Icon icon="solar:alt-arrow-left-linear" size={13} />
        All lists
      </DockLink>

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
            <DockLink
              className="font-medium text-ink-body hover:text-ink focus-visible:text-ink underline underline-offset-2 decoration-transparent hover:decoration-current focus-visible:decoration-current"
              href={accountHref(list.owner.username)}
            >
              {list.owner.displayName}
            </DockLink>
          </span>
          {[
            pluralize(list.itemsCount, mediaNoun(list.mediaType, 1)),
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
  );
}

export async function AccountListView({
  query,
  slug,
  username,
}: AccountViewProps & { slug: string }): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner, viewerId } = context;

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
        <ListHeader backHref={lists} list={list} />

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
                source={
                  isOwner
                    ? {
                        kind: "list",
                        listId: list.id,
                        mediaType: list.mediaType,
                      }
                    : null
                }
              />
              <Pagination page={items.page} pageCount={items.pageCount} />
            </>
          ) : (
            <EmptyState icon="solar:clapperboard-play-bold">
              {filtered
                ? `No ${mediaNoun(list.mediaType)} match these filters`
                : isOwner
                  ? `Add ${mediaNoun(list.mediaType)} from any ${mediaNoun(list.mediaType, 1)} page with “Add to list”`
                  : "This list is empty"}
            </EmptyState>
          )}
        </div>

        <Section summary={pluralize(commentCount, "comment")} title="Comments">
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
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const filters = parseMediaFilters(query);
  const mediaType = await resolveVitrin(query);
  const result = await getMediaPage({
    accountId: account.id,
    client,
    filters,
    kind,
    mediaType,
  });
  const copy = MEDIA_VIEW_KINDS[kind][mediaType];
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
            source={isOwner ? { kind, mediaType } : null}
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
              ? `No ${mediaNoun(mediaType)} match these filters`
              : isOwner
                ? copy.emptyOwn
                : copy.empty}
          </EmptyState>
        </AccountPart>
      )}
    </AccountSection>
  );
}

export async function AccountProgressView({
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const sections = await Promise.all(
    PROGRESS_ORDER.map(async (status) => ({
      shows: await getTrackedShows({
        accountId: account.id,
        client,
        limit: PROGRESS_SECTION_LIMIT,
        statuses: [status],
      }),
      status,
    })),
  );
  const filled = sections.filter((section) => section.shows.length > 0);

  return (
    <AccountSection
      as="div"
      className="flex w-full flex-col gap-fib-5"
      cue="shelf"
      now
    >
      {filled.length === 0 ? (
        <AccountPart name="row">
          <EmptyState icon={SHOW_STATUS_ICONS.watching}>
            {isOwner
              ? "Start a show and your progress lands here"
              : "No shows tracked yet"}
          </EmptyState>
        </AccountPart>
      ) : (
        filled.map(({ shows, status }) => (
          <AccountPart
            className="flex flex-col gap-fib-3"
            key={status}
            name="row"
          >
            <h2 className="flex items-center gap-2 type-label font-semibold tracking-label text-ink-muted uppercase">
              <Icon icon={SHOW_STATUS_ICONS[status]} size={14} />
              {SHOW_STATUS_LABELS[status]}
              <span className="tabular-nums">{shows.length}</span>
            </h2>
            <ShowProgressGrid shows={shows} />
          </AccountPart>
        ))
      )}
    </AccountSection>
  );
}

export async function AccountReviewsView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner, viewerId } = context;
  const filters = parseReviewFilters(query);
  const mediaType = await resolveVitrin(query);
  const result = await getReviewsPage({
    accountId: account.id,
    client,
    filters,
    mediaType,
    viewerId,
  });
  const filtered = Boolean(filters.query) || filters.kind !== "all";
  const emptyMessage = filtered
    ? "No reviews match these filters"
    : isOwner
      ? "Your reviews and ratings show up here"
      : "No reviews yet";

  return (
    <ResultsView
      empty={
        result.items.length > 0
          ? null
          : { icon: "solar:pen-new-square-bold", message: emptyMessage }
      }
      paging={result}
      toolbar={
        result.total > 0 || filtered ? (
          <FilterBar
            fields={[
              { defaultValue: "all", key: "kind", options: REVIEW_KINDS },
              { defaultValue: "newest", key: "sort", options: REVIEW_SORTS },
            ]}
            searchPlaceholder="Search reviews"
          />
        ) : null
      }
    >
      <ReviewList
        isOwner={isOwner}
        reviews={result.items}
        signedIn={viewerId !== null}
        username={account.username}
      />
    </ResultsView>
  );
}
