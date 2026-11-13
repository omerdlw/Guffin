import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { getMediaDetails, type MediaDetails } from "@/lib/tmdb/server";
import { CATALOG_STALE_MS } from "./constants";
import type { MediaItem, MediaType } from "./types";
import { toCatalogRow, toMediaItem } from "./utils";

async function upsertCatalogEntry(
  media: MediaDetails,
): Promise<MediaItem> {
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
