# Movie library

A person's relationship with a film is spread across five tables. Each one
answers a different question:

| Table               | Question                          | Cardinality                              |
| ------------------- | --------------------------------- | ---------------------------------------- |
| `account_watched`   | Have I seen it?                   | one row per film                         |
| `account_diary`     | When did I watch it?              | one row per viewing (dated)              |
| `account_watchlist` | Do I want to see it?              | one row per film                         |
| `account_likes`     | Did I love it?                    | one row per film                         |
| `account_favorites` | Is it one of my five?             | ≤ 5 rows, each needs a like              |
| `reviews`           | What did I think? (rating + text) | one per film (see [reviews](reviews.md)) |

## How the tables imply each other

The UI writes one table. Triggers keep the others consistent, so the rules
hold for any code path, including seeds and scripts.

```mermaid
flowchart LR
  D["diary entry"] -->|implies| W["watched"]
  L["like"] -->|implies| W
  R["review / rating"] -->|implies| W
  W -->|removes| WL["watchlist"]
  D -->|removes| WL
  F["favourite"] -->|requires FK| L

  UW["un-watch"] -.->|cascades| XD["diary entries deleted"]
  UW -.->|cascades| XL["like deleted"]
  XL -.->|FK cascade| XF["favourite deleted"]
```

| Rule                                       | Where it lives                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Logging, liking or reviewing marks watched | `account_diary_after_change`, `account_likes_after_change`, `reviews_after_write` |
| Watched leaves the watchlist               | `account_watched_after_insert`, `account_diary_after_change`                      |
| Un-watching drops diary and like           | `account_watched_after_delete`                                                    |
| A favourite needs a like                   | FK `account_favorites → account_likes` (`ON DELETE CASCADE`)                      |
| A reviewed film can't be un-watched        | server check in `setMovieLibraryAction` (`libraryConflict`)                       |
| A watched film can't join the watchlist    | server check (`libraryConflict`); the UI hides the button too                     |

## Toggling a mark from the film page

```mermaid
sequenceDiagram
  autonumber
  participant U as Person
  participant C as MovieCollectionActions
  participant A as setMovieLibraryAction
  participant T as TMDB
  participant DB as Postgres

  Note over C: on mount: getMovieLibraryAction → { watched, watchlist, liked }
  U->>C: taps "Watched"
  C->>C: optimistic: watched = true, watchlist = false
  C->>A: (603, "watched", true)
  A->>A: validate · requireUser · rate limit 120/min
  A->>DB: libraryConflict? (reviewed / already watched)
  A->>T: getMediaDetails (title snapshot)
  A->>DB: INSERT account_watched (snapshot)
  Note over DB: triggers: watchlist row removed,<br/>WATCHED_ADDED activity, counters +1
  A->>DB: readLibraryState
  A-->>C: { state } (server truth)
  C->>C: replace optimistic state, or roll back + toast
```

The client predicts the outcome with the same rules the database applies
(`applyMovieLibraryChange`: watched clears watchlist, un-watched clears
like), so the buttons don't flicker while the round-trip completes.

## The diary

A diary entry is a dated viewing. Rewatches are new rows, never edits.

```mermaid
flowchart TD
  IN["logMovieToDiaryAction(603, '2026-11-18')"] --> V{"date valid ISO?"}
  V -- no --> E0["Invalid request"]
  V -- yes --> BW["before_write trigger"]
  BW --> F{"watched_on > today + 1?"}
  F -- yes --> E1["DIARY_DATE_IN_FUTURE<br/>→ 'You cannot log a movie in the future'"]
  F -- no --> P{"earlier entry exists?"}
  P -- "yes, later than this date" --> E2["DIARY_DATE_BEFORE_LATEST_ENTRY<br/>→ 'already logged on a later day'"]
  P -- "yes, on/before this date" --> RW["is_rewatch = true"]
  P -- no --> FIRST["first viewing"]
  RW --> AC["after_change"]
  FIRST --> AC
  AC --> W["upsert account_watched<br/>last_watched_at = greatest(…)"]
  AC --> WL["remove from watchlist"]
  AC --> ACT["activity: WATCH_DIARY_LOGGED<br/>or WATCH_DIARY_REWATCHED"]
```

`today + 1` leaves room for time zones: someone ahead of UTC can log
"tonight" before the server's date has turned.

## Favourites

Five slots per media type. `setFavoriteAction` reads the used positions and
takes the first free one. An insert without a matching like fails the
foreign key (`23503`), which becomes "Like this movie to pin it".

## Counters and film stats

Every insert or delete on these tables moves two sets of counters:

```mermaid
flowchart LR
  row["row added / removed"] --> as["account_stats<br/>watched_count · diary_count ·<br/>watchlist_count · likes_count"]
  row --> ms["film_stats per title<br/>watched_count · liked_count ·<br/>watchlist_count · listed_count"]
  ms --> page["film page: 'watched by 1.2k'"]
  ms --> home["home: 'waiting' on upcoming films<br/>= film_stats.watchlist_count"]
```

Counters clamp at zero (`greatest(0, …)`) so a replayed delete can never
push them negative.
