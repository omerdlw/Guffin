import type { JSX } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import { viewer } from "@/infrastructure/db/client";
import { accountHref } from "@/shared/project";

export const metadata: Metadata = { title: "Account" };

const EMPTY = <main id="main" className="min-h-screen" />;

export default async function AccountEntryPage(): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (!user) return EMPTY;

  const { account } = await getCurrentAccount({
    session: viewer(user.id),
    userId: user.id,
  });

  if (!account?.username) return EMPTY;
  redirect(accountHref(account.username));
}
