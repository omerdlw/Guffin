import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Session } from "@/lib/db/client";
import { accountActivity, accounts, lists } from "@/lib/db/schema";
import {
  ACTIVITY_GROUPS,
  ACTIVITY_PAGE_SIZE,
  type ActivityGroup,
  type ActivityPage,
  type ActivityRow,
  toActivityItem,
} from "./activity";

const listOwners = alias(accounts, "list_owners");

const COLUMNS = {
  created_at: accountActivity.createdAt,
  id: accountActivity.id,
  list: {
    id: lists.id,
    owner: listOwners.username,
    slug: lists.slug,
    title: lists.title,
  },
  payload: accountActivity.payload,
  target: {
    id: accounts.id,
    display_name: accounts.displayName,
    username: sql<string>`${accounts.username}`,
  },
  tmdb_id: accountActivity.tmdbId,
  type: accountActivity.type,
};

export async function getActivityPage({
  account,
  group,
  offset = 0,
  session,
}: {
  account: { id: string; username: string };
  group: ActivityGroup;
  offset?: number;
  session: Session;
}): Promise<ActivityPage> {
  const types: readonly string[] = ACTIVITY_GROUPS[group].types;
  const rows = await session.db
    .select(COLUMNS)
    .from(accountActivity)
    .leftJoin(accounts, eq(accounts.id, accountActivity.targetAccountId))
    .leftJoin(lists, eq(lists.id, accountActivity.listId))
    .leftJoin(listOwners, eq(listOwners.id, lists.accountId))
    .where(
      and(
        eq(accountActivity.accountId, account.id),
        types.length > 0
          ? inArray(accountActivity.type, [...types])
          : undefined,
      ),
    )
    .orderBy(desc(accountActivity.createdAt), asc(accountActivity.id))
    .limit(ACTIVITY_PAGE_SIZE + 1)
    .offset(offset);

  const more = rows.length > ACTIVITY_PAGE_SIZE;
  return {
    items: (rows.slice(0, ACTIVITY_PAGE_SIZE) as ActivityRow[]).map((row) =>
      toActivityItem(row, account.username),
    ),
    next: more ? offset + ACTIVITY_PAGE_SIZE : null,
  };
}
