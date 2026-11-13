# Guffin: final codebase refinement

## Intent

Guffin is close to release. The owner wants a pass across the whole codebase so it can be maintained and extended long term. The pass covers four areas: cleanup, structure, code quality, and fit with `@omerdlw/base-framework`, plus a performance audit. Nothing the user sees should change. Every change has to show a real gain in readability, ownership, bundle size or runtime cost. Moving files around for the sake of it is not the goal.

## Goals

- Remove dead files, exports, dependencies and stale docs.
- Use a structure where the folder tree reads as the product and a file holds a whole unit (one dock surface, one modal, one component) together with its types, constants and helpers.
- Make boundaries clear: server / client / server action, owned / shared, Guffin / framework.
- Use framework capabilities where Guffin rebuilt them by hand, without moving Guffin-owned design or motion into the framework.
- Reduce render work, client JS and motion overhead, but only in ways nobody can see.
- Finish with lint, typecheck, tests and `next build` all green.

## Non-goals

- Feature work, visual redesign, copy changes.
- Changing `@omerdlw/base-framework` itself.
- Changing the Supabase schema or TMDB data shape.

## Anti-goals (a failure even if it "works")

- Any visible change: animation timing, choreography, scroll feel, image sharpness, layout. The owner has already rejected skipping off-screen Stage animations, native trackpad scroll, and throttling the tint (`--tint`/`--grade` writes).
- A new rulebook that replaces `FILE_STRUCTURE.md`, a barrel per feature, or anything else that brings back pattern-for-pattern's-sake.
- Memoization or code splitting with no measured or clearly explained reason.
- Moving things the owner decided stay in Guffin into the framework: Confirm/useConfirm, Skeleton helpers, Backdrop, surface, media-card, passage, logo, and the motion engine.

## Constraints

- Branch `design-without-defaults`. The starting point is commit `9e430a6`; the baseline has typecheck, lint and 71/71 tests green.
- The framework is installed from npm (3.2.2). `AGENTS.md` is a verbatim copy of the framework template and is recopied on framework updates. It is not edited. Where it describes file organization (an "`index.ts` barrel per feature", "`src/infrastructure`"), Guffin deliberately doesn't follow it, and `CLAUDE.md` says so in one line. Its API rules still apply: subpath imports, `Result` from actions, dock/modal for overlays.
- `design/rules/*.md` and `DESIGN.md` are the visual and motion contract. They stay, but any file path they cite gets updated when the file moves.
- Next.js 16 and React 19. Read `node_modules/next/dist/docs/` and use Context7 before writing against an API.
- Performance claims need measurement. Use a warm headless Chrome CDP harness against a prod build (Performance.getMetrics, tracing, LoAF). Dev-mode numbers don't count.

## Approaches considered

1. **Feature folders, organized by ownership (chosen).** One folder per product area, with code living next to its owner. Files split only on real boundaries.
2. **Route-first** (`app/**/_parts`). Rejected: reviews, lists, sign-in and most dock surfaces are opened from many routes, so a large shared folder would come back anyway.
3. **By kind** (global `surfaces/`, `modals/`, `hooks/`). Rejected: it scatters a single feature across five folders, the same problem we're removing, at a larger scale.

The owner picked 1 and removed every previous organization rule.

## Decisions

### Organization

- `FILE_STRUCTURE.md` is deleted. Nothing replaces it.
- **Co-location.** A type, constant or helper lives in the file that uses it. It moves to a shared file only when two or more files use it, and that shared file is named for what it holds (`credits.ts`, `pager.ts`), never `utils.ts`, `constants.ts` or `types.ts`. Each feature's `types.ts`/`constants.ts`/`utils.ts` triad is dissolved. That's 19 features plus the `motion/` triad, about 1.9k lines.
- **Real file boundaries:** `server.ts` (`server-only`), `actions.ts` (`"use server"`), client components, and server components. Shared code that both server and client import stays in a neutral file with no `"use client"`.
- **Dock surfaces:** one file per surface, `<name>-surface.tsx`, holding the `create…SurfaceEntry` factory and the surface body. 14 surfaces today, for example `lists/picker-surface.tsx` and `auth/sign-in-surface.tsx`. The hook that opens a surface (`useOpenSignIn`) lives in that same file.
- **Modals:** same rule, `<name>-modal.tsx`. Today that's the image modal in `detail/gallery.tsx` and the cast modal in `movie/cast.tsx`.
- **Big features get subfolders** only where they group by purpose. `profile` (about 7.8k lines, 21 files) is the clear case: a page per tab plus a shared shell. Small features stay flat.
- **Small or overlapping features get merged** when they share an owner: `theme/` (2 files), `media/` (7 files, 213 lines), `social/` vs `account/social.tsx`, `detail/` vs `movie`/`tv`/`person`, `catalog/` vs `lib/tmdb`. The test: after the merge, can someone find the code without being told?
- **Design system:** each component folder that only re-exports the framework (`avatar`, `checkbox`, `highlight-group`, `image`, `indicator`, `loader`, `switch`, and the re-export half of `button`) is removed, and callers import the framework's `ui` directly, styled through `UiProvider`. A component that adds Guffin defaults becomes a single file `design/components/<name>.tsx`, plus a CSS module only if it has one. `app/theme.ts` (768 lines of framework-module theming) is split per module under `design/` (dock, modal, menu, notification…), because it's design, not routing.
- **The ESLint config stays as it is.** It has the layer-direction rules, `motion` imported only through `@/motion/lib`, no literal z-index (use `Z_INDEX`), and no raw `duration-*`/`ease-*`. These guard architecture and the visual contract, not file layout, and `design/rules` cites them. Only path globs and messages change when files move (for example, the `Z_INDEX` path). *(Builder's call.)*

### Cleanup (confirmed by a reference scan at `9e430a6`)

- Unused exports: `ControlSize`, `Tone` (type), `useHomeGlimpse`, `featureTitleClass`, `MediaBadge` (whole file), `BACKDROP_REACH`/`SPAN`/`STEP`, `useSalonPart`, `pixelsOf`, `discoverShows`, `findShowByImdb`, `ShowCastMember`/`ShowCrewMember`, `WALL_FOCUS`/`WALL_GLOW_RUNG`/`WALL_SOFT_RUNG`, `useTouch`, `HAZE_CAP`. Before deleting each one, re-check it against dynamic or string use. `onRouterTransitionStart` and `database.types.ts` are kept because Next and Supabase use them by convention.
- About 30 more exports are used only inside their own file and should not be exported.
- Dependencies: `@iconify-icon/react` and `tailwind-merge` aren't imported by Guffin; the framework brings them in. Remove them unless the Tailwind `@source` or a type needs them. Check whether `@typescript/native` (tsgo) has a script or editor use, and remove it if not.
- Stray files: `src/**/.DS_Store`, `tsconfig.tsbuildinfo` (should be gitignored), and stale references to `docs/motion-engine.md` and `src/proxy.ts`.

### Framework fit

- Hand-written external stores using `useSyncExternalStore` (`artwork`, `search/hooks`, `reviews/pager`, `lib/theme`) move to the framework's `createStore` (`/utils`) where its semantics match.
- Server actions return `Result`. Callers that turn a result into a toast by hand use `toast.fromResult` where the mapping is direct, which today is 0 of the 21 `useToast` files.
- Dock registration done by hand (`useDockRegistration` in `home/opening`, `search/action`, `spotlights/shell`, `account/provider`) is checked against `usePage({ dock })` and switched over only where the behaviour is identical.
- The `design/hooks/*` (`use-confirm`, `use-dock-link-click`) are checked against framework hooks. Any that duplicate one are removed.

### Code quality

- Check every module for a single responsibility, clear names, no prop chains more than two levels deep, no wrapper that only forwards props, and types derived from schemas (zod, `database.types`) rather than restated.
- Turn `react-hooks/exhaustive-deps` back on. A first scan shows no violations, so it's cheap; if any show up, fix each one deliberately and never by silencing it.
- Remove comments that restate the code. Keep the ones that explain *why*.

### Performance (invisible only)

- Push `"use client"` boundaries down. Today 114 files are client files; a server-rendered parent with a small client leaf is the target wherever there's no interactivity.
- Bundle size is a priority, but never at the cost of responsiveness. Measure route bundles with `next build`. Code-split WebGL (`spotlights/gl.ts`, `tunnel.ts`, `motion/gl-projection.ts`), the 14 dock surfaces, and the modals. **Surfaces and modals are fetched on intent** (owner's decision): the trigger starts the import on `pointerenter`/`focus`/`touchstart`, `openSurface` awaits the same promise, and a click with no prior intent never shows a fallback. The surface opens on the next frame once its chunk resolves. Gate: the enter animation starts on the same frame as before when a hover came first, and with no visible gap on a cold click (checked on a throttled "Fast 4G" profile).
- Look for duplicated fetches, missing `cache()` around per-request reads, and serial `await`s that could run in parallel.
- Motion: audit listener/observer/rAF lifecycles (21 files add listeners, 11 use ResizeObserver, 6 use IntersectionObserver), unmount cleanup, per-frame layout reads, and animated properties that aren't composited. Keep every visible result identical. Before/after traces go in the final report.

## Proving "nothing visible changed" *(builder's call)*

The 71 tests cover only `catalog/utils` and `motion/passage`, so passing them doesn't prove the UI is unchanged. Phase 0 captures a Playwright baseline from a prod build at `9e430a6`:
- **Routes:** `/`, `/movie/[id]`, `/movie/[id]/reviews`, `/tv/[id]`, `/tv/[id]/season/1`, `/person/[id]`, `/account/[username]` and each tab, `/oscars`, `/top-100`, `/directors`, `/privacy`.
- **States:** signed out, and signed in with the seeded `SEED_LOGIN` account against local Supabase.
- **Captures:** one screenshot each after the opening choreography has settled, plus one per dock surface and modal while it is open.

Each gate re-captures the same set and diffs it against the baseline. Animation is checked by eye on the routes a phase touches. The baseline and the CDP harness stay in the scratchpad and are not committed.

## Performance measurement *(builder's call)*

- **Harness:** a throwaway headless Chrome CDP harness (warm profile, prod build, local Supabase). It measures: opening on `/movie` and `/tv`, scroll on `/person` and `/account`, dock surface open, and search typing.
- **Metrics:** long-animation-frame count and duration, style/layout time, JS heap after 10 navigations, and route JS size from `next build`.
- **What counts:** a change is kept if it lowers one of these beyond run-to-run noise, or if it removes work that is clearly provable (a leaked listener, a duplicate fetch).

## Order of work

Each phase ends green (typecheck, lint, tests, build, screenshot diff). Phases 1, 2, 4, 5 and 6 get one commit each. Phase 3 gets one commit per feature.

0. Visual baseline.
1. Cleanup.
2. Design system and `motion/` reorganization, plus quality work in those areas, since everything depends on them.
3. Features, one at a time: reorganization and quality work together, starting with the shared ones (auth, account, reviews, lists, media/detail), then the pages (movie, tv, person, profile, home, search, spotlights, settings, legal).
4. Framework fit.
5. Performance and motion audit with measurements.
6. Docs: fix paths in `DESIGN.md` and `design/rules`, add the one line to `CLAUDE.md`, write the final report.

## Left to the builder

- Exact file names and subfolder names inside a feature.
- Whether each merge candidate actually gets merged (apply the "find it without being told" test).
- Which performance candidates are worth doing after measuring.
