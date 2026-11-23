import type { JSX } from "react";
import {
  DIARY_PARAM,
  readDiaryMonth,
  shiftMonth,
} from "@/features/profile/diary/diary";
import { DiaryMonthView } from "@/features/profile/diary/month";
import { getDiaryMonth } from "@/features/profile/diary/server";
import { loadProfile } from "@/features/profile/server";
import type { SearchParams } from "@/infrastructure/http";
import { accountHref } from "@/shared/project";

export default async function AccountDiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  const { account, isOwner, session, visible } = await loadProfile(username);
  if (!visible) return null;
  const diary = await getDiaryMonth({
    accountId: account.id,
    month: readDiaryMonth(query),
    session,
  });

  const base = `${accountHref(account.username)}/diary`;
  const href = (month: string) => `${base}?${DIARY_PARAM}=${month}`;
  const joined = account.createdAt.slice(0, 7);
  const earliest = diary.first && diary.first < joined ? diary.first : joined;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const latest = diary.last && diary.last > thisMonth ? diary.last : thisMonth;
  const previous =
    diary.month > earliest ? href(shiftMonth(diary.month, -1)) : null;
  const next = diary.month < latest ? href(shiftMonth(diary.month, 1)) : null;

  const empty = diary.first
    ? "Nothing logged this month"
    : isOwner
      ? "Log a film from its page to start your diary"
      : "Nothing in the diary yet";

  return (
    <DiaryMonthView
      empty={empty}
      entries={diary.entries}
      isOwner={isOwner}
      month={diary.month}
      next={next}
      previous={previous}
      username={account.username}
    />
  );
}
