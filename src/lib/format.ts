export function pluralize(
  count: number,
  one: string,
  many = `${one}s`,
): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

export function toLogline(
  overview: string | null | undefined,
  maxLength: number,
  enoughLength: number,
): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > maxLength) break;
    line = next;
    if (line.length >= enoughLength) break;
  }
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength).replace(/\s+\S*$/, "")}…`;
}
