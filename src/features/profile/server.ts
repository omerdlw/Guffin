import "server-only";

import { pageCount, pageRange } from "./params";

export async function readPage<Row>(
  query: {
    count: () => Promise<number>;
    rows: (limit: number, offset: number) => Promise<Row[]>;
  },
  page: number,
  size: number,
): Promise<{ count: number; page: number; rows: Row[] }> {
  const [count, rows] = await Promise.all([
    query.count(),
    query.rows(size, pageRange(page, size).from),
  ]);
  const last = pageCount(count, size);
  if (rows.length > 0 || page <= last) return { count, page, rows };
  return {
    count,
    page: last,
    rows: await query.rows(size, pageRange(last, size).from),
  };
}
