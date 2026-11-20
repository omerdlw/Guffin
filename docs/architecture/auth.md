# Authentication

Self-hosted [Better Auth](https://www.better-auth.com) on the same Postgres.
There are no passwords: a person signs in with a **one-time email code**, a
**passkey**, or **Google / GitHub / X**.

## Pieces

```mermaid
flowchart LR
  subgraph Client
    SI["Sign-in surface<br/>(dock)"] --> AC["features/auth/client.ts<br/>requestEmailCode · verifyEmailCode<br/>signInWithPasskey · signInWithOAuth"]
    AP["AuthProvider<br/>session state for the UI"]
  end
  AC -->|fetch| H["/api/auth/[...all]<br/>Better Auth handler"]
  H --> BA["lib/auth/server.ts<br/>betterAuth({...})"]
  BA --> Plugins["emailOTP · passkey · nextCookies"]
  BA --> RL["rate limit<br/>Redis (or memory)"]
  BA --> Adapter["drizzle adapter on admin()"]
  Adapter --> T[("auth_users · auth_sessions<br/>auth_accounts · auth_verifications<br/>auth_passkeys")]
  Plugins --> Mail["sendEmail(otpEmail)<br/>SMTP (Mailpit locally)"]
  T -->|on_auth_user_created| ACC[("accounts · account_stats<br/>account_emails")]
```

The `auth_*` tables belong to Better Auth and only the owner role can touch
them. Everything else in the app is keyed by the same user id.

## Signing in with an email code

```mermaid
sequenceDiagram
  autonumber
  participant U as Person
  participant S as Sign-in surface
  participant A as /api/auth
  participant DB as Postgres
  participant M as Mail

  U->>S: enters email
  S->>A: POST /email-otp/send-verification-otp
  A->>A: rate limit 5 / minute
  A->>DB: store hashed 6-digit code (10 min)
  A->>M: send code
  U->>S: types the code
  S->>A: POST /sign-in/email-otp (≤ 10 / minute)
  A->>DB: verify (5 attempts), create user if new
  Note over DB: trigger on_auth_user_created →<br/>accounts + account_stats + account_emails
  A->>DB: insert auth_sessions (30 days)
  A-->>S: Set-Cookie guffin.session_token
  S->>S: hasAccountUsername()?
  alt no username yet
    S->>U: account setup prompt (pick a username)
  else
    S->>U: back to where they were
  end
```

OAuth follows the same ending. The provider redirects to
`/auth/callback?next=…`. The callback route checks the session, then sends
the person either to account setup (no username yet) or to the sanitised
`next` path. `sanitizeNextPath` only accepts same-origin paths (`/…`, never
`//…`), so the callback cannot become an open redirect.

## The first sign-in creates the account

Better Auth inserts the user. A database trigger, not app code, builds the
rest of the account in the same transaction:

```mermaid
flowchart LR
  BA["Better Auth<br/>INSERT auth_users"] --> TR["private.handle_new_user()"]
  TR --> A1["accounts<br/>id, display_name (≤ 80 chars),<br/>avatar_url only if http(s)"]
  TR --> A2["account_stats<br/>all counters 0"]
  TR --> A3["account_emails<br/>primary, verified_at if verified"]
```

A user with no `username` yet is a half-made account: they are signed in,
but their profile has no URL until they pick a name.

## Sessions on the server

```mermaid
flowchart TB
  RSC["any server code"] --> G["getOptionalUser()<br/>React cache(): once per request"]
  G --> GS["auth.api.getSession(headers)"]
  GS -->|null| anon["anon viewer"]
  GS -->|user| U["{ id, email, sessionId, sessionCreatedAt }"]
  U --> VS["viewer(id) → RLS as that user"]
  U --> RU["requireUser() → 401 if missing"]
  U --> RR["requireRecentAuthentication()<br/>session younger than 10 min"]
```

| Setting                   | Value                                                    |
| ------------------------- | -------------------------------------------------------- |
| Session lifetime          | 30 days, refreshed once a day of use                     |
| "Fresh" session           | 1 day (Better Auth); deleting the account needs ≤ 10 min |
| Cookie prefix             | `guffin`                                                 |
| Account linking           | enabled; Google and GitHub are trusted to link by email  |
| Client IP for rate limits | `cf-connecting-ip` → `x-real-ip` → `x-forwarded-for`     |

Deleting the account (`DELETE /api/account/me`) goes through
`requireRecentAuthentication`. It also requires typing `DELETE` and a
same-origin request. A session older than ten minutes is asked to sign in
again. The delete removes the `auth_users` row. Every account table hangs
off it with `ON DELETE CASCADE`, so the rest goes with it.

## Housekeeping

`/api/cron/prune` calls `prune_account_data()`. It deletes expired sessions
and verification codes more than a day past expiry. Old read notifications
are pruned separately (see [social](social.md#notifications)).
