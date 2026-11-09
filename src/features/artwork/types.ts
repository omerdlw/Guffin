export type ArtworkKind = "movie" | "person" | "tv";

export type ArtworkSlot = "poster" | "backdrop";

export interface ArtworkEntry {
  backdrop?: string;
  poster?: string;
  updatedAt: number;
}

export type ArtworkEntries = Readonly<Record<string, ArtworkEntry>>;

export interface ArtworkStore {
  clear(kind: ArtworkKind, id: number, slot?: ArtworkSlot): void;
  getSnapshot(): ArtworkEntries;
  set(kind: ArtworkKind, id: number, slot: ArtworkSlot, path: string): void;
  subscribe(listener: () => void): () => void;
}

export interface MenuPayload {
  path: string;
  slot: ArtworkSlot;
}

export interface ArtworkContextMenuOptions {
  defaults: Record<ArtworkSlot, string | null>;
  id: number;
  kind: ArtworkKind;
}
