import "server-only";

import { pageCount, pageRange } from "./params";

interface PageResult<Row> {
  count: number | null;
  data: Row[] | null;
  error: { code?: string; details?: string } | null;
}

export async function readPage<Row>(
  query: { range(from: number, to: number): PromiseLike<PageResult<Row>> },
  page: number,
  size: number,
  retried = false,
): Promise<{ count: number | null; page: number; rows: Row[] }> {
  const { from, to } = pageRange(page, size);
  const result = await query.range(from, to);
  if (result.error?.code === "PGRST103" && !retried) {
    const rows = Number(
      /only (\d+) rows/.exec(result.error.details ?? "")?.[1],
    );
    const last = Math.max(1, pageCount(Number.isFinite(rows) ? rows : 0, size));
    return readPage(query, last, size, true);
  }
  if (result.error) throw result.error;
  return { count: result.count, page, rows: result.data ?? [] };
}
