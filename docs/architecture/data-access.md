# Data access and RLS

Guffin does not check permissions in application code. Every query runs as
a Postgres role scoped to the current viewer, and **Row Level Security**
decides which rows exist for them. Domain rules that must always hold
(counters, activity, notifications, cross-table consistency) are
**triggers**. So they hold no matter which code path wrote the row.

## Three kinds of session

`src/infrastructure/db/client.ts` hands out a `Session`: a Drizzle database plus a
typed `call()` for SQL functions.

```mermaid
flowchart LR
  subgraph Request
    U["getOptionalUser()<br/>Better Auth cookie → user id"]
  end
  U --> V["viewer(id)<br/>every query = its own short transaction"]
  U --> AV["asViewer(id, work)<br/>one transaction for many statements"]
  SYS["auth · seed · cron · catalog upserts"] --> AD["admin()<br/>pool owner, no RLS"]

  V --> TX["begin;<br/>set_config('role', 'authenticated' | 'anon', true)<br/>set_config('app.viewer_id', id, true)"]
  AV --> TX
  TX --> PG[("Postgres<br/>RLS policies read private.viewer_id()")]
  AD --> PG
```

```sql
-- what every viewer query is wrapped in
begin;
select set_config('role', 'authenticated', true),
       set_config('app.viewer_id', '6f1c…', true);
-- … the actual query …
commit;
```

- `set_config(…, true)` is **transaction-local**. A pooled connection never
  carries one user's identity into another request.
- A signed-out visitor runs as `anon` with no viewer id. The same policies
  serve them.
- The viewer id is checked against a UUID pattern before it is put into
  the scope statement.
- `admin()` is the pool owner and bypasses RLS. It is used only for Better
  Auth's adapter, seeding, cron jobs, catalogue upserts and cached
  site-wide aggregates (`get_home_pulse`).

## Who can see a row

Most user tables share one read policy. A row is visible when it is yours,
or its owner is active and either public or followed by you (accepted).

```mermaid
flowchart TD
  Q["SELECT … FROM account_watched"] --> own{"account_id = viewer_id()?"}
  own -- yes --> show["visible"]
  own -- no --> active{"owner is_active?"}
  active -- no --> hide["invisible"]
  active -- yes --> priv{"owner is_private?"}
  priv -- no --> show
  priv -- yes --> fol{"viewer follows owner<br/>with status = accepted?"}
  fol -- yes --> show
  fol -- no --> hide
```

The same rule (`private.can_view_account`) guards `account_watched`,
`account_diary`, `account_likes`, `account_watchlist`, `account_favorites`,
`account_stats`, `account_activity` and `reviews`. Lists add their own `is_private` flag on
top. Writes (`INSERT/UPDATE/DELETE`) are granted to `authenticated` only and
limited to your own rows. Catalogue tables (`film_catalog`, `film_stats`) are readable by everyone.

## Triggers carry the domain

A server action writes **one row**. The database does the rest in the same
transaction:

```mermaid
flowchart LR
  W["INSERT account_diary<br/>(one row from logMovieToDiaryAction)"] --> BW["before_write<br/>no future dates · no backdating<br/>marks rewatches"]
  BW --> ROW[("account_diary")]
  ROW --> AC["after_change"]
  AC --> WAT["upsert account_watched"]
  AC --> WL["delete from account_watchlist"]
  AC --> ACT["record_activity<br/>WATCH_DIARY_LOGGED"]
  ROW --> CNT["count_rows<br/>account_stats.diary_count + 1"]
  WAT --> CNT2["account_stats.watched_count<br/>film_stats.watched_count"]
  WAT --> ACT2["record_activity WATCHED_ADDED"]
  WL --> CNT3["watchlist counters − 1"]
```

Patterns used everywhere:

| Pattern               | How                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Counters**          | `count_rows` / `count_film_rows` add ±1 to `account_stats` and `film_stats` on insert/delete; never recomputed on read                |
| **Immutable keys**    | `forbid_column_change` stops a row from being moved to another account or title                                                       |
| **Idempotent events** | `record_activity` and `notify` upsert on a **dedupe key** (`watched:603`, `review-like:<review>:<actor>`), so retries never duplicate |
| **Undo is symmetric** | every delete path calls `remove_activity` / `unnotify` with the same key                                                              |
| **Errors as codes**   | rule violations raise `DIARY_DATE_IN_FUTURE`, `DIARY_DATE_BEFORE_LATEST_ENTRY`…; actions map the code to a human message              |
| **Security definer**  | trigger functions run as owner with `search_path = ''` and fully qualified names                                                      |

## Typed SQL functions

`npm run db:schema` reads the live database and generates `schema.ts`
(Drizzle tables) and `functions.ts` (argument and return shapes for every
`public.*` function). `session.call()` builds a call with named parameters
and explicit casts:

```ts
await session.call("reorder_list_items", {
  p_list_id: listId,
  p_tmdb_ids: [603, 27205, 157336],
});
// → select * from public.reorder_list_items(p_list_id => $1::uuid, …)
```

## Mutations: one wrapper

Server actions that write go through `mutate()` (`src/features/auth/server.ts`):

```mermaid
sequenceDiagram
  participant UI as Client component
  participant A as Server action
  participant M as mutate()
  participant RL as Upstash rate limit
  participant DB as viewer session
  UI->>A: setMovieLibraryAction(…)
  A->>A: validate input shape (ids, ranges)
  A->>M: { name, scope, perMinute }
  M->>M: requireUser() or 401
  M->>RL: scope:userId within perMinute?
  alt over the limit
    M-->>UI: fail("Too many requests…")
  else
    M->>DB: work({ session, userId })
    DB-->>M: rows / raised code
    M-->>UI: ok({...}) or fail(message)
  end
  UI->>UI: optimistic state kept or rolled back · router.refresh()
```

An unexpected exception is reported to Sentry and becomes a generic,
user-safe message. Known database codes become specific ones.

## Migrations

`drizzle/*.sql` is the schema's source of truth, written by hand:
`db:new <name>` → write SQL → `db:migrate` → `db:schema`. `0000_baseline.sql`
holds the full, film-only schema. Later migrations change it in small steps.
