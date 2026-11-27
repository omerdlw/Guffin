# Database rule tests

Tests for the Row Level Security policies and triggers in
`scripts/db/migrations`: private profile visibility, follow requests and the
trigger-maintained counters in `account_stats`.

```sh
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/postgres npm run test:db
```

- `TEST_DATABASE_URL` must point at a **local Postgres or a Neon branch**,
  never production. Its role needs `CREATEDB`.
- Each test file creates its own throwaway database on that server, applies
  every migration in journal order, and drops it when done. The database
  named in the URL is never written to.
- Every test runs in a single transaction that is rolled back, so tests are
  independent.
- Viewers are simulated the way `src/infrastructure/db/client.ts` does it:
  `set_config('role', 'authenticated' | 'anon', true)` plus `app.viewer_id`.

When you add a migration that changes a policy or trigger, add or adjust a
test here in the same change.
