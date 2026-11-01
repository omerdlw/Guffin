"use server";

import "server-only";
import { fail, mutate, ok } from "@/features/auth/server";
import { isTmdbId } from "@/infrastructure/tmdb/validation";
import { FAVORITES_MAX, type ActionResult } from "../browse-types";
import { isUuid } from "@/infrastructure/uuid";

export async function setFavoriteAction(
  tmdbId: number,
  pinned: boolean,
): Promise<ActionResult> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");

  return mutate(
    {
      fallback: "Could not update your favorites",
      name: "Favorite write",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      if (!pinned) {
        const { error } = await client
          .from("account_favorites")
          .delete()
          .eq("account_id", userId)
          .eq("tmdb_id", tmdbId);
        if (error) throw error;
        return ok();
      }

      const taken = await client
        .from("account_favorites")
        .select("tmdb_id, position")
        .eq("account_id", userId);
      if (taken.error) throw taken.error;

      const rows = taken.data ?? [];
      if (rows.some((row) => row.tmdb_id === tmdbId)) return ok();
      if (rows.length >= FAVORITES_MAX) {
        return fail(`You can pin up to ${FAVORITES_MAX} favorites`);
      }

      const used = new Set(rows.map((row) => row.position));
      const position = [1, 2, 3, 4, 5].find((slot) => !used.has(slot));
      if (!position) return fail("Your favorites are full");

      const { error } = await client
        .from("account_favorites")
        .insert({ account_id: userId, position, tmdb_id: tmdbId });
      if (error) {
        if (error.code === "23503") return fail("Like this movie to pin it");
        throw error;
      }
      return ok();
    },
  );
}

export async function deleteDiaryEntryAction(
  id: string,
): Promise<ActionResult> {
  if (!isUuid(id)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not remove this entry",
      name: "Diary delete",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const { error } = await client
        .from("account_diary")
        .delete()
        .eq("id", id)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}
