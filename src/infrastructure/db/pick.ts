import { getTableColumns, type Table } from "drizzle-orm";

type Camel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<Camel<Tail>>}`
  : S;

type Snake<S extends string> = S extends `${infer Head}${infer Tail}`
  ? `${Head extends Lowercase<Head> ? Head : `_${Lowercase<Head>}`}${Snake<Tail>}`
  : S;

type Columns<T extends Table> = T["_"]["columns"];

type SnakeKey<T extends Table> = Snake<keyof Columns<T> & string>;

export type SnakeRow<T extends Table> = {
  [K in keyof T["$inferSelect"] & string as Snake<K>]: T["$inferSelect"][K];
};

function camel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

export function pick<T extends Table, K extends SnakeKey<T>>(
  table: T,
  keys: readonly K[],
): { [P in K]: Columns<T>[Camel<P> & keyof Columns<T>] } {
  const columns = getTableColumns(table) as Record<string, unknown>;
  return Object.fromEntries(
    keys.map((key) => {
      const column = columns[camel(key)];
      if (!column) throw new Error(`Unknown column ${key}`);
      return [key, column];
    }),
  ) as { [P in K]: Columns<T>[Camel<P> & keyof Columns<T>] };
}

export function pickAll<T extends Table>(
  table: T,
): { [P in SnakeKey<T>]: Columns<T>[Camel<P> & keyof Columns<T>] } {
  const columns = getTableColumns(table) as Record<string, { name: string }>;
  return Object.fromEntries(
    Object.values(columns).map((column) => [column.name, column]),
  ) as { [P in SnakeKey<T>]: Columns<T>[Camel<P> & keyof Columns<T>] };
}
