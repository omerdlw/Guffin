# Guffin

A film and TV diary with a cinematic interface. Log what you watch, keep a
dated diary, rate and review, build lists, follow people and track shows
episode by episode.

Catalogue data comes from [TMDB](https://www.themoviedb.org); accounts and
activity live in [Supabase](https://supabase.com).

## Stack

- **Next.js 16** (App Router, React Server Components, Server Actions) and **React 19**
- **Tailwind CSS 4** with a role-based design system and liquid-glass controls
- **Supabase** (Postgres, Auth, Row Level Security) via `@supabase/ssr`
- **Upstash Redis** for rate limiting, **Sentry** for error reporting
- **zod** for every external payload
- [`@omerdlw/base-framework`](https://www.npmjs.com/package/@omerdlw/base-framework) for the dock, modal and surface modules

## Getting started

Requires Node.js 24 or later.

```bash
npm install
cp .env.example .env.local   # fill in TMDB and Supabase keys
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

## Project layout

```
src/
  app/          routes; thin, they compose features
  features/     one folder per feature: data, actions, views, motion
  design/       design system: tokens, recipes, components, liquid glass
  motion/       motion engine: stage choreography, WebGL, cursor, scroll
  lib/          TMDB client, Supabase clients, env, security
public/         static assets
docs/           design system and project notes
```

Features keep their parts together: `server.ts` reads data, `actions.ts`
holds server actions, `view.tsx` renders the page and `motion.tsx` its
choreography.

## Environment

See [`.env.example`](.env.example). Only `NEXT_PUBLIC_*` values reach the
browser; `SUPABASE_SECRET_KEY` is server-only. `NEXT_PUBLIC_TV_ENABLED=true`
turns on shows and episode tracking.

## Documentation

- [Design system](docs/design/README.md): colour, type, shape, motion, interaction, components and glass
- [Progress](docs/progress.md): current state and next steps

## License

[MIT](LICENSE)
