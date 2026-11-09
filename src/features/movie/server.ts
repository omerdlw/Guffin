import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import type { MediaType } from "@/features/catalog/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FilmStats } from "./types";

export async function getFilmStats(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<FilmStats | null> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("media_stats")
      .select(
        "watched_count, liked_count, listed_count, watchlist_count, reviews_count, ratings",
      )
      .eq("media_type", mediaType)
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      liked: data.liked_count,
      listed: data.listed_count,
      ratings: data.ratings,
      reviews: data.reviews_count,
      watched: data.watched_count,
      watchlist: data.watchlist_count,
    };
  } catch (error) {
    report("Film stats read", error);
    return null;
  }
}
