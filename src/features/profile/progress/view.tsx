import type { JSX } from "react";
import { Icon } from "@/design/components/icon";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { EmptyState } from "@/features/profile/blocks";
import { AccountPart, AccountSection } from "@/features/profile/motion";
import type { AccountViewProps } from "@/features/profile/profile";
import { ShowProgressGrid } from "@/features/tv/progress";
import { SHOW_STATUS_ICONS, SHOW_STATUS_LABELS } from "@/features/tv/show";
import { getTrackedShows } from "./server";

const PROGRESS_SECTION_LIMIT = 60;

const PROGRESS_ORDER = ["watching", "paused", "completed", "dropped"] as const;

export async function AccountProgressView({
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const sections = await Promise.all(
    PROGRESS_ORDER.map(async (status) => ({
      shows: await getTrackedShows({
        accountId: account.id,
        client,
        limit: PROGRESS_SECTION_LIMIT,
        statuses: [status],
      }),
      status,
    })),
  );
  const filled = sections.filter((section) => section.shows.length > 0);

  return (
    <AccountSection
      as="div"
      className="flex w-full flex-col gap-fib-5"
      cue="shelf"
      now
    >
      {filled.length === 0 ? (
        <AccountPart name="row">
          <EmptyState icon={SHOW_STATUS_ICONS.watching}>
            {isOwner
              ? "Start a show and your progress lands here"
              : "No shows tracked yet"}
          </EmptyState>
        </AccountPart>
      ) : (
        filled.map(({ shows, status }) => (
          <AccountPart
            className="flex flex-col gap-fib-3"
            key={status}
            name="row"
          >
            <h2 className="flex items-center gap-2 type-label font-semibold tracking-label text-ink-muted uppercase">
              <Icon icon={SHOW_STATUS_ICONS[status]} size={14} />
              {SHOW_STATUS_LABELS[status]}
              <span className="tabular-nums">{shows.length}</span>
            </h2>
            <ShowProgressGrid shows={shows} />
          </AccountPart>
        ))
      )}
    </AccountSection>
  );
}
