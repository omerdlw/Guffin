# Guffin Codebase Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize Guffin by ownership, remove dead code, use the framework where Guffin rebuilt it, and cut bundle and runtime cost, with no visible change.

**Architecture:** Feature folders where each unit (component, dock surface, modal) is one file that also holds its own types, constants and helpers. Shared code lives in topic-named files. `design/`, `motion/` and `lib/` stay separate top-level areas with lint-enforced import direction. Each task is a behaviour-preserving refactor, gated by a screenshot diff against a baseline captured before any change.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Motion 13, `@omerdlw/base-framework` 3.2.2, Supabase, TMDB, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-codebase-refinement-design.md`

## Global Constraints

- No visible change: animation timing, choreography, scroll feel, image sharpness and layout all stay identical. Never skip off-screen Stage animations, use native trackpad scroll, or throttle the `--tint`/`--grade` writes.
- No `types.ts`, `constants.ts`, `utils.ts` or `index.ts` barrel files anywhere in `src/` once this is done (except `design/components` folders that hold a CSS module, see Task 2). A shared file is named for what it holds.
- File boundaries: `server.ts`/`*.server.ts` start with `import "server-only"`; `actions.ts` starts with `"use server"` and exports only async functions returning `Result` from `@omerdlw/base-framework/result`. A value that server code imports must not live in a `"use client"` file.
- Dock surfaces live in `<name>-surface.tsx`, one per file, built with `defineSurface` from `@omerdlw/base-framework/dock`. Modals live in `<name>-modal.tsx`, built with `defineModal` from `@omerdlw/base-framework/modal`.
- Don't move into the framework: Confirm/useConfirm, Skeleton helpers, Backdrop, surface, media-card, passage, logo, `src/motion`.
- `AGENTS.md` is never edited. `design/rules/*.md` and `DESIGN.md` get path fixes only.
- ESLint guardrails stay: layer direction, `motion` only through `@/motion/lib`, `Z_INDEX` instead of literal z-index, no raw `duration-*`/`ease-*`. Only globs and paths change.
- Import with `@/…` from outside a folder and `./…` inside it.
- Read `node_modules/next/dist/docs/` and use Context7 before writing against a Next/React API. Read `node_modules/@omerdlw/base-framework/docs/` before using a framework API.
- Every task ends with `npm run typecheck && npm run lint && npm test && npm run build` passing and the Task 0 screenshot diff clean, then one commit. Feature tasks get one commit each.

## Review Focus

1. **Signed-in vs. signed-out branches.** Surfaces and actions that gate on `useAuth()` (comment, like, list picker, review editor) must still open sign-in when signed out and the real surface when signed in. Task 0 captures both states, and every surface task re-runs both.
2. **Moving a server/client boundary.** A constant or helper moved from a neutral file into a `"use client"` file becomes a client reference on the server, so a server component reading it gets `undefined` silently. Every task that moves values runs `npm run build` and checks the server-rendered routes in the diff (`/movie`, `/tv`, `/person`, `/account/*`).
3. **Surface first open with no hover** (touch, keyboard Enter, programmatic open from `verification-surface` → `setup-surface`). It must open with no fallback flash. Task 18 tests the touch, keyboard and programmatic paths.
4. **Store semantics when switching to `createStore`.** The framework store deep-freezes snapshots in dev and notifies only on `Object.is` change. Any store that mutates in place, or holds DOM nodes or class instances, needs `freezeSnapshots: false` or must stay hand-written. Task 17 checks each store.
5. **Effects after `exhaustive-deps` is turned on.** Adding a missing dep can make an effect re-run (re-subscribing, re-animating). Each fix keeps the same run count, using a ref or a stable callback, and is checked by eye on its route.

---

### Task 0: Visual and performance baseline

**Files (scratchpad only, never committed):** `$SCRATCH/harness/{cdp.mjs,shots.mjs,diff.mjs,perf.mjs,routes.mjs}` and `$SCRATCH/baseline/`, where `$SCRATCH` is the session scratchpad directory.

**Interfaces:**
- Produces: `node $SCRATCH/harness/shots.mjs <outDir>` writes one PNG per route×state×overlay. `node $SCRATCH/harness/diff.mjs baseline <outDir>` prints one line per changed image and exits 1 if any image changed. `node $SCRATCH/harness/perf.mjs <outFile.json>` writes metrics. Every later task uses all three.

- [ ] **Step 1: Write `cdp.mjs`.** Launch `~/Library/Caches/ms-playwright/chromium-1194/chrome-mac/Chromium.app/Contents/MacOS/Chromium` with `--headless=new --remote-debugging-port=0 --user-data-dir=$SCRATCH/profile --window-size=1440,900`. Speak CDP over Node's global `WebSocket`. No npm packages; downloads are blocked in this environment.
- [ ] **Step 2: Write `routes.mjs`.**
  - Routes: `/`, `/movie/27205`, `/movie/27205/reviews`, `/tv/1396`, `/tv/1396/season/1`, `/person/525`, `/oscars`, `/top-100`, `/directors`, `/privacy`, `/terms`, `/account`, and `/account/<seed>/{,activity,diary,likes,lists,progress,reviews,watched,watchlist}`. `<seed>` is the username of `SEED_LOGIN` from `.env.local`.
  - States: `signed-out`, and `signed-in` through the seed sign-in route `/api/auth/seed`.
  - Overlays: every dock surface and modal, each opened by clicking its real trigger. Map each overlay to a trigger selector, using the surfaces listed in Tasks 5–16.
- [ ] **Step 3: Write `shots.mjs`.** For each route: navigate, wait for network idle, then 6 s for the opening choreography, then take a full-viewport PNG. Viewports are 1440×900 and 390×844.
- [ ] **Step 4: Write `diff.mjs`.** Load the two PNGs into a Chromium page through CDP, draw both into canvases, and count pixels whose max channel delta is above 24. An image counts as changed when more than 0.2% of pixels differ. Also write a red-overlay diff PNG next to it.
- [ ] **Step 5: Write `perf.mjs`.**
  - Interactions: opening on `/movie/27205` and `/tv/1396`, a 3 s wheel scroll on `/person/525` and `/account/<seed>`, opening the list-picker surface, and typing "nolan" into search.
  - Measures per interaction: long-animation-frame count and total duration (`PerformanceObserver` type `long-animation-frame`), and style+layout time from `Performance.getMetrics` before and after.
  - Heap: JS heap after 10 back/forward navigations between movie and person.
  - 5 runs each with a warm profile; record the median and min–max.
- [ ] **Step 6: Capture the baseline from a prod build at `5d3c13b`.**
  Run: `npm run build && npm run start` (port 3000), then `shots.mjs $SCRATCH/baseline`, then run `shots.mjs $SCRATCH/baseline2` and `diff.mjs baseline baseline2`.
  Expected: diff exits 0. If the same build doesn't compare clean, raise the wait or the threshold until it does, and write the final values into `diff.mjs`.
- [ ] **Step 7: Capture perf and route sizes.** Save `perf.mjs $SCRATCH/perf-before.json`, and save the `next build` route-size table to `$SCRATCH/build-before.txt`. Nothing is committed.

### Task 1: Cleanup

**Files:**
- Delete: `FILE_STRUCTURE.md`, `src/features/media/media-badge.tsx`, `src/**/.DS_Store`.
- Modify: `.gitignore` (add `tsconfig.tsbuildinfo`, `.DS_Store`), `package.json`, plus the source files listed below.

- [ ] **Step 1: Delete these unused exports**, after grepping each name once more as a string (`"name"`, `` `name` ``) to rule out dynamic use:
  - `ControlSize` (`design/foundations/geometry.ts`) and the `Tone` type (`tones.ts`)
  - `useHomeGlimpse` (`home/motion.tsx`) and `featureTitleClass` (`home/utils.ts`)
  - `BACKDROP_REACH`/`BACKDROP_SPAN`/`BACKDROP_STEP`, `useSalonPart` and `pixelsOf` (`spotlights/*`)
  - `discoverShows` and `findShowByImdb` (`lib/tmdb/server.ts`, plus their `tv.ts` API methods if nothing else calls them)
  - `ShowCastMember` and `ShowCrewMember` (`lib/tmdb/shared.ts`)
  - `WALL_FOCUS`, `WALL_GLOW_RUNG`, `WALL_SOFT_RUNG` and `HAZE_CAP` (`motion/*`), and `useTouch` (`motion/react.tsx`)

  Keep `onRouterTransitionStart` and `database.types.ts`.
- [ ] **Step 2: Remove `export` from symbols used only in their own file.** Re-run `$SCRATCH/unused.mjs` to get the list.
  Expected: `node $SCRATCH/unused.mjs . | grep -v "UNREFERENCED\|instrumentation\|database.types"` prints nothing.
- [ ] **Step 3: Remove unused dependencies.**
  - Remove `@iconify-icon/react` and `tailwind-merge` from `package.json`, run `npm install`, then build. If the build or `@source` fails, restore the one that broke it and say why in the commit message.
  - Remove the `@typescript/native` devDependency if `grep -rn "tsgo" package.json .vscode` finds nothing.
- [ ] **Step 4: Fix stale references.** Grep `docs/motion-engine.md`, `src/proxy.ts` and `FILE_STRUCTURE` across the repo and fix or delete each reference.
- [ ] **Step 5: Gate.** Run typecheck, lint, test and build, run `shots.mjs $SCRATCH/t1`, then `diff.mjs baseline t1`. Expected: everything passes and the diff exits 0.
- [ ] **Step 6: Commit** with the message `Remove dead code, unused dependencies and FILE_STRUCTURE.md`.

### Task 2: Design system by ownership

**Files:**
- Create: `src/design/variants.ts` (every component class recipe: the current contents of `design/components/*/variants.ts` and `design/foundations/variants.ts`), and `src/design/components/<name>.tsx` (one file per component that adds Guffin behaviour).
- Delete: the pass-through folders `avatar/`, `checkbox/`, `highlight-group/`, `image/`, `indicator/`, `loader/`, `switch/`, every `design/components/*/index.ts`, and `design/hooks/`.
- Move:
  - `hooks/use-confirm.ts` goes into `components/confirm.tsx`; `hooks/use-dock-link-click.ts` goes into `components/link.tsx`.
  - `surface/{anatomy,prose,search,stage,variants}` become `components/surface.tsx` (client parts) and `components/surface-anatomy.ts` (neutral class constants that server files import).
  - `tooltip/classes.ts` goes into `components/tooltip.tsx`.
  - Components with a CSS module keep a folder: `components/carousel/{carousel.tsx,carousel.module.css}` and `components/tooltip/{tooltip.tsx,tooltip.module.css}`.

**Interfaces:**
- Produces:
  - Framework components (`Avatar`, `Button`, `Checkbox`, `HighlightGroup`, `Image`, `Indicator`, `Spinner`/loader, `Switch`) are imported from `@omerdlw/base-framework/ui`.
  - Guffin components are imported from `@/design/components/<name>`.
  - Class recipes (`buttonVariants`, `linkVariants`, `mediaCardVariants`, `rowVariants`, …, same names as today) are imported from `@/design/variants`.
  - `useConfirm`/`useConfirmedAction` come from `@/design/components/confirm`, and `useDockLinkClick` from `@/design/components/link`.

- [ ] **Step 1: Make the moves and deletions above,** then update every importer. Use `grep -rl "@/design/components/<x>"` per folder.
- [ ] **Step 2: Fold small foundation files.** Fold `design/foundations/cn.ts` (3 lines) into `design/ui.ts` if it only re-exports `createCn` output; otherwise keep it. Keep `foundations/{geometry,layers,layout,tones,z-index}.ts`, which are shared tokens with many users.
- [ ] **Step 3: Split `src/app/theme.ts` (768 lines)** into `src/design/theme/<module>.ts`, one per framework module key in `themes` (dock, modal, context-menu, notification, controls, ambient, navigation; use whatever keys actually exist). Add `src/design/theme.ts` to assemble and export `themes`, and point `app/providers.tsx` at `@/design/theme`. Move shared motion helpers (`tween`, `dockTime`, `dockEase`) into `src/design/theme/motion.ts`.
- [ ] **Step 4: Update ESLint.** Make the `Z_INDEX` message path in `eslint.config.mjs` match.
- [ ] **Step 5: Gate,** with a diff directory of `t2`.
- [ ] **Step 6: Commit** with the message `Organize the design system by ownership`.

### Task 3: Motion engine by ownership

**Files:**
- Delete: `src/motion/types.ts`, `src/motion/constants.ts`, `src/motion/utils.ts`.
- Create, only for symbols used by two or more motion modules:
  - `src/motion/math.ts`: `mix`, `clamp`, `unitClamp`, `round`, `cubic`, `bezier`, `spring`, `springAt`, `springForce`, `pullSpring`, `tune`, `elapsed`, `within`, `withinWindow`, `staggered`, `balance`, `EPSILON`, `PHI`, and the like.
  - `src/motion/dom.ts`: `rectOf`, `layerOf`, `setMask`, `clearMask`, `styleOf`, `topOf`, `layoutTop`, `sameViewport`, `samePointer`, `plainClick`, `leavesPage`, `changesPage`, `isFilmPage`, `parsePosition`, `coverOf`.
  - `src/motion/reduced-motion.ts`: `subscribeReducedMotion`, `readReducedMotion`, `reducedMotionOnServer`, `REDUCED_MOTION_QUERY`, and `useHydratedReducedMotion` from `react.tsx`.
  - `src/motion/tint.ts` merged into the existing `color.ts`: `tintOf`, `tintCss`, `toGamma`, `TINT_*`.
- Modify: every `src/motion/*.ts(x)` gets its own constants and types inline. `CURSOR_*` and the cursor types go to `cursor.tsx`, `MARQUEE_*` to `marquee.tsx`, `PROJECTION_*` to `gl-projection.ts`/`projection.tsx`, `ENGINE_*`, `Engine`, `Clock` and friends to `engine.ts`, `KIT_*` to `kit.tsx`, `PASSAGE_*` to `passage.ts`, `SCROLL_*` to `scroll.ts`, `SCREEN_*` to `screen.tsx`, `WALL_*` to `wall.tsx`, `TILT_*` to `tilt.tsx`, `EXPOSE_*` to `expose.tsx`, and `CARRY_*` to `carry.ts`.

**Interfaces:**
- Produces: all public motion APIs keep their names. Features import from the defining module (`@/motion/react`, `@/motion/kit`, `@/motion/time`…). A type that features use (for example `PartProps`, `Matter`) is exported from the module that defines the component or function it describes.

- [ ] **Step 1: Map each symbol to its users.** For every symbol in the three files, count its users with `grep -rlw <sym> src` and write the result to `$SCRATCH/motion-map.txt`. A symbol with one user goes into that module; one with several users goes to the topic file above whose subject it is.
- [ ] **Step 2: Move the symbols, update imports, delete the three files.**
- [ ] **Step 3: Gate** (`t3`), then check opening choreography and cursor by eye on `/movie/27205`, `/`, and `/top-100`.
- [ ] **Step 4: Commit** with the message `Organize the motion engine by ownership`.

### Tasks 4–16: Features

The same steps apply to every feature task:

1. Dissolve the feature's `types.ts`/`constants.ts`/`utils.ts` the way Task 3 did (single user means inline; several users means the named shared file listed in the task).
2. Apply the file map.
3. Convert each `create…SurfaceEntry` into a `defineSurface` definition exported as `<camelName>Surface` from its `-surface.tsx` file. Call sites switch to `<camelName>Surface.open(openSurface, props)` or `useSurface(<camelName>Surface)`. Before the first conversion, read `docs/modules/dock.md` §8 to confirm the `defineSurface` def fields map 1:1 to today's descriptor fields (`component`, `props`, `title`, `width`, `action`, `extensions`…).
4. Switch any `useModal()` called with no argument to `useModalActions()`, since the bare form re-renders on every modal state change.
5. Quality pass on every file the task touches:
   - remove wrappers that only forward props
   - cut prop chains deeper than two levels (read context or move state down)
   - derive types from `database.types`/zod schemas instead of restating them
   - delete comments that restate code
   - rename vague names (`data`, `item`, `shared`, `helpers`) to what they hold
6. Gate with a diff directory of `t<N>`, which must include that feature's routes and overlays in both states.
7. Commit with the message `Organize <feature> by ownership`.

**Task 4: `theme`** (do this first; it fixes a layer violation).
- `lib/theme.ts` (a `"use client"` React store inside `lib`) moves to `features/theme/store.ts`; `lib/theme-script.ts` moves to `features/theme/script.ts`; `features/theme/command.tsx` and its constants become `features/theme/theme-command.tsx`.
- Importers: `app/layout.tsx`, `app/providers.tsx`.

**Task 5: `auth`.** `sign-in-surface.tsx` (`signInSurface`, `useOpenSignIn`), `verification-surface.tsx` (`verificationSurface`), `provider.tsx`, `client.ts`, `server.ts`, `notice.tsx`. Shared: `errors.ts` (`getAuthErrorMessage`, `AUTH_ERROR_CODES`, `WEBAUTHN_ERRORS`) and `session.ts` (neutral: `toAuthUser`, `authStateFrom`, `sanitizeNextPath`, `normalizeEmail`, `isSeedEmail`, `AuthUser`, `AuthState` and the other types used by both client and server).

**Task 6: `account` and `social`.**
- `account/`: `provider.tsx`, `actions.ts` (library, diary and favorite actions only), `client.ts` (account and notification fetchers only), `server.ts`, `tiles.tsx`, `notifications-surface.tsx`, `setup-surface.tsx`, `bio-surface.tsx`, and `account.ts` (neutral shared: `PublicAccount`, `CurrentAccount`, `toPublicAccount`, `toCurrentAccount`, avatar URL helpers, library kinds).
- `social/`: gains `follows-surface.tsx` (from `account/social.tsx`), `hooks.ts` (from `account/hooks.ts`, if all its users are social), `actions.ts` (adds `followUserAction` and `unfollowUserAction` from `account/actions.ts`), and `client.ts` (follow and request fetchers from `account/client.ts`). It also has `proof.tsx` and `proof-surface.tsx`, if `proof.tsx` opens a surface.

**Task 7: `reviews`.** `editor-surface.tsx` (`reviewEditorSurface`), `controls.tsx`, `rating.tsx` + `rating.module.css`, `movie-action.tsx`, `pager.ts`, `actions.ts`, `server.ts`. Shared: `review.ts` (neutral: `REVIEW_MIN_LENGTH`, `REVIEW_MAX_LENGTH`, sort and filter guards, `normalizeReviewInput`, `getReviewValidationError`, `MovieReview` and the other types).

**Task 8: `lists`.** `form-surface.tsx`, `order-surface.tsx`, `picker-surface.tsx`, `buttons.tsx`, `popular.tsx`, `actions.ts`, `server.ts`. Shared: `list.ts` (neutral: limits, `sanitizeListInput`, `toListSummary`, types).

**Task 9: `media` and `detail`.**
- `media/`: `media-type.tsx` (absorbs `context.tsx`), `server.ts`, `vitrin.ts` (neutral: `readVitrinParam`, `withVitrin`, `mediaNoun`, `VITRIN_*`, `MEDIA_TYPE_COPY`).
- `detail/`: `image-modal.tsx` (`ImageModal` from `gallery.tsx`), `gallery.tsx`, `awards.tsx`, `layout.tsx`, `stage.tsx`, `motion.tsx`, `reviews-header.tsx` (moved from `movie/reviews-header.tsx`, since tv uses it too), `awards-data.ts` (neutral: `flattenAwards`, `groupAwards`, `filterAwards`, `buildAwardStats`, `hasAwards`, …).

**Task 10: `movie`.**
- Files: `watch-providers-surface.tsx`, `people-modal.tsx` (the cast modal from `cast.tsx`), `video-modal.tsx` (the video modal from `gallery.tsx`, if it defines one), `cast.tsx` + `cast.module.css`, `gallery.tsx` + `gallery.module.css`, `media.tsx`, `reviews.tsx`, `collection.tsx`, `stage.tsx`, `views.tsx`, `view.tsx`, `skeleton.tsx`, `actions.ts`, `server.ts`.
- Shared: `movie.ts` (neutral: `parseMovieId`, `formatRuntime`, `formatReleaseDate`, `getDirectors`, `getWriters`, `describeMovie`, `TITLE_LIMITS`, `movieTitleClass`, `MovieArtwork`, …) and `providers.ts` (neutral provider helpers, if `view.tsx` and the surface both use them).

**Task 11: `tv`.** `status-surface.tsx` (`showStatusSurface`, `ShowStatusAction`, `announceShowChange`), `episodes.tsx`, `progress.tsx`, `seasons.tsx`, `stage.tsx`, `view.tsx` (split `ShowPageContent` and `SeasonPageContent` into `view.tsx` and `season-view.tsx`), `actions.ts`, `server.ts`. Shared: `show.ts` (neutral: statuses, `parseShowId`, `parseSeasonNumber`, `episodeKey`, `toShowProgress`, types).

**Task 12: `person`.** `bio-surface.tsx` (from `sections.tsx`), `filmography.tsx` and `gallery.tsx` (split from `sections.tsx`), `career.tsx`, `header.tsx`, `views.tsx`, `view.tsx`, `skeleton.tsx`, `credits.ts` (absorbs the credit helpers from `utils.ts`), `person.ts` (neutral: `parsePersonId`, `describePerson`, `calculateAge`, `formatDate`, types).

**Task 13: `profile`.** Use subfolders per page.
- `profile/` root: `shell.tsx`, `hero.tsx`, `motion.tsx`, `controls.tsx`, `filter-bar.tsx`, `blocks.tsx`, `skeleton.tsx`, `access.ts`, `metadata.ts` (`getAccountMetadata`), `params.ts` (neutral: `readPageParam`, `parse*Filters`, `pageRange`, `pageCount`, `pageWindow`), and `profile.ts` (neutral shared types and mappers such as `toMediaItem`, `toListCard`, `toReviewCard`).
- `profile/overview/{view.tsx,server.ts}`
- `profile/activity/{view.tsx,feed.tsx,calendar.tsx,server.ts}`
- `profile/diary/{view.tsx,month.tsx,server.ts}` (with `getDiaryMonth` from `progress.ts`)
- `profile/lists/{view.tsx,list-view.tsx,lists.tsx,server.ts}`
- `profile/reviews/{view.tsx,list.tsx,server.ts}`
- `profile/library/{view.tsx,server.ts}`, covering `AccountMediaView` for watched, watchlist and likes
- `profile/progress/{view.tsx,guides.tsx,server.ts}`
- Split `profile/view.tsx` (694 lines) and `profile/server.ts` (498 lines) along these folders. Update the `app/account/[username]/**/page.tsx` imports.

**Task 14: `home`.** Flat folder. Drop the triad. Shared: `format.ts` (`formatCompact`, `formatWhole`, `formatReleaseDay`, `formatRelativeTime`), `feed.ts` (neutral: `HomeFeed` and the types `server.ts` and the sections share), and `shelf.tsx` (rename of `shared.tsx`).

**Task 15: `search`.** `search-command.tsx` (rename of `action.tsx`), `use-search.ts` (rename of `hooks.ts`), `results.tsx`, `sections.tsx`, `motion.tsx`, `server.ts`, `query.ts` (neutral: `normalizeQuery`, `isSearchable`, `textMatch`, `bestMatch`, scoring and response types, which server and client share).

**Task 16: `spotlights`, `settings`, `legal`, `catalog`, `artwork`.**
- `spotlights/`: `shell.tsx`, `wall.tsx`, `marks.ts`, `motion.tsx`, `server.ts`, `skeleton.tsx`, `oscars/{view.tsx,oscars.module.css}`, `directors/{view.tsx,layout.ts}`, `top-100/{view.tsx,tunnel.ts,bloom.ts,top-100.module.css}` (`gl.ts` becomes `bloom.ts`), `catalog.ts` (neutral data constants: `BEST_PICTURE`, `DIRECTORS`, `CANON`).
- `settings/`: `settings-surface.tsx`, the panels as they are, and `panel.tsx` (rename of `shared.tsx`).
- `legal/`: `view.tsx`, `documents.ts` (from `constants.ts` + `utils.ts` + `types.ts`).
- `catalog/`: `quality.ts` (from `utils.ts` + constants + types; keep `quality.test.ts`, renamed from `utils.test.ts`), `fixtures.ts`, `server.ts`.
- `artwork/`: `artwork.tsx` + `store.ts` (neutral storage helpers).

### Task 17: Framework fit

**Files:** `features/artwork/store.ts`, `features/search/use-search.ts`, `features/reviews/pager.ts`, `features/theme/store.ts`, `motion/react.tsx` and `motion/kit.tsx` (check only), the 21 `useToast` callers, `home/opening.tsx`, `search/search-command.tsx`, `spotlights/shell.tsx`, `account/provider.tsx`, `eslint.config.mjs`.

- [ ] **Step 1: Stores.** Replace each hand-written `useSyncExternalStore` store with `createStore` from `@omerdlw/base-framework/utils` plus `useStore` from `/hooks`. Leave a store hand-written if it mutates in place or holds DOM nodes or class instances (`motion/*` most likely) and can't take `freezeSnapshots: false` cleanly. Record each decision in the commit message.
- [ ] **Step 2: Toasts.** Where a caller does `if (result.ok) toast.success(x) else toast.error(result.error)` and nothing else, use `toast.fromResult(result, { success: x })`. Callers that also branch on the result stay as they are.
- [ ] **Step 3: Dock registration.** For each `useDockRegistration` call, compare it with `usePage({ dock })` in `docs/modules/kernel.md`. Switch only if the registered item, its timing and its cleanup are identical; otherwise leave it with no change.
- [ ] **Step 3b: Hooks.** Compare `useConfirm`/`useConfirmedAction` and `useDockLinkClick` with `@omerdlw/base-framework/hooks` and `/dock`. If the framework already provides one with the same behaviour, delete Guffin's and switch the callers.
- [ ] **Step 4: Lint.** Remove `"react-hooks/exhaustive-deps": "off"` from `eslint.config.mjs`, run lint, and fix each finding following Review Focus 5.
- [ ] **Step 5: Gate** (`t17`), then commit with the message `Use framework stores, toasts and registration`.

### Task 18: Bundle and runtime performance

**Files:**
- Create: `src/design/lazy-surface.ts`.
- Modify: every `-surface.tsx` and `-modal.tsx` call site, `spotlights/top-100/view.tsx`, `motion/projection.tsx`, and whichever client files Step 4 turns into server components.

**Interfaces:**
- Produces: `lazySurface<P>(load: () => Promise<{ default: SurfaceDefinition<P> }>): LazySurface<P>`, where `LazySurface<P>` is `{ preload(): Promise<SurfaceDefinition<P>>; open(openSurface: DockActions["openSurface"], props: P): Promise<SurfaceResult> }`, and `useSurfaceIntent<P>(surface: LazySurface<P>): { intent: { onPointerEnter; onFocus; onTouchStart }; open(props: P): Promise<SurfaceResult> }`. `preload` memoizes one promise. `open` awaits `preload()` and then calls the definition's `.open`. A matching `lazyModal`/`useModalIntent` pair with the same shape covers modals.

- [ ] **Step 1: Test the lazy helpers.** Write `src/design/lazy-surface.test.ts`:
  - `preload` calls `load` once across 3 calls.
  - `open` before `preload` resolves still calls the definition's `open` exactly once, with the given props.
  - A rejected `load` rejects `open`, and a later `preload` retries (the cached promise is cleared on failure).
- [ ] **Step 2: Run the test, implement, run it again.** `npx vitest run src/design/lazy-surface.test.ts` should FAIL before the implementation and PASS after.
- [ ] **Step 3: Switch every trigger to the lazy helpers.**
  - Every surface and modal trigger spreads `intent` on its button and calls `open`.
  - Programmatic opens with no trigger (verification → setup, post-sign-in redirects) call `preload()` as soon as their parent mounts.
  - Each `-surface.tsx` and `-modal.tsx` becomes `export default` of its definition, imported only through `lazySurface(() => import("./x-surface"))`.
- [ ] **Step 4: Move `"use client"` boundaries down.** For each of the 114 client files, if it uses no hook, event handler or browser API, remove `"use client"` and confirm the build. If it does, check whether a server parent can render most of it and leave only a small client leaf. Only do this where the build's route JS goes down.
- [ ] **Step 5: Split WebGL code.** Load `spotlights/top-100/tunnel.ts` + `bloom.ts` and `motion/gl-projection.ts` with `import()` inside the effect that mounts them. The first frame still shows the same placeholder or `<img>` as today.
- [ ] **Step 6: Data loading.** In each `server.ts` and `view.tsx`:
  - Wrap per-request reads that two components call in `React.cache`.
  - Turn independent sequential `await`s into `Promise.all`.
  - List every change in the commit message.
- [ ] **Step 7: Motion runtime audit.** For every `addEventListener`, `ResizeObserver`, `IntersectionObserver` and `requestAnimationFrame` in `src/` (21, 11, 6 and 6 files), confirm removal or disconnect on unmount, and confirm no layout read (`getBoundingClientRect`, `offset*`) after a style write in the same frame. Fix only what is leaked or thrashing, and keep each fix's visible result identical.
- [ ] **Step 8: Measure and gate.**
  - Run `perf.mjs $SCRATCH/perf-after.json` and compare it with the before file.
  - Revert any Step 4–7 change that doesn't beat the before min–max range and doesn't remove provable waste.
  - Throttled check: CDP `Network.emulateNetworkConditions` at 9 Mbps down and 40 ms RTT, cold cache. Click the list-picker trigger with no hover, and confirm in the trace that the surface enter starts within 100 ms of the click with no fallback frame. Click again after a hover, and confirm the enter starts on the frame after the click.
  - Run the screenshot diff (`t18`).
- [ ] **Step 9: Commit** with the message `Load surfaces on intent and trim client JS`, including the before/after numbers in the body.

### Task 19: Docs and final verification

**Files:** `DESIGN.md`, `design/rules/*.md`, `CLAUDE.md`, `$SCRATCH/report.md`.

- [ ] **Step 1: Fix paths in the design docs.** Grep each `src/` path cited in `DESIGN.md` and `design/rules/*.md`, and update the ones that moved.
- [ ] **Step 2: Update `CLAUDE.md`.** Under "Framework", add: "`AGENTS.md`'s file-organization rules (feature `index.ts` barrels, `src/infrastructure`) do not apply to Guffin; code lives with its owner."
- [ ] **Step 3: Final verification.** Run typecheck, lint, test, build, the full screenshot diff against the baseline, and Playwright MCP walkthroughs signed in and out: sign in, review editor, list picker, search, theme command, and settings. Then run `superpowers:verification-before-completion`.
- [ ] **Step 4: Write the report and commit.** Write the report with the line and file count before and after, the route JS table before and after, the perf table, and anything left undone and why. Commit with the message `Update docs for the new structure`.
