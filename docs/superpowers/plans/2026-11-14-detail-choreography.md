# Detail Choreography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Movie/TV detail pages get a full golden-ratio choreography, and the cast card becomes a three-layer folder that opens on hover.

**Architecture:** All motion is written in `src/features/detail/motion.tsx` (`defineStage` with `scope: "detail"`), compiled to CSS by `src/motion/choreo.ts`. The cast card only declares slots (`folder`, `deck`, `flap`, `leaf`) and per-leaf CSS variables; the page's motion file decides how they move.

**Tech Stack:** Next.js / React 19, CSS individual transform properties, vitest.

**Spec:** `docs/superpowers/specs/2026-11-14-detail-choreography-design.md`

## Global Constraints

- Times: `beat(n) = φⁿ s`; staggers 34/55/89/144 ms; travel Fibonacci px; blur ≤ 13px.
- No framer-motion, no per-frame JS; motion only in the page's motion file.
- Marquee, WebGL projection, Intermission and the JS backdrop defocus are not touched.
- Reduced motion keeps opacity only (the compiler already does this).

## Review Focus

- A cast member with no known-for titles: folder shows the portrait only, opens without gaps.
- Keyboard focus on the portrait opens the folder (`:has(:focus-visible)`).
- Text split (title, credits) keeps an accessible label and still truncates.
- Swapping cast ↔ crew while a folder is open does not leave it tilted.
- Person page (shares the stage) still renders with every role it uses.

---

### Task 1: Compiler additions

**Files:** Modify `src/motion/choreo.ts`; Test `src/motion/choreo.test.ts`

- Look: `tilt?: number | string` → `rotate: x <v>`; `rotate`, `scale`, `bright` also accept strings (CSS expressions such as `calc(var(--fan-r) * 1.3)`). `tilt` and `rotate` share the `rotate` property; `tilt` wins.
- SLOTS: `folder`, `deck`, `flap`, `leaf` → `[data-slot="…"]`.
- Tests: `declare` output via `compile` contains `rotate: x 15deg`, `rotate: calc(var(--fan-r) * 1.3)`, `scale: calc(…)`, `filter: blur(0px) brightness(var(--fan-lit))`.

### Task 2: Split titles and credits

**Files:** Modify `src/motion/stage.tsx`

- `Bloom` and `Expose` split their text with `split()` when the stage gives their part `text` (same as `Text`: `aria-label` + hidden split span; `Expose` keeps its truncate wrapper).

### Task 3: Folder cast card

**Files:** Modify `src/features/movie/cast.tsx`, `src/features/movie/cast.module.css`

- Structure: `.card` (container, perspective 1200px) > `folder` slot (back panel, 288:224, grade-tinted plate, edge border, `transform-style: preserve-3d`) > `deck` slot > five `leaf` slots (portrait centre + up to 4 known-for posters, 2:3, width 34.7cqw), plus `flap` slot (frosted glass, absolute bottom, name + subtitle, links to the person, aria-hidden).
- Leaf variables at rest: `--fan-x` (0, ±13.9cqw, ±27.8cqw), `--fan-y` (centre −8px, inner 0, outer 8px), `--fan-r` (0, ±5deg, ±10deg), `--fan-s` (1.05, .95, .88), `--fan-lit` (1, .75, .5); rest filter blur 0/.5/1.5px, brightness 1/.55/.3; hover transition-delay centre-out 0/55/89ms.
- Footer row is removed.

### Task 4: The choreography

**Files:** Modify `src/features/detail/motion.tsx`

- Add `scope: "detail"`, the φ vocabulary (as home), `scroll`/`glide` as home, and moves for every role named in the spec: opening (backdrop screen/picture, title, rule, stat, tagline, overview, poster, action, row/label/line/value), below (header, person + folder slots, slide, review, star, tile, entry, awards, list, stamp), swaps (`cast`, `slides`, `tiles`, `reviews` leave), kinds (media, button, segmented, arrow).
- Folder hover on `person`: `folder` tilt 15 origin bottom; `deck` tilt −15; `flap` tilt −25 origin bottom; `leaf` x `calc(-50% + var(--fan-x) * 1.4)`, y `calc(var(--fan-y) - 13px)`, rotate ×1.3, scale ×1.02, blur 0, bright `var(--fan-lit)`.

### Task 5: Gates

- `npm run typecheck && npm run lint && npm test`; commit.
