import type { JSX } from "react";
import { AccountDiaryView } from "@/features/profile/diary/view";
import type { SearchParams } from "@/lib/http";

export default async function AccountDiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountDiaryView query={query} username={username} />;
}
