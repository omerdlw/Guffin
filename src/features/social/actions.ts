"use server";
import "server-only";

import { UserError } from "@omerdlw/base-framework/utils";
import { and, eq } from "drizzle-orm";
import { revalidateAccount } from "@/features/account/queries";
import { fail, type ActionResult, ok } from "@/shared/result";
import { mutate, query } from "@/features/auth/server";
import { type Session } from "@/infrastructure/db/client";
import { accountFollows } from "@/infrastructure/db/schema";
import { isTmdbId } from "@/infrastructure/tmdb/transport";
import { type Friend, type MovieSocialProof, toPerson } from "./model";

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
  session: Session,
  tmdbId: number,
): Promise<MovieSocialProof> {
  const data = await session.call("get_movie_social_proof", {
    p_limit: MOVIE_PROOF_LIMIT,
    p_tmdb_id: tmdbId,
  });
  return buildMovieSocialProof(data);
}

export async function getMovieSocialProofAction(
  tmdbId: number,
): Promise<ActionResult<{ proof: MovieSocialProof | null }>> {
  if (!isTmdbId(tmdbId)) return fail("Invalid title");

  return query(
    {
      fallback: "Could not load what your friends did",
      name: "Social proof read",
    },
    async ({ session, userId }) =>
      ok({
        proof: userId ? await readMovieSocialProof(session, tmdbId) : null,
      }),
  );
}

function assertFollowTarget(followingId: string, userId: string) {
  if (
    typeof followingId !== "string" ||
    !followingId ||
    followingId === userId
  ) {
    throw new UserError("Invalid follow target");
  }
}

export async function followUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<ActionResult<{ status: FollowStatus }>> {
  return mutate(
    {
      fallback: "Couldn't follow this account. Please try again",
      name: "Follow",
      scope: "follow-change",
    },
    async ({ session, userId }) => {
      assertFollowTarget(followingId, userId);
      const targets = await session.call("get_account_follow_target", {
        p_user_id: followingId,
      });
      if (!targets[0]) throw new UserError("Account not found");

      const status: FollowStatus = targets[0].is_private
        ? "pending"
        : "accepted";
      await session.db
        .insert(accountFollows)
        .values({ followerId: userId, followingId, status })
        .onConflictDoUpdate({
          set: { status },
          target: [accountFollows.followerId, accountFollows.followingId],
        });

      revalidateAccount(targetUsername);
      return ok({ status });
    },
  );
}

export async function unfollowUserAction(
  followingId: string,
  targetUsername?: string,
): Promise<ActionResult<{ status: null }>> {
  return mutate(
    {
      fallback: "Couldn't unfollow this account. Please try again",
      name: "Unfollow",
      scope: "follow-change",
    },
    async ({ session, userId }) => {
      assertFollowTarget(followingId, userId);
      await session.db
        .delete(accountFollows)
        .where(
          and(
            eq(accountFollows.followerId, userId),
            eq(accountFollows.followingId, followingId),
          ),
        );

      revalidateAccount(targetUsername);
      return ok({ status: null });
    },
  );
}
