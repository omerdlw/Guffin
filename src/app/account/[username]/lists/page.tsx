import type { JSX } from "react";
import { AccountListsView } from "@/features/profile/view";
import type { SearchParams } from "@/lib/http";

export default async function AccountListsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountListsView query={query} username={username} />;
}
