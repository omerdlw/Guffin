import type { JSX } from "react";
import { AccountPage } from "../components/view";
import { notFound } from "next/navigation";
import {
  LIST_ITEM_SORTS,
  MEDIA_PAGE_SIZE,
  hasMediaFilters,
  parseListItemFilters,
  type AccountViewProps,
  MEDIA_FILTERS,
} from "../browse";
import { AccountLink } from "../components/link";
import { FilterBar } from "../components/filter-bar";
import { ListComments } from "../components/list-comments";
import { ListChrome } from "../components/list-chrome";
import { Pagination } from "../components/pagination";
import { PosterGrid } from "../components/poster-grid";
import { EmptyState } from "../components/empty-state";
import { Section, counted } from "../components/section";
import { formatShortDate } from "../dates";
import { Icon } from "@/ui";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import { getListPage } from "../server/browse";
import { getAccountPageContext } from "../server/context";
import { accountHref } from "@/config/routes";

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
                counted(list.itemsCount, "film"),
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

        <Section summary={counted(commentCount, "comment")} title="Comments">
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
