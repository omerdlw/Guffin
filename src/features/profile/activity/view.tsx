import type { JSX } from "react";
import { resolveVitrin } from "@/features/media/server";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { EmptyState } from "@/features/profile/blocks";
import { Pagination } from "@/features/profile/controls";
import { FilterBar } from "@/features/profile/filter-bar";
import { parseActivityFilters } from "@/features/profile/params";
import {
  type AccountViewProps,
  ACTIVITY_GROUPS,
  ACTIVITY_SORTS,
} from "@/features/profile/profile";
import { AccountPage } from "@/features/profile/shell";
import { ActivityChrome, ActivityRhythm, ActivityTimeline } from "./feed";
import { getActivityPage, getActivitySummary } from "./server";

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
