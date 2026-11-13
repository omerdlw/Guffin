import type { JSX } from "react";
import { AccountActivityView } from "@/features/profile/activity/view";
import type { SearchParams } from "@/lib/http";

export default async function AccountActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountActivityView query={query} username={username} />;
}
