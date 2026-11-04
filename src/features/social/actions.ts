"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOptionalUser } from "@/features/auth/server";
import type { MutationResult } from "@/features/auth/types";
import { fail, ok } from "@/features/auth/utils";
import type { Database } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isTmdbId } from "@/lib/tmdb/api";
import { MOVIE_PROOF_LIMIT } from "./constants";
import type { MovieSocialProof } from "./types";
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
): Promise<MutationResult<{ proof: MovieSocialProof | null }>> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");

  try {
    const user = await getOptionalUser();
    if (!user) return ok({ proof: null });

    const client = await createServerSupabaseClient();
    return ok({ proof: await readMovieSocialProof(client, tmdbId) });
  } catch (error) {
    report("Social proof read", error);
    return fail(
      toUserMessage(error, {
        fallback: "Could not load what your friends did",
      }),
    );
  }
}
