import type { JSX } from "react";
import { LibraryView } from "@/features/profile/library/components/library-view";
import type { SearchParams } from "@/shared/http";

export default async function AccountLikesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <LibraryView kind="likes" query={query} username={username} />;
}
