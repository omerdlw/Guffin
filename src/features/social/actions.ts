"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOptionalUser } from "@/features/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/tmdb/api";
import { MOVIE_PROOF_LIMIT } from "./constants";
import type { MovieSocialProof, SocialResult } from "./types";
import { buildMovieSocialProof } from "./utils";

async function readMovieSocialProof(
  client: SupabaseClient<Database>,
  tmdbId: number,
): Promise<MovieSocialProof> {
  const { data, error } = await client.rpc("get_movie_social_proof", {
    p_limit: MOVIE_PROOF_LIMIT,
    p_tmdb_id: tmdbId,
  });
  if (error) throw error;
  return buildMovieSocialProof(data ?? []);
}

export async function getMovieSocialProofAction(
  tmdbId: number,
): Promise<SocialResult<{ proof: MovieSocialProof | null }>> {
  if (!isTmdbId(tmdbId)) return { error: "Invalid movie", success: false };

  try {
    const user = await getOptionalUser();
    if (!user) return { proof: null, success: true };

    const client = await createServerSupabaseClient();
    return { proof: await readMovieSocialProof(client, tmdbId), success: true };
  } catch (error) {
    report("Social proof read", error);
    return {
      error: toUserMessage(error, {
        fallback: "Could not load what your friends did",
      }),
      success: false,
    };
  }
}
