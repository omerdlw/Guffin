export function fuse<T>(
  lists: readonly (readonly T[])[],
  key: (item: T) => number,
  k = 60,
): { item: T; score: number }[] {
  const scores = new Map<number, { item: T; score: number }>();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = key(item);
      const entry = scores.get(id) ?? { item, score: 0 };
      entry.score += 1 / (k + rank + 1);
      scores.set(id, entry);
    });
  }
  return [...scores.values()].sort((a, b) => b.score - a.score);
}

export function fresh<T extends { id: number }>(
  items: readonly T[],
  shown: Set<number>,
  limit: number,
): T[] {
  const kept = items.filter((item) => !shown.has(item.id)).slice(0, limit);
  kept.forEach((item) => shown.add(item.id));
  return kept;
}

export const yearOf = (date: string | null | undefined): number | null => {
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : null;
};

const LOGLINE_LENGTH = 180;

export function loglineOf(overview: string | null | undefined): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > LOGLINE_LENGTH) break;
    line = next;
    if (line.length >= 80) break;
  }
  if (line.length <= LOGLINE_LENGTH) return line;
  return `${line.slice(0, LOGLINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}
