import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { and, eq } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { getViewerSession } from "@/features/auth/server";
import { getKnownFor } from "@/features/person/credits";
import { mediaStats } from "@/lib/db/schema";
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
    const { db } = await getViewerSession();
    const [data] = await db
      .select({
        liked: mediaStats.likedCount,
        listed: mediaStats.listedCount,
        ratings: mediaStats.ratings,
        reviews: mediaStats.reviewsCount,
        watched: mediaStats.watchedCount,
        watchlist: mediaStats.watchlistCount,
      })
      .from(mediaStats)
      .where(
        and(eq(mediaStats.mediaType, mediaType), eq(mediaStats.tmdbId, tmdbId)),
      )
      .limit(1);
    return data ?? null;
  } catch (error) {
    unstable_rethrow(error);
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
