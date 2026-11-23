import type { JSX } from "react";
import { LibraryView } from "@/features/profile/library/view";
import type { SearchParams } from "@/infrastructure/http";

export default async function AccountWatchedPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <LibraryView kind="watched" query={query} username={username} />;
}
