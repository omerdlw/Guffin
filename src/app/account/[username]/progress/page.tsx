import type { JSX } from "react";
import { notFound } from "next/navigation";
import { AccountProgressView } from "@/features/profile/view";
import { TV_ENABLED } from "@/lib/env";
import type { SearchParams } from "@/lib/http";

export default async function AccountProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  if (!TV_ENABLED) notFound();
  const [{ username }, query] = await Promise.all([params, searchParams]);
  return <AccountProgressView query={query} username={username} />;
}
