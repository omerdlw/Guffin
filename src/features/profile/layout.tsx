import type { JSX, ReactNode } from "react";
import { resolveVitrin } from "@/features/media/server";
import { FollowedBy } from "@/features/social/proof";
import { TV_ENABLED } from "@/lib/env";
import { accountHref } from "@/lib/project";
import {
  getAccountAmbientPalette,
  getAccountHeader,
  getAccountPageContext,
} from "./access";
import { ProfileStats } from "./blocks";
import { AccountShell } from "./shell";

export async function AccountProfileLayout({
  children,
  username,
}: {
  children: ReactNode;
  username: string;
}): Promise<JSX.Element> {
  const { account, client, isOwner } = await getAccountPageContext(username);

  const [header, palette, rememberedVitrin] = await Promise.all([
    getAccountHeader({ accountId: account.id, client }),
    getAccountAmbientPalette(account.backgroundUrl || account.avatarUrl),
    resolveVitrin(undefined),
  ]);
  const { library, mutual } = header;
  const base = accountHref(account.username);

  return (
    <AccountShell
      account={account}
      rememberedVitrin={rememberedVitrin}
      followersCount={header.followersCount}
      followingCount={header.followingCount}
      initialFollowStatus={header.followStatus}
      isFollower={header.followStatus === "accepted"}
      isOwner={isOwner}
      palette={palette}
      proofSlot={mutual ? <FollowedBy mutual={mutual} /> : null}
      statsSlot={
        library ? (
          <ProfileStats
            stats={[
              {
                count: library.watched,
                href: `${base}/watched?v=movie`,
                label: "Films",
              },
              ...(TV_ENABLED
                ? [
                    {
                      count: library.shows,
                      href: `${base}/watched?v=tv`,
                      label: "Shows",
                    },
                  ]
                : []),
              {
                count: library.thisYear,
                href: `${base}/diary`,
                label: "This year",
              },
              {
                count: library.lists,
                href: `${base}/lists`,
                label: "Lists",
              },
            ]}
          />
        ) : null
      }
    >
      {children}
    </AccountShell>
  );
}
