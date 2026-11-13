import type { JSX } from "react";
import { resolveVitrin } from "@/features/media/server";
import { getUnlockedAccountContext } from "@/features/profile/access";
import { ResultsView } from "@/features/profile/blocks";
import { type AccountViewProps, shiftMonth } from "@/features/profile/profile";
import { readParam, type SearchParams } from "@/lib/http";
import { accountHref } from "@/lib/project";
import { DiaryChrome, DiaryMonthView } from "./month";
import { getDiaryMonth } from "./server";

const VIEW_MONTH_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function readMonth(params: SearchParams | undefined): string | null {
  const value = readParam(params, "month");
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : null;
}

export async function AccountDiaryView({
  query,
  username,
}: AccountViewProps): Promise<JSX.Element | null> {
  const context = await getUnlockedAccountContext(username);
  if (!context) return null;
  const { account, client, isOwner } = context;
  const mediaType = await resolveVitrin(query);
  const diary = await getDiaryMonth({
    accountId: account.id,
    client,
    mediaType,
    month: readMonth(query),
  });

  const base = accountHref(account.username);
  const href = (month: string) =>
    `${base}/diary?month=${month}${mediaType === "tv" ? "&v=tv" : ""}`;
  const hasPrevious = diary.first !== null && diary.month > diary.first;
  const hasNext = diary.last !== null && diary.month < diary.last;

  const emptyMessage = diary.first
    ? "No diary entries in this month"
    : isOwner
      ? mediaType === "tv"
        ? "Episodes you log show up in your activity"
        : "Use “Log to diary” on a movie page to start your diary"
      : "Nothing in the diary yet";

  return (
    <ResultsView
      empty={
        diary.rows.length > 0
          ? null
          : { icon: "solar:calendar-mark-bold", message: emptyMessage }
      }
      toolbar={
        diary.first ? (
          <DiaryChrome
            label={VIEW_MONTH_FORMAT.format(
              new Date(`${diary.month}-01T00:00:00Z`),
            )}
            latest={
              diary.last && diary.month !== diary.last ? href(diary.last) : null
            }
            next={hasNext ? href(shiftMonth(diary.month, 1)) : null}
            previous={hasPrevious ? href(shiftMonth(diary.month, -1)) : null}
          />
        ) : null
      }
    >
      <DiaryMonthView
        isOwner={isOwner}
        month={diary.month}
        rows={diary.rows}
        username={account.username}
      />
    </ResultsView>
  );
}
