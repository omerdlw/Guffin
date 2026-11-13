import "server-only";

import { cache } from "react";
import {
  AmbientDecoderMissingError,
  type AmbientPalette,
  extractAmbientPalette,
} from "@omerdlw/base-framework/ambient/server";
import { report } from "@omerdlw/base-framework/utils";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { PublicAccount } from "@/features/account/account";
import { getPublicAccount } from "@/features/account/server";
import { getOptionalUser } from "@/features/auth/server";
import { type MutualFollowers, toPerson } from "@/features/social/social";
import { isPublicHttps, pinnedFetch } from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileClient } from "./profile";

interface AccountPageContext {
  account: PublicAccount;
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  isOwner: boolean;
  locked: boolean;
  viewerId: string | null;
}

interface AccountHeader {
  followersCount: number;
  followingCount: number;
  followStatus: string | null;
  library: {
    lists: number;
    reviews: number;
    shows: number;
    thisYear: number;
    watched: number;
  } | null;
  mutual: MutualFollowers | null;
}

interface HeaderRow {
  follow_status: string | null;
  followers_count: number;
  following_count: number;
  library: {
    lists: number;
    reviews: number;
    shows?: number;
    this_year: number;
    watched: number;
  } | null;
  mutual: {
    people: {
      account_id: string;
      avatar_url: string | null;
      display_name: string | null;
      username: string;
    }[];
    total: number;
  } | null;
}

const PALETTE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

const EMPTY_HEADER: AccountHeader = {
  followersCount: 0,
  followingCount: 0,
  followStatus: null,
  library: null,
  mutual: null,
};

const PALETTE_VERSION = "account-ambient";

const PALETTE_TIMEOUT_MS = 3_000;

const PALETTE_MAX_BYTES = 8 * 1024 * 1024;

const TMDB_IMAGE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)[^/]+(\/[^/]+)$/i;

const PALETTE_BUDGET_MS = 600;

async function isAcceptedFollower(
  client: ProfileClient,
  targetId: string,
  viewerId?: string,
): Promise<boolean> {
  if (!viewerId || viewerId === targetId) return false;

  const { data } = await client
    .from("account_follows")
    .select("status")
    .eq("follower_id", viewerId)
    .eq("following_id", targetId)
    .maybeSingle();
  return data?.status === "accepted";
}

const readViewer = cache(getOptionalUser);

const readAccountAndViewer = cache(async (username: string) => {
  const client = await createServerSupabaseClient();
  const [account, viewer] = await Promise.all([
    getPublicAccount({ client, username }),
    readViewer(),
  ]);
  return { account, client, viewer };
});

const readFollowerStatus = cache(isAcceptedFollower);

export async function getAccountPageContext(
  username: string,
): Promise<AccountPageContext> {
  let handle: string;
  try {
    handle = decodeURIComponent(username);
  } catch {
    notFound();
  }

  const { account, client, viewer } = await readAccountAndViewer(handle);
  if (!account) notFound();

  const isOwner = viewer?.id === account.id;
  const locked =
    account.isPrivate &&
    !isOwner &&
    !(await readFollowerStatus(client, account.id, viewer?.id));

  return {
    account,
    client,
    isOwner,
    locked,
    viewerId: viewer?.id ?? null,
  };
}

export async function getUnlockedAccountContext(
  username: string,
): Promise<AccountPageContext | null> {
  const context = await getAccountPageContext(username);
  return context.locked ? null : context;
}

export async function getAccountHeader({
  accountId,
  client,
}: {
  accountId: string;
  client: ProfileClient;
}): Promise<AccountHeader> {
  const { data, error } = await client.rpc("get_account_header", {
    p_account_id: accountId,
  });
  if (error) {
    report("Account header read", error);
    return EMPTY_HEADER;
  }

  const row = data as unknown as HeaderRow | null;
  if (!row) return EMPTY_HEADER;

  return {
    followersCount: row.followers_count,
    followingCount: row.following_count,
    followStatus: row.follow_status,
    library: row.library && {
      lists: row.library.lists,
      reviews: row.library.reviews,
      shows: row.library.shows ?? 0,
      thisYear: row.library.this_year,
      watched: row.library.watched,
    },
    mutual: row.mutual && {
      people: row.mutual.people.map(toPerson),
      total: row.mutual.total,
    },
  };
}

class NoPalette extends Error {}

const readPalette = unstable_cache(
  async (url: string): Promise<AmbientPalette> => {
    const palette = await extractAmbientPalette(url, {
      allow: isPublicHttps,
      fetch: pinnedFetch,
      maxBytes: PALETTE_MAX_BYTES,
      timeoutMs: PALETTE_TIMEOUT_MS,
    });
    if (!palette) throw new NoPalette(url);
    return palette;
  },
  [PALETTE_VERSION],
  { revalidate: PALETTE_REVALIDATE_SECONDS },
);

export async function getAccountAmbientPalette(
  url: string | null | undefined,
): Promise<AmbientPalette | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;

  const reading = readPalette(url.replace(TMDB_IMAGE, "$1w300$2")).then(
    (palette): AmbientPalette => ({ ...palette, source: url }),
    (error) => {
      if (error instanceof AmbientDecoderMissingError) report("Ambient", error);
      return null;
    },
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<"late">((resolve) => {
    timer = setTimeout(resolve, PALETTE_BUDGET_MS, "late");
  });
  const palette = await Promise.race([reading, late]);
  clearTimeout(timer);

  if (palette !== "late") return palette;
  after(() => reading);
  return null;
}
