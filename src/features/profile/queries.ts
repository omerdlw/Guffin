import "server-only";

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { PublicAccount } from "@/features/account/model";
import { getPublicAccount } from "@/features/account/queries";
import { getOptionalUser } from "@/features/auth/server";
import { type Session, viewer } from "@/infrastructure/db/client";
import { accountStats } from "@/infrastructure/db/schema";

interface ProfileContext {
  account: PublicAccount;
  isOwner: boolean;
  session: Session;
  viewerId: string | null;
  visible: boolean;
}

export const loadProfile = cache(
  async (username: string): Promise<ProfileContext> => {
    let handle: string;
    try {
      handle = decodeURIComponent(username);
    } catch {
      notFound();
    }
    const user = await getOptionalUser();
    const session = viewer(user?.id ?? null);
    const account = await getPublicAccount({ session, username: handle });
    if (!account) notFound();
    const [stats] = await session.db
      .select({ id: accountStats.accountId })
      .from(accountStats)
      .where(eq(accountStats.accountId, account.id));
    return {
      account,
      isOwner: user?.id === account.id,
      session,
      viewerId: user?.id ?? null,
      visible: Boolean(stats),
    };
  },
);
