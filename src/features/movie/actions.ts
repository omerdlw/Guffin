"use server";

import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { fail, ok } from "@/features/auth/utils";
import { isTmdbId } from "@/lib/tmdb/api";
import { getMovieDetails } from "@/lib/tmdb/server";
import { REGION_CODE_PATTERN } from "./constants";
import type { RegionProviders, WatchProvidersResult } from "./types";
import { providerEntries, sanitizeProviderLink } from "./utils";

export async function getWatchProvidersAction(
  tmdbId: number,
): Promise<WatchProvidersResult> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");

  try {
    const result = await getMovieDetails(tmdbId);
    if (!result.success) return fail("Could not load this movie, try again");

    const regions: Record<string, RegionProviders> = {};
    for (const [code, value] of Object.entries(result.data.watchProviders)) {
      if (!REGION_CODE_PATTERN.test(code)) continue;
      const region: RegionProviders = {
        buy: providerEntries(value.buy),
        free: providerEntries(value.free, value.ads),
        link: sanitizeProviderLink(value.link),
        rent: providerEntries(value.rent),
        stream: providerEntries(value.flatrate),
      };
      if (
        region.buy.length +
          region.free.length +
          region.rent.length +
          region.stream.length >
        0
      ) {
        regions[code] = region;
      }
    }

    return ok({ regions });
  } catch (error) {
    report("WatchProviders read", error);
    return fail("Could not load where to watch");
  }
}
