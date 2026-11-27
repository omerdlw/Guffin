import type { JSX } from "react";
import { notFound } from "next/navigation";
import {
  ListComments,
  ListDock,
  ListEntries,
  ListHeader,
} from "@/features/profile/lists/components/list-detail";
import {
  isNarrowed,
  readSort,
  readTitleFilters,
  titleFields,
} from "@/features/profile/filters";
import { ENTRY_SORTS } from "@/features/profile/lists/model";
import {
  getListComments,
  getListDetail,
  getListEntries,
  getListFacets,
} from "@/features/profile/lists/queries";
import { ListsToolbar } from "@/features/profile/components/toolbar";
import { loadProfile } from "@/features/profile/queries";
import type { SearchParams } from "@/shared/http";
import { listHref } from "@/shared/site";

export default async function AccountListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ slug, username }, search] = await Promise.all([
    params,
    searchParams,
  ]);
  const filters = {
    ...readTitleFilters(search),
    sort: readSort(search, ENTRY_SORTS, "position"),
  };
  const text = filters.query;
  const { account, isOwner, session, viewerId, visible } =
    await loadProfile(username);
  if (!visible) return null;
  let handle: string;
  try {
    handle = decodeURIComponent(slug);
  } catch {
    notFound();
  }
  const list = await getListDetail({
    accountId: account.id,
    session,
    slug: handle,
    viewerId,
  });
  if (!list) notFound();
  const [entries, facets, { comments, own }] = await Promise.all([
    getListEntries({ filters, listId: list.id, session }),
    getListFacets({ listId: list.id, session }),
    getListComments({ listId: list.id, session, viewerId }),
  ]);
  const narrowed = isNarrowed(filters);

  const noun = "films";

  return (
    <section className="flex flex-col gap-fib-6" data-section="list">
      <ListDock
        comment={own}
        isOwner={isOwner}
        list={list}
        signedIn={viewerId !== null}
        username={account.username}
      />
      <ListHeader list={list} username={account.username} />
      <div className="flex flex-col gap-fib-5">
        {list.itemsCount > 0 ? (
          <ListsToolbar
            base={listHref(account.username, list.slug)}
            fields={titleFields({
              facets,
              fallback: "position",
              filters,
              sort: filters.sort,
              sorts: ENTRY_SORTS,
            })}
            label={`Search ${list.title}`}
            placeholder="Search this list"
            query={text}
          />
        ) : null}
        <ListEntries
          empty={
            narrowed
              ? text
                ? `No ${noun} match “${text}”`
                : `No ${noun} match these filters`
              : isOwner
                ? "Add films from any film page with “Add to list”"
                : "This list is empty"
          }
          filters={filters}
          list={list}
          page={entries}
        />
      </div>
      <ListComments
        comments={comments}
        list={list}
        total={Math.max(list.reviewsCount, comments.length)}
        viewerId={viewerId}
      />
    </section>
  );
}
