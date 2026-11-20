import type { JSX } from "react";
import type { SearchParams } from "@/lib/http";
import { accountHref } from "@/lib/project";
import {
  isNarrowed,
  readSort,
  readTitleFilters,
  titleFields,
} from "../filters";
import { loadProfile } from "../server";
import { ListsToolbar } from "../toolbar";
import {
  LIBRARY_COPY,
  LIBRARY_SORTS,
  type LibraryKind,
  WATCHED_SORTS,
} from "./library";
import { getLibraryFacets, getLibraryPage } from "./server";
import { LibraryShelf } from "./shelf";

export async function LibraryView({
  kind,
  query,
  username,
}: {
  kind: LibraryKind;
  query: SearchParams;
  username: string;
}): Promise<JSX.Element | null> {
  const { account, isOwner, session, visible } = await loadProfile(username);
  if (!visible) return null;
  const filters = {
    ...readTitleFilters(query),
    sort: readSort(query, LIBRARY_SORTS, "added_desc"),
  };
  const shelf = { accountId: account.id, kind, session };
  const [facets, page] = await Promise.all([
    getLibraryFacets(shelf),
    getLibraryPage({ ...shelf, filters }),
  ]);
  const copy = LIBRARY_COPY[kind];
  const noun = "films";

  return (
    <section className="flex flex-col gap-fib-5" data-section={kind}>
      {facets ? (
        <ListsToolbar
          base={`${accountHref(account.username)}/${kind}`}
          fields={titleFields({
            facets,
            fallback: "added_desc",
            filters,
            sort: filters.sort,
            sorts: kind === "watched" ? WATCHED_SORTS : LIBRARY_SORTS,
          })}
          label={`Search ${noun}`}
          placeholder={`Search ${noun}`}
          query={filters.query}
        />
      ) : null}
      <LibraryShelf
        empty={
          isNarrowed(filters)
            ? filters.query
              ? `No ${noun} match “${filters.query}”`
              : `No ${noun} match these filters`
            : isOwner
              ? copy.own
              : copy.empty
        }
        filters={filters}
        isOwner={isOwner}
        kind={kind}
        page={page}
        username={account.username}
      />
    </section>
  );
}
