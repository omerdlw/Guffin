# Guffin

A film diary: log what you watch, rate and review it, build lists and follow
people.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Postgres with
Drizzle, row level security and triggers · Better Auth (email codes, passkeys,
OAuth) · TMDB for the catalogue · Upstash Redis for rate limits · Sentry.

How the system fits together is written up in
[`docs/architecture`](docs/architecture/README.md); the visual language is in
[`docs/design`](docs/design/README.md).

## Requirements

- **Node.js 24 or newer** (the scripts use `process.loadEnvFile`).
- **Postgres 15+** with the `pg_trgm` extension available. A
  [Neon](https://neon.tech) database or a local Docker container both work.
- A **TMDB API read access token** from
  <https://www.themoviedb.org/settings/api>.

## Setup

```sh
git clone https://github.com/omerdlw/Guffin.git
cd Guffin
npm install
cp .env.example .env
```

Fill in `.env`. The minimum for a working local app is:

| Variable                 | Where it comes from                             |
| ------------------------ | ----------------------------------------------- |
| `DATABASE_URL`           | your Postgres (see below)                       |
| `BETTER_AUTH_SECRET`     | `openssl rand -base64 32`                       |
| `TMDB_READ_ACCESS_TOKEN` | TMDB → Settings → API → "API Read Access Token" |

Keep the file named `.env`. Next.js would also read `.env.local`, but the
migration script only loads `.env`.

### A database

**Local, with Docker:**

```sh
docker run -d --name guffin-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=guffin \
  postgres:17
```

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5432/guffin
```

**Neon:** create a project and copy the **direct** (non-pooled) connection
string into `DATABASE_URL`. The app connects as the database owner and switches
into the `anon` / `authenticated` roles inside each transaction, which the
migrations create.

### Migrations

```sh
npm run db:migrate
```

This applies everything in `scripts/db/migrations/` with drizzle-kit and records
what ran in `drizzle.migrations`. The first migration, `0000_baseline.sql`,
builds the whole schema: roles, extensions, tables, RLS policies, triggers and
SQL functions.

Migrations are hand-written SQL. To add one:

```sh
npm run db:new -- <name>      # creates scripts/db/migrations/NNNN_<name>.sql
```

Write the SQL in the new file, run `npm run db:migrate`, and update
`src/infrastructure/db/schema.ts` (and `functions.ts` for new SQL functions) to
match.

### Run it

```sh
npm run dev
```

Open <http://localhost:3000>. To sign in without a mail provider, enter your
email: in development the six-digit code is printed in the terminal running
`npm run dev`.

## Environment variables

Every variable the app reads is listed, with comments, in
[`.env.example`](.env.example). In short:

| Variable                                               | Required    | Purpose                                                                                      |
| ------------------------------------------------------ | ----------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                         | yes         | Postgres connection for the app and migrations                                               |
| `BETTER_AUTH_SECRET`                                   | yes         | Signs auth sessions                                                                          |
| `NEXT_PUBLIC_SITE_URL`                                 | in deploys  | Public origin; auth base URL, passkey RP ID, share URLs. Defaults to `http://localhost:3000` |
| `TMDB_READ_ACCESS_TOKEN`                               | yes         | TMDB API bearer token                                                                        |
| `TMDB_API_BASE_URL`                                    | no          | Override the TMDB API base URL                                                               |
| `RESEND_API_KEY`                                       | in deploys  | Sends sign-in codes through Resend                                                           |
| `SMTP_URL`                                             | no          | Nodemailer transport URL, used when Resend is not set                                        |
| `EMAIL_FROM`                                           | no          | Sender, default `Guffin <onboarding@resend.dev>`                                             |
| `GOOGLE_*`, `GITHUB_*`, `X_*` `_CLIENT_ID` / `_SECRET` | no          | Each OAuth provider turns on when both its values are set                                    |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`   | recommended | Shared rate limits; without them auth limits are in memory per instance                      |
| `CRON_SECRET`                                          | for cron    | Bearer token for `POST /api/cron/prune`                                                      |
| `NEXT_PUBLIC_SENTRY_DSN`                               | no          | Error reporting                                                                              |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`    | no          | Source map upload at build time                                                              |
| `SEED_LOGIN`, `NEXT_PUBLIC_SEED_LOGIN`                 | dev only    | `1` lets `@guffin.test` seed accounts sign in without a code. Never set in production        |

OAuth callback URLs are `<NEXT_PUBLIC_SITE_URL>/api/auth/callback/<provider>`,
where the provider is `google`, `github` or `twitter` (for X).

## Scripts

| Script                            | What it does                  |
| --------------------------------- | ----------------------------- |
| `npm run dev`                     | Development server            |
| `npm run build` / `npm start`     | Production build and server   |
| `npm run lint`                    | ESLint                        |
| `npm run typecheck`               | `tsc --noEmit`                |
| `npm run format` / `format:check` | Prettier                      |
| `npm run db:migrate`              | Apply pending migrations      |
| `npm run db:new -- <name>`        | Create an empty SQL migration |

## Deploying

Set at least `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`,
`TMDB_READ_ACCESS_TOKEN` and `RESEND_API_KEY` (with a verified `EMAIL_FROM`
domain), and Upstash Redis so rate limits are shared across instances. Run
`npm run db:migrate` against the production database before each deploy that
adds a migration.

To prune expired sessions, verifications and old notifications, call the cron
route on a schedule:

```sh
curl -X POST https://<your-site>/api/cron/prune \
  -H "Authorization: Bearer $CRON_SECRET"
```
