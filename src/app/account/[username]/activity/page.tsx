import type { JSX } from "react";
import { ActivityCalendar } from "@/features/profile/activity/components/activity-calendar";
import { ActivityFilters } from "@/features/profile/activity/components/activity-filters";
import { ActivityTimeline } from "@/features/profile/activity/components/activity-timeline";
import {
  ACTIVITY_GROUPS,
  readActivityGroup,
} from "@/features/profile/activity/model";
import { getActivityPage } from "@/features/profile/activity/queries";
import { loadProfile } from "@/features/profile/queries";
import { getProfileNumbers } from "@/features/profile/stats";
import type { SearchParams } from "@/shared/http";
import { accountHref } from "@/shared/site";

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
