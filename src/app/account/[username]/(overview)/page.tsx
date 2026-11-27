import type { JSX } from "react";
import { getProfileOverview } from "@/features/profile/overview/queries";
import { ProfileOverviewView } from "@/features/profile/overview/components/overview-view";
import { loadProfile } from "@/features/profile/queries";
import { getProfileNumbers } from "@/features/profile/stats";

export default async function AccountOverviewPage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<JSX.Element | null> {
  const { username } = await params;
  const { account, isOwner, session, viewerId, visible } =
    await loadProfile(username);
  if (!visible) return null;
  const [numbers, overview] = await Promise.all([
    getProfileNumbers({ accountId: account.id, session }),
    getProfileOverview({
      accountId: account.id,
      session,
      viewerId,
    }),
  ]);
  if (!numbers) return null;

  return (
    <ProfileOverviewView
      account={account}
      isOwner={isOwner}
      numbers={numbers}
      overview={overview}
      signedIn={viewerId !== null}
    />
  );
}
