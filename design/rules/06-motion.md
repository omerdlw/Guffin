# 6. Motion

Motion was reset to zero (`139303a`) and rebuilt page by page. Nothing
animates by default and there is no shared clock, duration ladder or easing
set: no `transition-*`, `duration-*`, `ease-*` or `animate-*` class and no CSS
timing token exists (`--ease-*: initial`). Each page, and each module, writes
its own time.

### 6.1 The contract

- **Components name their roles; pages own the motion.** A component marks
  what it is: `<Part name="poster">`, `<Section cue="lists">`,
  `<Text part="headline" text={…}>`. Shared components carry a **kind** and
  **slots** instead (section 6.4).
- **A page writes its choreography in its own `motion.tsx`** with
  `defineStage` (`src/motion/stage.tsx`; types in `src/motion/choreo.ts`). A
  role left out renders still.
- **It compiles to CSS, not JavaScript.** One stylesheet per page, scoped to
  `[data-choreo=scope]` and hoisted into the server-rendered head as a React 19
  `<style href precedence>`. JavaScript only sets the triggers.
- **Reduced motion** is the one global rule: under
  `prefers-reduced-motion: reduce` every role keeps opacity only and an
  entrance lasts at most 0.3s.

| Stage scope | File                                      | Carries                                             |
| ----------- | ----------------------------------------- | --------------------------------------------------- |
| `home`      | `src/features/home/motion.tsx`            | The home page; the template for the others          |
| `detail`    | `src/features/detail/motion.tsx`          | Movie, TV, season, reviews; person shares its roles |
| `account`   | `src/features/profile/motion.tsx`         | The profile and every tab                           |
| `search`    | `src/features/search/motion.tsx`          | The search surface and results                      |
| `surface`   | `src/design/components/surface.tsx`       | Every dock surface (`SurfaceStage`)                 |
| —           | `spotlights/motion.tsx`, `legal/view.tsx` | Stages with roles but no choreography yet (still)   |

### 6.2 `defineStage`

```tsx
const HOME = defineStage({
  parts: ["backdrop", "headline", "copy", "poster"] as const,
  sections: ["lists", "reviews"] as const,
  scope: "home",                       // without scope + motion: all still
  motion: { parts: {…}, sections: {…}, kinds: {…} },
  scroll: { period: beat(0), gain: beat(-1) }, // wheel feel while mounted
  glide: { duration: beat(1), ease: SWEEP },   // carousel arrow pans
  opening: beat(2),                    // hold in-view roles while the opening plays
  order: [["backdrop", "wash"], "headline", "copy"], // OR a sequenced opening
  pace: 0.382,                         // with order: start the next this far through
});
```

It returns the stage's typed components:

| Export            | What                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `StageRoot`       | Wraps the page; takes `grade` (sets the page's grade, section 3.1)          |
| `SurfaceRoot`     | The same choreography inside the dock: no grade, scroll feel or hold        |
| `Part`            | `name`, `index` (for stagger), `as`                                         |
| `Section`         | `cue`, `as`, `now` (play at once)                                           |
| `Text`            | Splits by word or letter when its part has `text` moves                     |
| `Header`          | A section heading: `title`, `icon`, `actions`, `progress`; splits its title |
| `Bloom`, `Expose` | Text that splits like `Text` (`Expose` adds the exposure light, `truncate`) |
| `Count`           | A number among the facts: `value`, `format`; enters with the text around it |
| `Swap`            | Swapped content: `id`, `cue`, `intro`; the old view leaves first            |
| `Deck`            | Several views (`views`, `shown`); showing a view restarts its entrance      |
| `WallStage`       | A full-screen wall (the spotlight scenes) and the page under it             |
| `usePart(name)`   | `{ "data-part": name }` for an element you render yourself                  |

### 6.3 `Moves`: what a role does

| Key      | Type                 | Meaning                                                                                                     |
| -------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| `enter`  | `Enter`              | Its entrance (section 6.5)                                                                                  |
| `leave`  | `Leave`              | How it goes when a `Swap` replaces it: `{ to, duration, ease }`                                             |
| `hover`  | `Beat`               | A look + `duration` + `ease`, inside `(hover: hover)`                                                       |
| `focus`  | `Beat` \| `"hover"`  | On `:focus-visible` or `:has(:focus-visible)`                                                               |
| `press`  | `Beat`               | On `:active`, not disabled                                                                                  |
| `rest`   | `{ duration, ease }` | Return to rest; default: the hover's curve, 1.5× slower                                                     |
| `origin` | string               | `transform-origin`                                                                                          |
| `scroll` | `Drift`              | The one scrubbed motion: `{ to, range, on: "page" \| "view" }`                                              |
| `follow` | `Follow`             | Glide properties something else sets: `{ of: [...], duration, ease }`                                       |
| `text`   | `TextMoves`          | Split the text: `by` word/char, `mask`, `order` forward/center/random, `stagger`, `line`, `budget`, `enter` |
| `slots`  | per slot             | The same moves for pieces inside, answering the role's own touch                                            |

A **Look** is `x`, `y` (px or CSS length), `scale` (number, string or
`[x, y]`), `rotate`, `tilt` (about the horizontal axis; wins over `rotate`),
`opacity`, `bright` (a brightness filter), `clip` (a `clip-path`; entrances
open it to `inset(0)`). `scale`, `rotate`, `tilt` and `bright` accept CSS
expressions (`"calc(var(--fan-r) * 1.3)"`) so one rule can move each item by
its own variables.

Touch states transition only `translate`, `scale`, `rotate`, `opacity` and
`filter`, as individual properties, so an entrance and a hover never fight.
Cascade: rest < hover < focus < press. Touching a role that is still
entering finishes its entrance first, so the hover eases instead of snapping.

`follow.of` may be `color`, `background-color`, `transform`, `translate`,
`scale`, `opacity`, `width`, `height`, `grid-template-rows`. Framework motion
in Guffin is instant (`ui.ts` motion), so framework components move only
through `follow`.

### 6.4 Kinds and slots

| Kind        | Selector              | Carried by                       |
| ----------- | --------------------- | -------------------------------- |
| `media`     | `[data-kind="media"]` | `MediaCard`                      |
| `button`    | `.choreo-button`      | Every `Button` (its recipe base) |
| `arrow`     | `.choreo-arrow`       | Carousel arrows                  |
| `segmented` | `.choreo-segmented`   | Segmented controls               |

| Slot                             | Selector                                                 | What                                                     |
| -------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `frame`, `image`, `caption`      | `[data-slot="frame"]` (+ `img`), `[data-slot="caption"]` | A media card's pieces                                    |
| `picture`                        | `[data-slot="picture"]`                                  | The backdrop's image layer                               |
| `screen`                         | `[data-slot="screen"]`                                   | The hero's clipping box: scale and blur the picture here |
| `pill`, `tab`                    | `[data-pill]`, `[role="tab"]`                            | A tab bar's sliding pill and tabs                        |
| `rule`, `icon`, `actions`        | `[data-slot=…]`                                          | A heading's rule, icon and actions                       |
| `thumb`                          | `[data-slot="thumb"]`                                    | A result row's thumbnail                                 |
| `folder`, `deck`, `leaf`, `flap` | `[data-slot=…]`                                          | The cast card folder (detail)                            |

A new slot or kind is added to `KINDS` / `SLOTS` in `choreo.ts`.

### 6.5 Triggers

Entrances are timed CSS animations, paused on their first frame until a
trigger:

| `enter.on` | Waits for                                                        | Set when                                                                                             |
| ---------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `"load"`   | `data-play` on the stage root                                    | After hydration and two painted frames, once no curtain is down                                      |
| `"view"`   | `data-seen` on the role (or its section with `along: "section"`) | One IntersectionObserver, the first time it is 16% into the viewport (`rootMargin -16%` at the foot) |
| `"ready"`  | the nearest `data-ready`                                         | The backdrop's picture has loaded (2.5s fallback)                                                    |

- `delay`, `stagger` (seconds per `index`), `wrap` (restart the count every n,
  so a grid cascades across a row), `budget` (cap a text's total spread).
- Every `view` and `ready` gate also waits for `data-play`: nothing in view
  plays behind the opening or a curtain.
- **Curtain**: an element with `data-curtain` holds `data-play` until the
  attribute goes (12s cap). The detail marquee is one; its `onLift` starts
  the page as its dive fades.
- **`opening`**: roles already in view on arrival wait this many seconds, so
  the page reads top-down.
- **`order` (a sequenced opening)**: only the hero's roles, played in order;
  roles in one array play together; each starts when the one before is
  `pace` through and all earlier ones have ended. Everything else plays the
  moment it is in view, waiting for nothing.
- **Replay**: a role that leaves off the bottom is wound back and replays when
  scrolled to again; nothing replays on scroll-up; a role skipped above the
  viewport lands finished.
- An entrance gated only by `data-play` below the fold is spent off screen:
  use `on: "view"` for anything not in the first viewport.
- A carousel is entered as its section (scrollers and `overflow: hidden`
  ancestors break per-item observation); items use `along: "section"`.

### 6.6 Timing: the golden ratio

Home is the template; detail, account, the dock and surfaces speak it too.

| Rank            | Values                                                               |
| --------------- | -------------------------------------------------------------------- |
| Durations, cues | `beat(n) = φⁿ s`: 0.146, 0.236, 0.382, 0.618, 1, 1.618, 2.618, 4.236 |
| Staggers        | Fibonacci ms: char 34, word 55, item 89, row 144                     |
| Travel          | Fibonacci px: 3, 5, 8, 13, 21                                        |
| Press           | `scale: 0.96` over `beat(-4)` (0.146s)                               |

| Curve     | Bezier                   | For                                          |
| --------- | ------------------------ | -------------------------------------------- |
| `SETTLE`  | `0.236, 1, 0.382, 1`     | Arrives quickly, long tail to rest           |
| `DEVELOP` | `0.382, 0, 0.146, 1`     | Pictures and shade: slow start, long resolve |
| `SWEEP`   | `0.618, 0, 0.382, 1`     | Travel the eye follows                       |
| `LEAVE`   | `0.618, 0, 0.854, 0.382` | Gathers, then goes                           |
| `TOUCH`   | `0.146, 1, 0.382, 1`     | Answers at once, eases in                    |
| `PRESS`   | `0.382, 0, 0.236, 1`     | Direct                                       |

Each page defines its own `beat`, `STAGGER` and curves locally; they are
copied, not imported, so a page can retune without touching another.

**Scroll feel**: `scroll: { period, gain }` tunes the smooth-scroll driver
(`src/motion/scroll.ts`): the spring period in seconds (default 0.636) and
distance per notch (1 = native). Home and account use `{ period: 1, gain: 0.618 }`.

### 6.7 Do and don't

- **Never animate blur.** A blurring animation cannot run on the compositor
  and repaints every frame; on glass it smears the frost. Current pages and
  the dock animate without blur.
- Never blur or scale the canvas inside the masked hero picture (a pixel seam
  at the foot): move the `screen` slot.
- Never blur a masked text (`text.mask`): the clip cuts the blur into a
  sliver under each word.
- `scroll` drift composes with `enter`; keep them on different properties.
- No `requestAnimationFrame` loop or smooth-scroll library of your own: use
  `mountScene` (`src/motion/scene.ts`) and the engine (`src/motion/engine.ts`).
- The animation library is imported only through `@/motion/lib` (ESLint).
- Leave a page with `useDockActions().navigate` (or `DockLink`), which waits
  for the stage, not `router.push`.
- After editing a stage file, dev SSR may serve the old module for a minute
  and throw a hydration mismatch: re-check before chasing it.

### 6.8 Modules

| Module                     | Motion                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dock                       | Done: `src/design/theme/dock-motion.ts` (springs for glass, credits-roll for words) + `styles/dock.css` (arrival rise, deck fold, control warmth 0.236s)                                              |
| Dock surfaces              | Done: the `surface` stage — blocks rise 8px after the glass blooms (0.236s, then 0.618s), 55ms apart by their place; rows by `index`, restarting every 8; a swapped view lifts 5px and fades (0.146s) |
| Dock actions               | Done: `action-content.tsx` (section 4.1)                                                                                                                                                              |
| Modal, context menu, toast | Not yet: `INSTANT` (`theme/motion.ts`), they open and close in one cut                                                                                                                                |

`moduleMotion` follows the visitor's reduced-motion setting (`reducedMotion:
"user"`): reduced, every module transition is instant.

### 6.9 Pieces with their own time

Isolated from the page contract; they keep their own clocks:

- The cursor and reticle (`src/motion/cursor.tsx`, `shape.ts`, `reticle.css`,
  `ticker.module.css`). The cursor's glass is fitted to what is painted
  (`shapeOf`): a round avatar in a bare link is a circle, a pill a pill; over
  a target too large to wrap it stays a drop, a little fuller.
- Glass touch (`src/design/liquid-touch.ts`) and glass thumbs
  (`glass-thumb.ts`).
- WebGL: the backdrop projection (`projection.tsx`, `gl-projection.ts`,
  `gl.ts`; textures capped at 2560px, decoded off-thread) and the spotlight
  scenes (`scene.ts`).
- The detail hero marquee (`marquee.tsx`) and the idle `Intermission`
  (`screen.tsx`).
- Tilt, magnet and foil (`tilt.tsx`).
- The smooth-scroll driver (`scroll.ts`); it stands down while
  `data-scroll-lock` is on `<html>`.
- The grade (`src/design/grade.ts`) and the room's atmosphere (`room.tsx`).

Curves for these come from `bezier()` in `src/motion/curve.ts`.

### 6.10 Verifying motion

Check motion with timed screenshots or a CDP screencast in a real browser,
not by counting animations; check every page that shares a stage or the dock,
in every role, before calling it done.
