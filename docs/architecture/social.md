# Social graph

Following, follow requests, notifications, the activity feed and lists.
Nearly all of it is driven by triggers on a handful of tables. Application
code writes one row, and the side effects follow from it.

## Follows

`account_follows` holds one row per (follower, following) pair with a
status. A public account is followed at once; a private one gets a request.

```mermaid
stateDiagram-v2
  [*] --> accepted: follow a public account
  [*] --> pending: follow a private account
  pending --> accepted: owner accepts
  pending --> rejected: owner rejects
  pending --> accepted: owner goes public<br/>(all pending auto-accepted)
  accepted --> [*]: unfollow / remove follower
  pending --> [*]: cancel request
  rejected --> [*]
```

Who may move a follow is checked in `account_follows_before_update`, not in
the route:

| Actor               | May set status to                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| the followed person | `accepted` or `rejected`                                                                                       |
| the follower        | only the initial status (`pending` for private, `accepted` for public); an accepted follow can't be downgraded |
| anyone else         | nothing (`42501`)                                                                                              |

A follow can never be moved to other accounts. `followUserAction` simply
upserts the row with the status the target's privacy implies. The database
rejects anything else.

### One row change, many effects

```mermaid
flowchart TD
  CH["account_follows status changes<br/>old → new"] --> C{"counters"}
  C -->|"→ accepted"| UP["followers_count +1 (them)<br/>following_count +1 (me)"]
  C -->|"accepted →"| DOWN["both −1"]

  CH --> N{"notifications"}
  N -->|"→ pending"| FR["FOLLOW_REQUEST to them"]
  N -->|"pending → accepted"| FA["retire the request ·<br/>FOLLOW_ACCEPTED to me"]
  N -->|"∅ → accepted"| NF["NEW_FOLLOWER to them"]
  N -->|"→ rejected / deleted"| UN["unnotify request, new-follower,<br/>accepted"]

  CH --> A{"activity"}
  A -->|"→ accepted"| FC["FOLLOW_CREATED (me → them)"]
  A -->|otherwise| RM["remove it"]
```

Follow, unfollow and follow again leaves exactly one notification and one
activity item. Both are keyed (`new-follower:<me>`, `follow:<them>`).

## Notifications

```mermaid
sequenceDiagram
  participant T as Trigger (any table)
  participant N as notifications
  participant S as SocialSync (client)
  participant API as /api/notifications
  participant D as Dock badge / inbox surface

  T->>N: notify(user, actor, type, payload, dedupe_key)
  Note over N: skipped if user = actor.<br/>ON CONFLICT (user, key): refresh,<br/>mark unread, bump created_at
  loop every 60s, on focus, on tab visible (≥ 10s apart)
    S->>S: emit NOTIFICATION_CHANGE + INBOX_CHANGE
    D->>API: GET ?resource=unread-count
    API->>N: count(*) where read = false (RLS: mine)
    API-->>D: n
  end
  D->>API: GET (opening the inbox): latest 50, with actor
  D->>API: PATCH read / read all · DELETE one / all
```

| Type              | Fired by                              |
| ----------------- | ------------------------------------- |
| `FOLLOW_REQUEST`  | a follow of a private account         |
| `FOLLOW_ACCEPTED` | the request answered                  |
| `NEW_FOLLOWER`    | a follow of a public account          |
| `REVIEW_LIKE`     | a like on your review or list comment |
| `LIST_LIKE`       | a like on your list                   |
| `LIST_COMMENT`    | a comment on your list                |

There is no websocket. Notifications are pulled on a 60-second rhythm that
pauses in background tabs, which is enough for a diary. A daily prune drops
read notifications older than 90 days, except follow requests and
acceptances.

## The activity feed

Every meaningful act writes one `account_activity` row through
`record_activity`. A profile's _Activity_ tab and its calendar read from it.
The home page's friends shelf is built separately, straight from friends'
diaries (see [algorithms](algorithms.md#your-circle)).

```mermaid
flowchart LR
  subgraph Sources
    w["watched"] --> WA["WATCHED_ADDED"]
    d["diary"] --> DL["WATCH_DIARY_LOGGED / REWATCHED"]
    l["like"] --> LA["LIKED_ADDED"]
    wl["watchlist"] --> WLA["WATCHLIST_ADDED"]
    r["review"] --> RP["REVIEW_PUBLISHED / RATING_LOGGED"]
    rl["review like"] --> RLK["REVIEW_LIKED"]
    li["list"] --> LC["LIST_CREATED / LIST_LIKED / LIST_COMMENTED"]
  end
  Sources --> RA["record_activity(account, type, dedupe_key, …)"]
  RA --> AA[("account_activity<br/>unique (account, dedupe_key)")]
  AA --> P["profile Activity tab + calendar"]
  AA --> H["read by RLS: owner, or<br/>public / accepted follower"]
```

- **Idempotent by key.** `watched:603`, `diary:<id>`. Re-doing an act updates the item instead of adding one.
  Undoing it removes the item with the same key.
- **Quiet acts.** Acts on private lists stay out of the feed.
- **Edits stay in place.** Editing a review rewrites its item and flags it
  `edited` instead of posting it again.

## Lists

```mermaid
erDiagram
  lists ||--o{ list_items : "ordered items"
  lists ||--o{ list_likes : likes
  lists ||--o{ reviews : "comments (list_id)"
  lists {
    uuid id PK
    text slug "unique per owner, auto from title"
    text title
    bool is_ranked
    bool is_private
    int items_count
    int likes_count
    int reviews_count
  }
  list_items {
    int tmdb_id
    int position "deferred unique: swaps commit cleanly"
  }
```

- **Slugs** are made from the title by the insert trigger (`my-list`,
  `my-list-2`…) and can never change, so list URLs are permanent.
- **Counters** (`items_count`, `likes_count`, `reviews_count`) are trigger
  maintained, and a client can't set them.
- **Reordering** sends the full new order to `reorder_list_items`. It
  refuses any order that doesn't contain every item exactly once. Because
  the position constraint is deferred, a swap is valid at commit.
- **Privacy flips** move the list's activity: going private deletes it,
  going public creates `LIST_CREATED`. Film stats (`listed_count`) follow
  the same flip.

## Social proof on a title

A film page shows which of the people you follow have watched, liked,
watchlisted or reviewed it (`get_movie_social_proof`):

```mermaid
flowchart LR
  me["viewer"] --> f["accepted follows"]
  f --> j["LEFT JOIN watched · likes ·<br/>watchlist · reviews (this title)"]
  j --> k["keep people with any signal"]
  k --> o["order by most recent act<br/>limit 100 (≤ 200) + total"]
  o --> UI["avatar stack: 'Ada, Linus and 12 others'"]
```

It runs with the viewer's rights (not security definer). Someone you follow
who has since gone private, without accepting you, drops out by RLS.
