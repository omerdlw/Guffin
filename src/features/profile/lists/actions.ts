"use server";
import "server-only";

import { getViewerSession } from "@/features/auth/server";
import { isKeyOf, isUuid, readOffset } from "@/shared/http";
import { cleanTitleFilters } from "../filters";
import { loadProfile } from "../queries";
import {
  ENTRY_SORTS,
  type EntryFilters,
  LIST_SORTS,
  type ListEntriesPage,
  type ListSort,
  type ListsPage,
} from "./model";
import { getListEntries, getListsPage } from "./queries";

export async function loadListsPage({
  offset,
  query,
  sort,
  username,
}: {
  offset: number;
  query: string;
  sort: ListSort;
  username: string;
}): Promise<ListsPage> {
  const { account, session } = await loadProfile(username);
  return getListsPage({
    accountId: account.id,
    offset: readOffset(offset),
    query: String(query).slice(0, 100),
    session,
    sort: isKeyOf(LIST_SORTS, sort) ? sort : "updated",
  });
}

export async function loadListEntries({
  filters,
  listId,
  offset,
}: {
  filters: EntryFilters;
  listId: string;
  offset: number;
}): Promise<ListEntriesPage> {
  if (!isUuid(listId)) return { items: [], next: null };
  return getListEntries({
    filters: {
      ...cleanTitleFilters(filters),
      sort: isKeyOf(ENTRY_SORTS, filters.sort) ? filters.sort : "position",
    },
    listId,
    offset: readOffset(offset),
    session: await getViewerSession(),
  });
}
