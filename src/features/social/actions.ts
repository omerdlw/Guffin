"use server";
import "server-only";

import { ok as okResult, type Result } from "@omerdlw/base-framework/result";
import {
  report,
  toUserMessage,
  UserError,
} from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requireFollowTarget,
  runAccountAction,
} from "@/features/account/actions";
import { revalidateAccount } from "@/features/account/server";
import { fail, type MutationResult, ok } from "@/features/auth/mutation";
import { getOptionalUser } from "@/features/auth/server";
import { isMediaType } from "@/features/catalog/quality";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MediaType } from "@/lib/tmdb/shared";
import { isTmdbId } from "@/lib/tmdb/transport";
import { type Friend, type MovieSocialProof, toPerson } from "./social";

interface MovieProofRow {
  account_id: string;
  avatar_url: string | null;
  display_name: string | null;
  liked: boolean;
  rating: number | string | null;
  reviewed: boolean;
  total: number | string;
  username: string;
  watched: boolean;
  watchlisted: boolean;
}

const MOVIE_PROOF_LIMIT = 100;

function buildMovieSocialProof(
  rows: readonly MovieProofRow[],
): MovieSocialProof {
  const friends: Friend[] = rows.map((row) => {
    const rating = row.rating === null ? null : Number(row.rating);
    return {
      ...toPerson(row),
      liked: row.liked,
      rating: rating !== null && Number.isFinite(rating) ? rating : null,
      reviewed: row.reviewed,
      watched: row.watched,
      watchlisted: row.watchlisted && !row.watched,
    };
  });

  const rated = friends.flatMap((friend) =>
    friend.rating === null ? [] : [friend.rating],
  );

  return {
    averageRating:
      rated.length > 0
        ? rated.reduce((sum, rating) => sum + rating, 0) / rated.length
        : null,
    counts: {
      liked: friends.filter((friend) => friend.liked).length,
      ratings: rated.length,
      reviews: friends.filter((friend) => friend.reviewed).length,
      watched: friends.filter((friend) => friend.watched).length,
      watchlist: friends.filter((friend) => friend.watchlisted).length,
    },
    friends,
    total: Number(rows[0]?.total ?? 0),
  };
}

type FollowStatus = "accepted" | "pending";

async function readMovieSocialProof(
  client: SupabaseClient<Database>,
  tmdbId: number,
  mediaType: MediaType,
): Promise<MovieSocialProof> {
  const { data, error } = await client.rpc("get_media_social_proof", {
    p_limit: MOVIE_PROOF_LIMIT,
    p_media_type: mediaType,
    p_tmdb_id: tmdbId,
  });
  if (error) throw error;
  return buildMovieSocialProof(data ?? []);
}

export async function getMovieSocialProofAction(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<MutationResult<{ proof: MovieSocialProof | null }>> {
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType))
    return fail("Invalid title");

  try {
    const user = await getOptionalUser();
    if (!user) return ok({ proof: null });

    const client = await createServerSupabaseClient();
    return ok({ proof: await readMovieSocialProof(client, tmdbId, mediaType) });
  } catch (error) {
    report("Social proof read", error);
    return fail(
      toUserMessage(error, {
        fallback: "Could not load what your friends did",
      }),
    );
  }
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<FollowStatus>> {
  return runAccountAction(
    {
      code: "FOLLOW_FAILED",
      fallback: "Couldn't follow this account. Please try again",
      name: "AccountAction follow",
    },
    async () => {
      const user = await requireFollowTarget(followingId);
      const client = await createServerSupabaseClient();
      const { data: targets, error: targetError } = await client.rpc(
        "get_account_follow_target",
        { p_user_id: followingId },
      );
      if (targetError) throw targetError;
      if (!targets?.[0]) throw new UserError("Account not found");

      const status: FollowStatus = targets[0].is_private
        ? "pending"
        : "accepted";
      const { error } = await client
        .from("account_follows")
        .upsert(
          { follower_id: user.id, following_id: followingId, status },
          { onConflict: "follower_id,following_id" },
        );
      if (error) throw error;

      revalidateAccount(targetUsername);
      return okResult(status);
    },
  );
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<Result<null>> {
  return runAccountAction(
    {
      code: "UNFOLLOW_FAILED",
      fallback: "Couldn't unfollow this account. Please try again",
      name: "AccountAction unfollow",
    },
    async () => {
      const user = await requireFollowTarget(followingId);
      const client = await createServerSupabaseClient();
      const { error } = await client
        .from("account_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", followingId);
      if (error) throw error;

      revalidateAccount(targetUsername);
      return okResult(null);
    },
  );
}
