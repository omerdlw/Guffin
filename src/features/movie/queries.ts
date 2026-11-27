import "server-only";

import { unstable_rethrow } from "next/navigation";
import { report } from "@omerdlw/base-framework/utils";
import { eq } from "drizzle-orm";
import { getViewerSession } from "@/features/auth/server";
import { getKnownFor } from "@/features/person/credits";
import { filmStats } from "@/infrastructure/db/schema";
import { getPersonDetails } from "@/infrastructure/tmdb/server";
import {
  type FilmStats,
  type KnownForMap,
  MOVIE_FEATURED_PEOPLE,
  type PersonEntry,
} from "./model";

const CAST_KNOWN_FOR = 4;

export async function getFilmStats(tmdbId: number): Promise<FilmStats | null> {
  try {
    const { db } = await getViewerSession();
    const [data] = await db
      .select({
        liked: filmStats.likedCount,
        listed: filmStats.listedCount,
        ratings: filmStats.ratings,
        reviews: filmStats.reviewsCount,
        watched: filmStats.watchedCount,
        watchlist: filmStats.watchlistCount,
      })
      .from(filmStats)
      .where(eq(filmStats.tmdbId, tmdbId))
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
  skipId: number,
): Promise<KnownForMap> {
  const load = async (kind: "cast" | "crew") => {
    const featured = people[kind].slice(0, MOVIE_FEATURED_PEOPLE);
    const entries = await Promise.all(
      featured.map(async (person) => {
        const result = await getPersonDetails(person.id);
        if (!result.success) return [person.id, []] as const;
        return [
          person.id,
          getKnownFor(result.data, kind, skipId, CAST_KNOWN_FOR),
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
