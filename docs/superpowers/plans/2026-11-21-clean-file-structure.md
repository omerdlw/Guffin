# Clean File Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic `src/lib` bucket with explicit infrastructure and shared modules while preserving app behavior.

**Architecture:** Keep app routes and domain features in place. Move adapter code into `src/infrastructure`, move neutral app helpers into `src/shared`, then update imports and confirm no old paths or forbidden dependencies remain.

**Tech Stack:** Next.js 16, TypeScript, React 19.

**Spec:** `docs/superpowers/specs/2026-11-21-clean-file-structure-design.md`

## Global Constraints

- `src/features/*` must never import from `src/app/*`.
- `src/infrastructure/*` must never import from `src/features/*` or `src/app/*`.
- Server database and adapter files must begin with `import "server-only";` where they are server-only.
- Keep behavior, routes and data contracts unchanged.
- Do not add or run tests unless requested.

## Review Focus

- Client modules must not gain imports from server-only infrastructure; preserve existing client/server split.
- No infrastructure module may depend on a feature or route.
- All imports must resolve after directory moves.
- No `@/lib` imports or residual `src/lib` files may remain.
- Existing in-progress user changes must remain intact.

---

### Task 1: Move adapters and shared helpers

**Files:**

- Move `src/infrastructure/db/*` to `src/infrastructure/db/*`.
- Move `src/infrastructure/tmdb/*` to `src/infrastructure/tmdb/*`.
- Move `src/infrastructure/auth/*` to `src/infrastructure/auth/*`.
- Move `src/lib/{email,env,http,security,sentry}.ts` into matching `src/infrastructure/{email,config,http,security,sentry}` locations.
- Move `src/lib/{ambient,format,project}.ts` to `src/shared/`.
- Update every TypeScript import referencing the old paths.

**Interfaces:** Existing exports and signatures stay unchanged; only module paths change.

- [x] Create target directories and move files without overwriting user edits.
- [x] Rewrite all old `@/lib/...` imports to the new explicit paths.
- [x] Confirm no imports from features/app exist in infrastructure and no `@/lib` references remain.

### Task 2: Verify structure and imports

**Files:**

- Inspect all moved source files and all changed import sites.
- Remove empty `src/lib` directory if it remains.

**Interfaces:** No public runtime interface changes.

- [x] Search the repository for `@/lib` and `src/lib` references; none remain.
- [x] Inspect the working tree; pre-existing changes remain present and moved files are intact.
- [x] Run `npm run typecheck` and `npm run lint` with installed dependencies; both pass. No tests were added or run.
