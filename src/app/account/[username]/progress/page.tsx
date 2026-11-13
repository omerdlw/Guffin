import type { JSX } from "react";
import { notFound, redirect } from "next/navigation";
import { resolveVitrin } from "@/features/media/server";
import { AccountProgressView } from "@/features/profile/progress/view";
import { TV_ENABLED } from "@/lib/env";
import type { SearchParams } from "@/lib/http";
import { accountHref } from "@/lib/project";

export default async function AccountProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element | null> {
  if (!TV_ENABLED) notFound();
  const [{ username }, query] = await Promise.all([params, searchParams]);
  if ((await resolveVitrin(query)) !== "tv") redirect(accountHref(username));
  return <AccountProgressView query={query} username={username} />;
}
