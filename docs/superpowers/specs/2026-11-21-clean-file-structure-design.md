# Clean File Structure Design

## Intent

Make the application structure easy to navigate by making domain features, infrastructure adapters, shared helpers, and visual systems explicit, while preserving runtime behavior and the current in-progress feature refactor.

## Goals

- Keep `src/app` focused on Next.js routes and composition.
- Keep domain capabilities under `src/features`, with one barrel per feature.
- Replace the generic `src/lib` bucket with `src/infrastructure` for adapters and `src/shared` for framework-independent app helpers.
- Preserve `src/design` and `src/motion` as first-class visual systems.
- Keep client-safe and server-only module boundaries explicit.

## Non-goals

- Change feature behavior, route behavior, styling, or data contracts.
- Rename established domain features or split the current movie/detail feature boundary absent evidence that it is incorrect.
- Change the four-layer project architecture beyond naming its existing shared utility responsibility explicitly.

## Approaches

1. **Keep `src/lib` and add more folders inside it.** Lowest migration cost, but retains an ambiguous catch-all.
2. **Move everything into `src/infrastructure`.** Removes the catch-all but mislabels presentation-neutral helpers such as route builders and formatting.
3. **Use `src/infrastructure` plus `src/shared` (chosen).** Adapters stay in infrastructure; neutral app-wide helpers live in shared. This creates clear ownership without changing feature boundaries or behavior.

## Target Structure

- `src/app`: route handlers, pages, layouts, metadata and provider composition.
- `src/features/<domain>`: domain capabilities, UI, server operations and local subdomains; each feature exposes a deliberate `index.ts`.
- `src/infrastructure/{auth,config,db,email,http,security,sentry,tmdb}`: external systems, runtime configuration and adapters. Infrastructure must not import from `app` or `features`.
- `src/shared/{ambient,format,project}`: small app-wide helpers with no dependency on feature or route modules.
- `src/design`: design tokens, components, foundations and styles.
- `src/motion`: reusable motion primitives and choreography.

## Constraints

- Follow the repository's Next.js guide before changing Next.js APIs; this work changes file locations and imports only.
- Keep existing public behavior and package dependencies unchanged.
- Preserve `import "server-only"` on database and server adapter modules and do not add it to client-safe shared modules.
- Avoid broad wildcard barrels for infrastructure; direct subpath imports remain explicit.

## Acceptance

- No source imports resolve through `@/lib` and `src/lib` is removed.
- Every infrastructure file has no dependency on `src/app` or `src/features`.
- Existing feature barrels remain intact and routes continue to use the feature surface.
- TypeScript/build verification is run if available; no tests are added or run unless requested.
