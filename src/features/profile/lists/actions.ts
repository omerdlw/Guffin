"use server";
import "server-only";

import { getViewerSession } from "@/features/auth/server";
import { isUuid } from "@/lib/http";
import { cleanTitleFilters } from "../filters";
import { loadProfile } from "../server";
import {
  ENTRY_SORTS,
  type EntryFilters,
  LIST_SORTS,
  type ListEntriesPage,
  type ListSort,
  type ListsPage,
} from "./lists";
import { getListEntries, getListsPage } from "./server";

const toOffset = (offset: number) => Math.max(0, Math.floor(offset) || 0);

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
    offset: toOffset(offset),
    query: String(query).slice(0, 100),
    session,
    sort: sort in LIST_SORTS ? sort : "updated",
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
      sort: filters.sort in ENTRY_SORTS ? filters.sort : "position",
    },
    listId,
    offset: toOffset(offset),
    session: await getViewerSession(),
  });
}
