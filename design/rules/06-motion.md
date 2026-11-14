# 6. Motion

Motion was reset to zero. The site is static until a page writes its own
choreography; nothing animates by default and there is no shared clock,
ladder, tempo or easing set. No `transition-*`, `duration-*`, `ease-*`,
`animate-*` class or CSS timing token exists any more.

### 6.1 The contract

- **Components name their roles, pages own the motion.** A component marks
  what it is (`<Part name="poster">`, `<Section cue="lists">`, `<Text part="headline">`).
  Shared components carry a kind (`data-kind="media"` on `MediaCard`, the
  `choreo-button` class on every `Button`) and slots (`data-slot="frame"`).
- **A page writes its choreography in its own `motion.tsx`**, as
  `defineStage({ scope, motion: { parts, sections, kinds }, ... })`
  (types in `src/motion/choreo.ts`). Per role: `enter`, `hover`, `focus`
  (or `"hover"`), `press`, `rest`, `origin`, `text`, and `slots` that answer
  the role's own hover/focus/press. A role left out renders still.
- **It compiles to CSS, not JavaScript.** One stylesheet per page, scoped to
  `[data-choreo=scope]` and hoisted into the server-rendered head.
  - `enter.on: "load"` is a CSS animation from the first paint (`delay`,
    `stagger` by the part's `index`).
  - `enter.on: "view"` rides the scroll timeline (`range`, `stagger`, `wrap`
    for a grid row). It needs no scrolling or `overflow: hidden` ancestor, so a
    carousel is entered as its section, not its slides.
  - Touch states are transitions on translate, scale, rotate, opacity and
    filter only; hover sits behind `(hover: hover)`.
  - `text` splits by word or letter, optionally rising out of a clip (`mask`);
    `line` staggers two texts of one part by their `index`; `order` plays the
    units `forward`, from the `center` outwards, or `random` (seeded by the
    text, so server and client agree). Never blur a masked text: the clip cuts
    the blur into a sliver under each word.
- **Times live where they are used.** Each page writes its own durations and
  curves. Reduced motion is the only global rule: it keeps opacity only.

### 6.2 Modules

The dock, modal, context menu and toast (and every surface or HUD the dock
opens) get their own choreography, separate from the pages, and are done last.
Until then their themes in `src/design/theme/` use `INSTANT`
(`src/design/theme/motion.ts`): they open and close in one cut.

### 6.3 Kept as they were

These pieces are isolated from the reset and keep their own time:

- The cursor and reticle (`src/motion/cursor.tsx`, `reticle.css`, `ticker.module.css`)
- WebGL: the backdrop projection (`projection.tsx`, `gl-projection.ts`, `gl.ts`)
  and the top-100 / oscars / directors scenes (`scene.ts`)
- The detail hero marquee (`marquee.tsx`) and the idle `Intermission` (`screen.tsx`)
- Tilt, magnet and foil (`tilt.tsx`)
- The smooth-scroll driver (`scroll.ts`)
- Colour from the picture (`src/design/grade.ts`) and the room's atmosphere
  (`src/design/components/room.tsx`)

Curves for these pieces come from `bezier()` in `src/motion/curve.ts`.

### 6.2 Triggers, drift, text

- Entrances are timed animations that wait paused on their first frame for a trigger the stage sets: `on: "load"` waits for `data-play` on the root (set after hydration plus two painted frames, so the opening is never spent behind a busy first load); `on: "view"` waits for `data-seen`, set by one IntersectionObserver the first time a part or section is 16% into the viewport (`along: "section"` waits for the section instead, for items in horizontal scrollers); `on: "ready"` waits for the nearest `data-ready` (the backdrop sets it when its picture has loaded, or after 2.5s).
- `defineStage({ scroll: { period, gain } })` sets the wheel's feel while the page is mounted: the spring period in seconds (default 0.636) and the distance per notch (1 = native). Home uses `{ period: 1, gain: 0.618 }`.
- `defineStage({ glide: { duration, ease } })` sets how a carousel pans when its arrows are pressed (read by `Carousel` through `useGlide`); without it, or under reduced motion, it jumps. Home uses 1.618s on its in-out `SWEEP` curve.
- Carousel arrows carry the `arrow` kind (`.choreo-arrow`) and sit on the middle of the first picture frame (`--arrow-y`), not the whole slide. Home deals them in after the posters (`along: "section"`).
- `leave: { to, duration, ease? }` is how a role inside a `Swap` goes: the Swap marks the old view `data-leaving`, waits for its `-x` animation to end (3s cap), then mounts the new view, which plays its entrance. Without a leave it swaps at once.
- `follow: { of, duration, ease? }` makes properties something else sets (a class swap's `color`, the framework writing a pill's `transform`/`width`) glide instead of jump. Guffin's framework motion is always reduced (`reducedMotion: "always"`), so framework components move only through this. Segmented controls carry the `segmented` kind (`.choreo-segmented`) with slots `pill` and `tab`.
- Home is written on the golden ratio: durations and cues are φⁿ seconds (`beat(n)`), staggers Fibonacci ms (34/55/89/144), travel Fibonacci px, blur radii 3/5/8/13 (never more: blur cost grows with radius and it runs on many elements at once), curves from φ's fractions (`SETTLE`, `DEVELOP`, `SWEEP`, `LEAVE`, `TOUCH`, `PRESS`). Use it as the template for the other pages.
- `stagger` is seconds per `index`; `wrap` restarts the count every n items.
- `scroll: { to, range, on? }` is the one scrubbed motion: `on: "page"` (default) reads the document scroll with length ranges, `on: "view"` the element's view timeline. It composes with `enter`; keep them on different properties.
- Section headings (`Header`) split their title when their part has `text`. Slots `picture` (the backdrop's image layer) and `rule` (a heading's rule) are available to any page.
