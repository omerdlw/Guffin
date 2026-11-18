import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { and, eq } from "drizzle-orm";
import { admin } from "@/lib/db/client";
import { mediaCatalog } from "@/lib/db/schema";
import { getMediaDetails, type MediaDetails } from "@/lib/tmdb/server";
import type { MediaType } from "@/lib/tmdb/shared";
import { type MediaItem, toMediaItem } from "./quality";

type CatalogRow = typeof mediaCatalog.$inferInsert;

const CATALOG_STALE_MS: Record<MediaType, number> = {
  movie: 7 * 24 * 60 * 60 * 1000,
  tv: 24 * 60 * 60 * 1000,
};

function toCatalogRow(item: MediaItem): CatalogRow {
  return {
    backdropPath: item.backdropPath,
    eligible: item.quality.eligible,
    episodesCount: item.episodesCount,
    genreIds: item.genreIds,
    lastAirDate: item.lastAirDate,
    mediaType: item.mediaType,
    originCountries: item.originCountries,
    originalLanguage: item.originalLanguage,
    originalTitle: item.originalTitle,
    popularity: item.popularity,
    posterPath: item.posterPath,
    qualityFlags: item.quality.flags,
    qualityScore: item.quality.score,
    releaseDate: item.releaseDate,
    runtimeMinutes: item.runtimeMinutes,
    seasonsCount: item.seasonsCount,
    status: item.status,
    title: item.title,
    tmdbId: item.id,
    voteAverage: item.voteAverage,
    voteCount: item.voteCount,
  };
}

async function upsertCatalogEntry(media: MediaDetails): Promise<MediaItem> {
  const item = toMediaItem(media.details, media.mediaType);
  try {
    const row = { ...toCatalogRow(item), fetchedAt: new Date().toISOString() };
    await admin()
      .db.insert(mediaCatalog)
      .values(row)
      .onConflictDoUpdate({
        set: row,
        target: [mediaCatalog.mediaType, mediaCatalog.tmdbId],
      });
  } catch (error) {
    report("Catalog upsert", error);
  }
  return item;
}

export async function ensureCatalogEntry(
  mediaType: MediaType,
  id: number,
): Promise<boolean> {
  try {
    const [data] = await admin()
      .db.select({ fetchedAt: mediaCatalog.fetchedAt })
      .from(mediaCatalog)
      .where(
        and(eq(mediaCatalog.mediaType, mediaType), eq(mediaCatalog.tmdbId, id)),
      )
      .limit(1);
    if (
      data &&
      Date.now() - Date.parse(data.fetchedAt) < CATALOG_STALE_MS[mediaType]
    ) {
      return true;
    }
  } catch (error) {
    report("Catalog read", error);
  }

  const details = await getMediaDetails(mediaType, id);
  if (!details.success) return false;
  await upsertCatalogEntry(details.data);
  return true;
}
