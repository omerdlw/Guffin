"use server";
import "server-only";

import { isKeyOf, readOffset } from "@/shared/http";
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
      sort: isKeyOf(LIBRARY_SORTS, filters.sort) ? filters.sort : "added_desc",
    },
    kind,
    offset: readOffset(offset),
    session,
  });
}
