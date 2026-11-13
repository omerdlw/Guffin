import "server-only";

import { report } from "@omerdlw/base-framework/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getMediaDetails, type MediaDetails } from "@/lib/tmdb/server";
import type { MediaType } from "@/lib/tmdb/shared";
import { type MediaItem, toMediaItem } from "./quality";

interface CatalogRow {
  backdrop_path: string | null;
  eligible: boolean;
  episodes_count: number | null;
  genre_ids: number[];
  last_air_date: string | null;
  media_type: MediaType;
  origin_countries: string[];
  original_language: string | null;
  original_title: string | null;
  popularity: number;
  poster_path: string | null;
  quality_flags: string[];
  quality_score: number;
  release_date: string | null;
  runtime_minutes: number | null;
  seasons_count: number | null;
  status: string | null;
  title: string;
  tmdb_id: number;
  vote_average: number | null;
  vote_count: number;
}

const CATALOG_STALE_MS: Record<MediaType, number> = {
  movie: 7 * 24 * 60 * 60 * 1000,
  tv: 24 * 60 * 60 * 1000,
};

function toCatalogRow(item: MediaItem): CatalogRow {
  return {
    backdrop_path: item.backdropPath,
    eligible: item.quality.eligible,
    episodes_count: item.episodesCount,
    genre_ids: item.genreIds,
    last_air_date: item.lastAirDate,
    media_type: item.mediaType,
    origin_countries: item.originCountries,
    original_language: item.originalLanguage,
    original_title: item.originalTitle,
    popularity: item.popularity,
    poster_path: item.posterPath,
    quality_flags: item.quality.flags,
    quality_score: item.quality.score,
    release_date: item.releaseDate,
    runtime_minutes: item.runtimeMinutes,
    seasons_count: item.seasonsCount,
    status: item.status,
    title: item.title,
    tmdb_id: item.id,
    vote_average: item.voteAverage,
    vote_count: item.voteCount,
  };
}

async function upsertCatalogEntry(media: MediaDetails): Promise<MediaItem> {
  const item = toMediaItem(media.details, media.mediaType);
  try {
    const { error } = await createAdminSupabaseClient()
      .from("media_catalog")
      .upsert(
        { ...toCatalogRow(item), fetched_at: new Date().toISOString() },
        { onConflict: "media_type,tmdb_id" },
      );
    if (error) throw error;
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
    const { data } = await createAdminSupabaseClient()
      .from("media_catalog")
      .select("fetched_at")
      .eq("media_type", mediaType)
      .eq("tmdb_id", id)
      .maybeSingle();
    if (
      data &&
      Date.now() - Date.parse(data.fetched_at) < CATALOG_STALE_MS[mediaType]
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
