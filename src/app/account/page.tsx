import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAccount } from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import { accountHref } from "@/lib/project";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountEntryPage(): Promise<null> {
  const user = await getOptionalUser();
  if (!user) return null;

  const client = await createServerSupabaseClient();
  const { account } = await getCurrentAccount({ client, userId: user.id });

  if (!account?.username) redirect("/?reason=account-incomplete");
  redirect(accountHref(account.username));
}
