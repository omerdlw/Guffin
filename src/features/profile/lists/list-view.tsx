import type { JSX } from "react";
import { notFound } from "next/navigation";
import { Icon } from "@/design/components/icon";
import { DockLink } from "@/design/components/link";
import { formatShortDate } from "@/features/account/account";
import { mediaNoun } from "@/features/media/vitrin";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { EmptyState, PosterGrid, Section } from "@/features/profile/blocks";
import { Pagination } from "@/features/profile/controls";
import { FilterBar } from "@/features/profile/filter-bar";
import { parseListItemFilters } from "@/features/profile/params";
import {
  type AccountViewProps,
  hasMediaFilters,
  LIST_ITEM_SORTS,
  type ListPageData,
  MEDIA_FILTERS,
  MEDIA_PAGE_SIZE,
} from "@/features/profile/profile";
import { AccountPage } from "@/features/profile/shell";
import { pluralize } from "@/lib/format";
import { accountHref } from "@/lib/project";
import { tmdbImageUrl } from "@/lib/tmdb/shared";
import { ListChrome, ListComments } from "./lists";
import { getListPage } from "./server";

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
