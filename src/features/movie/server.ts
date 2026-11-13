import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { getKnownFor } from "@/features/person/credits";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPersonDetails } from "@/lib/tmdb/server";
import type { MediaType } from "@/lib/tmdb/shared";
import {
  type FilmStats,
  type KnownForMap,
  MOVIE_FEATURED_PEOPLE,
  type PersonEntry,
} from "./movie";

const CAST_KNOWN_FOR = 4;

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

export async function getPeopleKnownFor(
  people: { cast: readonly PersonEntry[]; crew: readonly PersonEntry[] },
  skip: { id: number; mediaType: MediaType },
): Promise<KnownForMap> {
  const load = async (kind: "cast" | "crew") => {
    const featured = people[kind].slice(0, MOVIE_FEATURED_PEOPLE);
    const entries = await Promise.all(
      featured.map(async (person) => {
        const result = await getPersonDetails(person.id);
        if (!result.success) return [person.id, []] as const;
        return [
          person.id,
          getKnownFor(result.data, kind, skip, CAST_KNOWN_FOR),
        ] as const;
      }),
    );
    return Object.fromEntries(entries);
  };
  try {
    const [cast, crew] = await Promise.all([load("cast"), load("crew")]);
    return { cast, crew };
  } catch (error) {
    report("Cast known-for read", error);
    return { cast: {}, crew: {} };
  }
}
