import type { JSX } from "react";
import { AccountOverviewView } from "@/features/profile/overview/view";
import type { SearchParams } from "@/lib/http";

export default async function AccountOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountOverviewView query={query} username={username} />;
}
