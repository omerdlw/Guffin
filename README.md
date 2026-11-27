# Guffin

A film diary for people who take films seriously: log what you watch, rate
and review it, keep a diary and a watchlist, build ranked lists and follow
friends to see what they are watching.

Built with **Next.js 16** (App Router, React Server Components), **React 19**,
**TypeScript**, **Tailwind CSS 4**, **Postgres** with Row Level Security,
**Better Auth**, and a hand-built motion and liquid-glass layer on top of
[`@omerdlw/base-framework`](https://www.npmjs.com/package/@omerdlw/base-framework).

## Highlights

- **The database enforces the rules.** Row Level Security decides who may
  read a row; triggers keep counters, activity and notifications in step. The
  app talks to Postgres as the signed-in viewer, so a bug in a query cannot
  leak a private profile ([data access](docs/architecture/data-access.md)).
- **Server first.** Pages are Server Components that stream; mutations are
  Server Actions with one result shape and one error path
  ([rendering](docs/architecture/rendering.md)).
- **Passwordless auth.** Email codes, passkeys and OAuth (Google, GitHub, X)
  through Better Auth ([auth](docs/architecture/auth.md)).
- **A real catalogue.** TMDB data validated with zod, retried, cached, and
  ranked with a Bayesian quality score and rank fusion
  ([algorithms](docs/architecture/algorithms.md)).
- **Motion as a system.** Every page declares its choreography in one
  `motion.tsx`; a shared vocabulary of golden-ratio durations and easing
  curves keeps the whole app on one tempo. WebGL backdrops and liquid-glass
  controls are part of the same system ([design system](docs/design/README.md)).

## Project structure

```
src/
├── app/                 Routes only: parse params, call a feature, render
├── features/            One folder per domain
│   ├── account/  auth/  social/  reviews/  lists/
│   ├── movie/  person/  detail-page/   (detail-page: shared movie/person page kit)
│   ├── home/  search/  profile/  spotlights/  legal/  artwork/
│   └── <feature>/
│       ├── model.ts         Types, constants, pure helpers (safe anywhere)
│       ├── queries.ts       Server-only reads
│       ├── actions.ts       Server Actions ("use server")
│       ├── api.ts           Browser fetchers for /api routes
│       ├── components/      React components
│       ├── surfaces/        Dock sheets, lazy-loaded through surfaces/index.ts
│       ├── motion.tsx       The page's choreography
│       └── index.ts         The feature's public surface for routes
├── infrastructure/      Adapters: db (Drizzle + RLS sessions), tmdb, auth, email, security
├── shared/              Neutral helpers: result type, http parsing, formatting, site links
├── design/              Design system: foundations, components, glass, dock, surface, theme, styles
└── motion/              Motion engine: core, choreography, webgl, effects
scripts/db/              Drizzle config and hand-written SQL migrations
docs/                    Architecture and design-system documentation
```

The layers only point down: `app → features → infrastructure → shared`, with
`design` and `motion` available to the presentation layers. ESLint enforces
the boundaries, so a feature cannot import a route and infrastructure cannot
import a feature.

**Conventions**

- File and folder names are kebab-case. A file's name says what it is in the
  feature it lives in (`queries.ts`, `components/review-card.tsx`), so the
  same role has the same name everywhere.
- Server Actions return `ActionResult` (`{ success: true, ...data }` or
  `{ success: false, error }`). Writes go through `mutate()` (auth, rate
  limit, error reporting); reads go through `query()`.
- Raw values never appear in components: colour, radius, duration and
  z-index come from tokens in `src/design`.

## Getting started

Requirements: Node 24+, a Postgres 16 database (Neon works), a
[TMDB](https://developer.themoviedb.org/) read access token.

```bash
npm install
cp .env.example .env      # fill in the values
npm run db:migrate        # apply scripts/db/migrations
npm run dev
```

## Scripts

| Script                            | What it does                       |
| --------------------------------- | ---------------------------------- |
| `npm run dev`                     | Start the dev server               |
| `npm run build` / `npm start`     | Production build and server        |
| `npm run typecheck`               | TypeScript, no emit                |
| `npm run lint`                    | ESLint, including layer boundaries |
| `npm run format` / `format:check` | Prettier                           |
| `npm run db:migrate`              | Apply SQL migrations               |
| `npm run db:new <name>`           | Create an empty migration          |

## Documentation

- [Architecture](docs/architecture/README.md): how a request moves through
  rendering, the catalogue, data access, auth, the library, reviews and the
  social graph.
- [Design system](docs/design/README.md): colour, type, shape, motion,
  interaction, components and liquid glass.
