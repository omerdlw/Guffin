"use server";
import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { fail, type ActionResult, ok } from "@/shared/result";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import { isTmdbId } from "@/infrastructure/tmdb/transport";
import type { ProviderEntry, RegionProviders } from "./model";

type WatchProvidersResult = ActionResult<{
  regions: Record<string, RegionProviders>;
}>;

type Provider = {
  displayPriority: number;
  logoPath: string | null;
  name: string;
  providerId: number;
};

const REGION_CODE_PATTERN = /^[A-Z]{2}$/;

const sanitizeProviderLink = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith("https://www.themoviedb.org/")
    ? value
    : null;

const providerEntries = (
  ...groups: readonly (readonly Provider[])[]
): ProviderEntry[] => {
  const seen = new Set<number>();
  return groups
    .flat()
    .sort((a, b) => a.displayPriority - b.displayPriority)
    .filter((p) => !seen.has(p.providerId) && seen.add(p.providerId))
    .map((p) => ({ id: p.providerId, logoPath: p.logoPath, name: p.name }));
};

export async function getWatchProvidersAction(
  tmdbId: number,
): Promise<WatchProvidersResult> {
  if (!isTmdbId(tmdbId)) {
    return fail("Invalid title");
  }

  try {
    const result = await getMovieDetails(tmdbId);
    if (!result.success) return fail("Could not load this title, try again");

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
