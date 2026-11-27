"use server";
import "server-only";

import { cleanTitleFilters } from "../filters";
import { loadProfile } from "../queries";
import {
  LIBRARY_SORTS,
  type LibraryFilters,
  type LibraryKind,
  type LibraryPage,
} from "./model";
import { getLibraryPage } from "./queries";

const KINDS: readonly LibraryKind[] = ["likes", "watched", "watchlist"];

export async function loadLibraryPage({
  filters,
  kind,
  offset,
  username,
}: {
  filters: LibraryFilters;
  kind: LibraryKind;
  offset: number;
  username: string;
}): Promise<LibraryPage> {
  if (!KINDS.includes(kind)) return { items: [], next: null };
  const { account, session } = await loadProfile(username);
  return getLibraryPage({
    accountId: account.id,
    filters: {
      ...cleanTitleFilters(filters),
      sort: filters.sort in LIBRARY_SORTS ? filters.sort : "added_desc",
    },
    kind,
    offset: Math.max(0, Math.floor(offset) || 0),
    session,
  });
}
