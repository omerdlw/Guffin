import type { JSX } from "react";
import {
  ACTIVITY_GROUPS,
  readActivityGroup,
} from "@/features/profile/activity/activity";
import { ActivityCalendar } from "@/features/profile/activity/calendar";
import { ActivityFilters } from "@/features/profile/activity/filters";
import { getActivityPage } from "@/features/profile/activity/server";
import { ActivityTimeline } from "@/features/profile/activity/timeline";
import { loadProfile } from "@/features/profile/server";
import { getProfileNumbers } from "@/features/profile/stats";
import type { SearchParams } from "@/infrastructure/http";
import { accountHref } from "@/shared/project";

export default async function AccountActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, isOwner, session, visible } = await loadProfile(username);
  if (!visible) return null;
  const group = readActivityGroup(query);
  const [numbers, page] = await Promise.all([
    getProfileNumbers({ accountId: account.id, session }),
    getActivityPage({ account, group, session }),
  ]);
  if (!numbers) return null;

  const actor = {
    displayName: isOwner ? "You" : account.displayName || account.username,
    username: account.username,
  };

  return (
    <>
      <ActivityCalendar days={numbers.activity} />
      <ActivityFilters
        base={`${accountHref(account.username)}/activity`}
        group={group}
      />
      {page.items.length > 0 ? (
        <ActivityTimeline actor={actor} group={group} page={page} />
      ) : (
        <p className="py-fib-6 text-center type-body text-ink-muted">
          {group !== "all"
            ? `No ${ACTIVITY_GROUPS[group].label.toLowerCase()} activity yet`
            : isOwner
              ? "What you do on Guffin shows up here"
              : "No activity yet"}
        </p>
      )}
    </>
  );
}
