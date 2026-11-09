"use server";

import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { fail, ok } from "@/features/auth/utils";
import { isTmdbId } from "@/lib/tmdb/transport";
import type { MediaType } from "@/features/catalog/types";
import { isMediaType } from "@/features/catalog/utils";
import { getMediaDetails } from "@/lib/tmdb/server";
import { REGION_CODE_PATTERN } from "./constants";
import type { RegionProviders, WatchProvidersResult } from "./types";
import { providerEntries, sanitizeProviderLink } from "./utils";

export async function getWatchProvidersAction(
  tmdbId: number,
  mediaType: MediaType = "movie",
): Promise<WatchProvidersResult> {
  if (!isTmdbId(tmdbId) || !isMediaType(mediaType)) {
    return fail("Invalid title");
  }

  try {
    const result = await getMediaDetails(mediaType, tmdbId);
    if (!result.success) return fail("Could not load this title, try again");

    const regions: Record<string, RegionProviders> = {};
    for (const [code, value] of Object.entries(
      result.data.details.watchProviders,
    )) {
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
