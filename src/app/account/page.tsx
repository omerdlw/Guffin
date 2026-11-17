import type { Metadata } from "next";
import type { JSX } from "react";
import { redirect } from "next/navigation";
import {
  CONTAINER_CLASS,
  PAGE_CLASS,
  PROSE_CLASS,
} from "@/design/foundations/layout";
import { TONE } from "@/design/foundations/tones";
import { cn } from "@/design/ui";
import { getCurrentAccount } from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import { accountHref } from "@/lib/project";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

// Signed out, the dock opens the sign-in card; the page says what it is for so
// the card does not sit alone on an empty screen.
function SignedOut(): JSX.Element {
  return (
    <main className={cn("ui-scene", PAGE_CLASS)}>
      <div className={cn(CONTAINER_CLASS, "pt-24 sm:pt-28 lg:pt-32")}>
        <p className={cn(TONE.label, "text-ink-muted")}>Account</p>
        <h1 className="mt-6 font-zuume type-display-lg leading-none font-bold text-balance text-ink uppercase sm:type-display-xl">
          Sign in to Guffin
        </h1>
        <p className={cn(PROSE_CLASS, "mt-6 max-w-[52ch] text-ink-body")}>
          Keep a diary of what you watch, rate and review it, build lists and
          follow the people whose taste you trust.
        </p>
      </div>
    </main>
  );
}

export default async function AccountEntryPage(): Promise<JSX.Element> {
  const user = await getOptionalUser();
  if (!user) return <SignedOut />;

  const client = await createServerSupabaseClient();
  const { account } = await getCurrentAccount({ client, userId: user.id });

  if (!account?.username) redirect("/?reason=account-incomplete");
  redirect(accountHref(account.username));
}
