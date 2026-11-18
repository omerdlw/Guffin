# Guffin

A film and TV diary with a cinematic interface. Log what you watch, keep a
dated diary, rate and review, build lists, follow people and track shows
episode by episode.

Catalogue data comes from [TMDB](https://www.themoviedb.org); accounts and
activity live in Postgres ([Neon](https://neon.com) in production).

## Stack

- **Next.js 16** (App Router, React Server Components, Server Actions) and **React 19**
- **Tailwind CSS 4** with a role-based design system and liquid-glass controls
- **Postgres** with Row Level Security, queried through **Drizzle ORM** (`node-postgres`)
- **Better Auth** (self-hosted): email codes, passkeys, Google / GitHub / X
- **Upstash Redis** for rate limiting, **Sentry** for error reporting
- **zod** for every external payload
- [`@omerdlw/base-framework`](https://www.npmjs.com/package/@omerdlw/base-framework) for the dock, modal and surface modules

## Getting started

Requires Node.js 24 or later.

```bash
npm install
cp .env.example .env.local   # fill in TMDB; npm run seed:env adds the local database values
npm run db:start             # Postgres and a mail catcher in Docker
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>.

## Scripts

| Command                | What it does               |
| ---------------------- | -------------------------- |
| `npm run dev`          | Development server         |
| `npm run build`        | Production build           |
| `npm start`            | Serve the production build |
| `npm run typecheck`    | TypeScript, no emit        |
| `npm run lint`         | ESLint                     |
| `npm test`             | Unit tests (Vitest)        |
| `npm run format:check` | Prettier check             |
| `npm run db:start`     | Local Postgres + Mailpit   |
| `npm run db:migrate`   | Apply `drizzle/` migrations |
| `npm run db:new <name>`| New empty SQL migration    |
| `npm run db:schema`    | Regenerate `src/lib/db/schema.ts` and `functions.ts` from the database |

## Project layout

```
src/
  app/          routes; thin, they compose features
  features/     one folder per feature: data, actions, views, motion
  design/       design system: tokens, recipes, components, liquid glass
  motion/       motion engine: stage choreography, WebGL, cursor, scroll
  lib/          TMDB client, db (Drizzle + RLS sessions), auth, env, security
drizzle/        SQL migrations (the source of truth for the schema)
public/         static assets
docs/           design system and project notes
```

Features keep their parts together: `server.ts` reads data, `actions.ts`
holds server actions, `view.tsx` renders the page and `motion.tsx` its
choreography.

## Environment

See [`.env.example`](.env.example). Only `NEXT_PUBLIC_*` values reach the
browser. `NEXT_PUBLIC_TV_ENABLED=true` turns on shows and episode tracking.

## Database

Migrations are plain SQL in `drizzle/`; `src/lib/db/schema.ts` mirrors them
and is generated (`npm run db:schema`), never edited by hand. The app connects
as the database owner and runs every request made on someone's behalf inside a
transaction as the `anon` or `authenticated` role with `app.viewer_id` set, so
Row Level Security decides what each viewer can read and write
(`src/lib/db/client.ts`). Auth tables belong to Better Auth and are reachable
only by the owner.

Once a day, call `POST /api/cron/prune` with `Authorization: Bearer $CRON_SECRET`
to clear expired sessions, spent codes and old notifications.

## Documentation

- [Design system](docs/design/README.md): colour, type, shape, motion, interaction, components and glass
- [Progress](docs/progress.md): current state and next steps

## License

[MIT](LICENSE)
