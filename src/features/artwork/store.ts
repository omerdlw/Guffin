export type ArtworkSlot = "poster" | "backdrop";

export function artworkAttributes(slot: ArtworkSlot, path: string | null) {
  return path
    ? { "data-artwork": slot, "data-artwork-path": path }
    : ({} as Record<string, never>);
}
