# Accounts and privacy

An **account** is the public face of a user: username, display name, bio,
avatar, background, and one privacy switch. It is created by a trigger on
the first sign-in (see [auth](auth.md#the-first-sign-in-creates-the-account))
and lives at `/account/<username>`.

## The data around an account

```mermaid
erDiagram
  auth_users ||--|| accounts : "same id"
  accounts ||--|| account_stats : counters
  accounts ||--o{ account_emails : emails
  accounts ||--o{ account_watched : watched
  accounts ||--o{ account_diary : diary
  accounts ||--o{ account_watchlist : watchlist
  accounts ||--o{ account_likes : likes
  account_likes ||--o| account_favorites : "pinned (max 5)"
  accounts ||--o{ reviews : writes
  accounts ||--o{ lists : owns
  lists ||--o{ list_items : contains
  accounts ||--o{ account_follows : "follower / following"
  accounts ||--o{ account_activity : "activity feed"
  accounts ||--o{ notifications : receives

  accounts {
    uuid id PK
    text username "unique, a-z0-9_-, 3–30, not reserved"
    text display_name
    text bio
    text avatar_url
    bool is_private
    bool is_active
  }
  account_stats {
    int watched_count
    int diary_count
    int reviews_count
    int watchlist_count
    int likes_count
    int lists_count
    int followers_count
    int following_count
  }
```

`account_stats` is never recomputed on read. Triggers on each table add or
subtract one as rows come and go (see
[data access](data-access.md#triggers-carry-the-domain)), so a profile
header is one row read.

## Usernames

A username is normalised in the app (lowercased, accents stripped, anything
else turned into `-`). The database checks it again:
`^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$`, and it must not be a reserved word
(`settings`, `api`, `diary`, `lists`, …) that would clash with a route.
`update_account()` changes only the fields it is given. Everything else is
passed as the `'__UNCHANGED__'` sentinel.

## Public, private, deactivated

```mermaid
stateDiagram-v2
  [*] --> Public: first sign-in + username
  Public --> Private: is_private = true
  Private --> Public: is_private = false
  note right of Public
    pending follow requests are
    auto-accepted on the way back
    (accounts_after_privacy_change)
  end note
  Public --> Deactivated: deactivate
  Private --> Deactivated: deactivate
  Deactivated --> Public: reactivate (if was public)
  Deactivated --> Private: reactivate (if was private)
  Deactivated --> [*]: account deleted (cascade)
```

- **Private** hides the library, diary, reviews and activity from anyone who
  is not an accepted follower. New follows become requests.
- **Deactivated** (`is_active = false`) hides the account from everyone but
  its owner: RLS treats an inactive owner as invisible.
- **Deactivate / reactivate** are `deactivate_current_account()` and
  `reactivate_current_account()`; `is_private` is kept, so an account comes
  back as it was.
- **Deleted** removes the `auth_users` row, and every table cascades from
  it.

## Visiting a profile

`/account/[username]/<tab>` renders on the server. The page context decides
between the full profile and a locked header:

```mermaid
sequenceDiagram
  participant B as Browser
  participant L as AccountProfileLayout
  participant X as getAccountPageContext
  participant DB as Postgres (viewer session)
  B->>L: /account/ada/diary
  L->>X: username "ada"
  X->>DB: getPublicAccount (RLS: active, or me)
  alt not found
    X-->>B: 404
  else
    X->>X: isOwner = viewer.id == account.id
    X->>DB: accepted follow from viewer? (only if private and not owner)
    X-->>L: { account, locked, isOwner }
    alt locked
      L-->>B: header + "this account is private" + follow button
    else
      L->>DB: tab data (diary month, library page, reviews …)
      Note over DB: RLS filters again: the lock is UI,<br/>the policy is the guarantee
      L-->>B: full tab
    end
  end
```

The `locked` flag only decides what to render. Even if a locked page asked
for diary rows, the read policy would return none, so the lock can never
leak data.

## Profile tabs

| Tab                         | Source                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Overview                    | `get_account_overview()`: favourites, recent diary, popular and recent reviews, rating spread |
| Activity                    | `account_activity`, paginated, plus a calendar summary                                        |
| Diary                       | `account_diary` by month                                                                      |
| Watched / Watchlist / Likes | `account_watched` / `account_watchlist` / `account_likes`, filterable                         |
| Reviews                     | `reviews` by the account, with filters                                                        |
| Lists                       | `lists` (+ items, likes, comments)                                                            |
