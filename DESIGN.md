# Guffin Design System

Guffin is a film diary with a cinematic, dark-only interface. This document is
the contract for how it looks and moves: the visual tokens (sections 3 to 5)
and the motion engine that every page, surface and hover answers to (section
6). It is written for contributors and for AI agents that generate or review UI
in this repository: follow it literally, and when it is silent, extend the
system instead of working around it.

## 1. Working with this system

### 1.1 The one idea

**Every visual value has a role, and every role has one value.** A colour is
not "white at 6%"; it is `fill`. A radius is not "14px"; it is `card`. A
duration is not "400ms"; it is a rung of the ladder. A page does not say "rise
24px over 0.8s"; it says its title is _ink_. Components name roles, never raw
values, so changing the system means changing one line.

### 1.2 Where the values live

| What                                      | Where                                                           |
| ----------------------------------------- | --------------------------------------------------------------- |
| Tokens (colour, type, radius, time)       | `src/app/globals.css`, `@theme`                                 |
| Class recipes (`TONE`) and `RADIUS`       | `src/ui/page.ts`                                                |
| Layer chrome (`SHELL`, `PRIMARY` …)       | `src/config/theme/chrome.ts`                                    |
| Surface kit (buttons, tiles, fields)      | `src/ui/surface.tsx`                                            |
| Shared row hover                          | `src/ui/highlight-group.tsx`                                    |
| Class merging that understands tokens     | `src/ui/cn.ts`                                                  |
| Time, curves, springs (the ladder)        | `src/motion/engine/` (`ladder.ts` `step`, `curve.ts` `POINTS`)  |
| The ladder as CSS (`--step-*`, `--curve`) | `src/motion/engine/tokens.ts`, written to `:root` by the engine |
| Page and surface choreography (scores)    | `src/features/*/motion.tsx`, `src/ui/surface-stage.tsx`         |
| Motion reference (laws, kit, lab)         | `docs/motion-engine.md`, `/lab/engine`, `/lab/kit` (dev only)   |
| Theme slots for dock, modal, menu, toast  | `src/config/theme/*.ts`; motion in `src/config/theme/motion.ts` |

### 1.3 Workflow for any UI change

1. **Look for an existing recipe** in the table in section 5 before writing
   classes. Most surfaces are one `TONE.*`, one surface-kit export or one
   `src/ui` component.
2. **Compose from roles.** Use the tokens in section 3 and the state rules in
   section 4.
3. **If a value you need has no role, add one** (token in `@theme`, mirror in
   TypeScript if it has one, a row in this document). Never reach for an
   arbitrary value.
4. **Merge classes with `cn`** from `@/ui/cn`, not the framework's. It knows
   every token family, so a later `type-meta` replaces `type-body` and
   `rounded-full` replaces `rounded-card`. The framework's `cn` reads these as
   unknown and keeps both.
5. **Run the checklist** in section 9 before calling the work done.

### 1.4 The ten rules

1. Colour comes from roles. Tailwind's palette is off.
2. Opacity moves in steps of 5%. No `/[0.07]`.
3. Type is `type-*`, never `text-*` (`text-*` is ink only).
4. Radius is a named token. Frames nested inside frames use `nested()`.
5. There are no shadows. Depth is glass, ring and blur.
6. Hover and focus are one event: every `hover:` has a `focus-visible:` twin.
7. A control rests at `ink-body` or brighter and rises to `ink` when pointed at
   or focused.
8. Raw white is the primary action and nothing else; a chosen control is never
   white.
9. Time comes from the ladder in section 3.6; a page names what a part is made
   of and never how long it takes (section 6).
10. Components do not draw their own focus outline.

## 2. Principles

- **Dark and quiet.** The page is near-black; ink is off-white. Chrome recedes
  so the picture can lead.
- **The picture sets the colour.** On film and person pages the accent is the
  _grade_, a colour taken from the artwork. Without a picture it falls back to
  white. Nothing else introduces an accent.
- **Light, not weight.** Surfaces are 5% fills and 1px rings. Layers are glass.
  Hierarchy comes from ink steps and type, never from shadows or borders.
- **One answer to a touch.** Every control reacts in the same two beats: light
  arriving fast, decaying slowly. Consistency is the polish.
- **One scale.** 5% opacity steps, a 4px corner grid, a golden-ratio time scale.

## 3. Foundations

### 3.1 Colour

Tailwind's palette is switched off: every colour is a role.

#### Ink: text and glyphs on the dark page

| Token            | Value | Role                                                      |
| ---------------- | ----- | --------------------------------------------------------- |
| `text-ink`       | 100   | Titles, names, fact values, the hovered state of anything |
| `text-ink-lead`  | 90    | A tagline; tooltip text                                   |
| `text-ink-body`  | 70    | Prose, secondary text, section titles, idle controls      |
| `text-ink-muted` | 50    | Labels, dates, counts, meta, label-sized text actions     |
| `text-ink-faint` | 30    | Placeholder glyphs in empty frames, separators, numerals  |

`ink-lead` is never a hover state. `ink-faint` is never a date or a count.

#### Surfaces

| Token                             | Value       | Role                                             |
| --------------------------------- | ----------- | ------------------------------------------------ |
| `bg-fill` / `-hover` / `-active`  | 5 / 10 / 15 | A surface at rest, hovered, chosen               |
| `ring-edge` / `-hover` / `-focus` | 5 / 10 / 15 | Its inset ring, in the same states               |
| `bg-rule`, `divide-rule`          | 5           | Dividers between rows                            |
| `bg-line`                         | 10          | Tracks, axes, a timeline spine                   |
| `bg-plate`                        | 5, opaque   | `fill` made solid, for a frame laid over another |

#### Grade: the colour taken from the picture

| Use                         | Value                                        |
| --------------------------- | -------------------------------------------- |
| Chosen control              | `bg-grade/15 ring-grade/25`, hover `20 / 30` |
| Header rule                 | `bg-grade/20` drawn, `bg-grade/40` hairline  |
| Focus outline, section icon | 40, 85                                       |
| Text selection              | 30                                           |

Without a grade (no picture behind), the focus outline is 20% white.

#### Semantic colours

| Token                                 | Role                                         |
| ------------------------------------- | -------------------------------------------- |
| `watched`, `listed`, `liked`, `rated` | What a member did with a film                |
| `danger`                              | An error, a destructive action               |
| `award`                               | A statuette: the Oscars index, the year dial |

Danger takes the grade's steps: text `text-danger`; a soft button
`bg-danger/15 ring-danger/25` (hover `20 / 30`); a destructive action armed for
its second press `bg-danger text-black`, the way `PRIMARY` is white.

#### Marks, links, white and black

- **Data marks** use the ink steps as colours: `bg-line` for the track or axis,
  `bg-ink-faint` / `bg-ink-muted` / `bg-ink-body` for marks, `bg-ink` for the
  current one. A progress fill is `bg-ink-body`.
- **Raw white** is `PRIMARY` (white, black ink, `white/90` on hover) and a
  checked switch. A thumb riding its track and the text caret are also white.
  A chosen control is never white.
- **Raw black** appears only as the layers' glass (70), the backdrop and the
  glass over a picture (60), `DIM` (30), and a scrim under text on a picture
  (`from-black/80` to transparent).

### 3.2 Opacity

Opacity moves in steps of 5%, for colour (`bg-grade/15`) and for elements.

| Case                      | Value                        |
| ------------------------- | ---------------------------- |
| Disabled                  | `opacity-50`                 |
| A picture link, hovered   | `opacity-80`                 |
| An idle picture in a list | Rests at 70, comes up to 100 |

### 3.3 Type

Sizes are `type-*` utilities, never `text-*`. The Tailwind sizes (`text-sm`,
`text-xs` …) and arbitrary ones (`text-[13px]`) are switched off. Each step
carries its own line height. Faces: Geist for the interface, Zuume for the
headline ladder and big figures.

| Utility          | px / line                   | For                                          |
| ---------------- | --------------------------- | -------------------------------------------- |
| `type-micro`     | 10 / 12                     | Calendar digits, badges, captions under 11   |
| `type-label`     | 11 / 16                     | Small caps labels (`TONE.label`), fine print |
| `type-meta`      | 12 / 16                     | Dates, counts, descriptions, tooltips        |
| `type-control`   | 13 / 16                     | Buttons, chips, compact rows                 |
| `type-body`      | 14 / 20                     | The default UI text                          |
| `type-copy`      | 15 / 24                     | Card titles and excerpts                     |
| `type-base`      | 16 / 24                     | Larger titles                                |
| `type-prose`     | 16 / 28 → 17 / 30 from `sm` | Long-form reading (`PROSE_TYPE`)             |
| `type-title`     | 18 / 28                     | Section, list and dialog titles              |
| `type-heading`   | 24 / 32                     | Page headings and figures inside a layer     |
| `type-display-*` | 36, 48, 60, 72, 96, 128 / 1 | The Zuume headline ladder, big figures       |

- **Line height:** a step's own; `leading-none` for a single line set tight;
  `leading-3` to `leading-9` (the 4px grid) for a paragraph. `leading-crop`
  (0.8) sets a Zuume figure on its caps. `tight`, `snug`, `relaxed` and
  arbitrary line heights are off.
- **Tracking:** text sits at 0. Only three roles track: `tracking-label`
  (0.14em, small caps labels), `tracking-tagline` (0.12em, set larger) and
  `tracking-slate` (0.32em, the intermission card).
- **Weight:** `font-medium`, `font-semibold`, `font-bold`; nothing else.
- **Labels:** `TONE.label` is `type-label`, semibold, `tracking-label`,
  uppercase. Every small caps label uses it. A label set at `type-micro` (a
  badge, the reticle) adds `tracking-label` itself. Centred ones pull back with
  `-mr-(--tracking-label)`.
- **Label-sized actions** ("More", "Read more", "In the timeline"): `TONE.link`,
  `ink-muted` rising to `ink`.

### 3.4 Radius

Corners sit on the 4px grid and are named by what they round.

| Token           | px  | For                                        |
| --------------- | --- | ------------------------------------------ |
| `rounded-thumb` | 8   | Thumbnails, logos, small posters           |
| `rounded-tile`  | 12  | List rows                                  |
| `rounded-card`  | 16  | Cards, carousels, menus' options, tooltips |
| `rounded-panel` | 20  | Person cards, menus                        |
| `rounded-sheet` | 24  | The poster, modals                         |
| `rounded-full`  | —   | Buttons, pills, tabs, avatars              |
| `rounded-mark`  | 3   | A data mark: chart bar, calendar cell      |

Tailwind's radii and arbitrary ones are off; `rounded-none` and
`rounded-[inherit]` remain.

Two more are _derived_, not chosen: `rounded-inset` (10) is a card less the 6px
padding of a surface tile, for a tile inside one; `rounded-shell` (26) is a
card plus the 10px gutter of the dock and modal shells.

**Nested frames keep their curves parallel.** The inner radius is the outer one
minus the padding between them: `nested(outer, padding)`. A card of 20 with
`p-1` holds a photo of 16; a surface tile of 16 with `p-1.5` holds 10. Props
that take a number (`Carousel`, `MediaCard`, `Tile`) and inline styles read
`RADIUS`.

### 3.5 Depth

There are no shadows. Tailwind's shadows and arbitrary ones are switched off,
and no layer, control, picture or mark casts one. A layer is told from the page
by its glass, its ring and its blur alone.

### 3.6 Time and easing

All time is one geometric ladder, `step(n) = 0.5s × φⁿ`. In TypeScript it is
`step(n)` from `@/motion/engine`; in CSS it is `--step-n6 … --step-6` (and the
`duration-*` utilities below). A stage multiplies the whole ladder by `φ^tempo`
(section 6.1), so the ratio between two durations never changes.

| Role     | n   | ms   | CSS                           | For                                   |
| -------- | --- | ---- | ----------------------------- | ------------------------------------- |
| `ripple` | -6  | 30   | `--step-n6`                   | A stagger across many marks (a dial)  |
| `step`   | -5  | 45   | `--step-n5`                   | Rows of a menu stepping in            |
| `flick`  | -4  | 75   | `--step-n4`, `duration-flick` | Staggers between siblings             |
| `touch`  | -3  | 120  | `--step-n3`, `duration-touch` | A press going down; a tooltip closing |
| `leave`  | -2  | 190  | `--step-n2`, `duration-leave` | Something closing                     |
| `light`  | -1  | 310  | `--step-n1`, `duration-light` | A small light coming up (tooltip)     |
| `reveal` | 0   | 500  | `--step-0`, `duration-reveal` | A hover or focus arriving             |
| `move`   | 1   | 810  | `--step-1`, `duration-move`   | A press coming back; a turn           |
| `settle` | 2   | 1310 | `--step-2`, `duration-settle` | A hover fading out; an image arriving |
| `linger` | 3   | 2120 | `--step-3`, `duration-linger` | Afterglow, zoom, shimmer              |

Distances are on the same ladder: `reach(n) = 24px × φⁿ`. Blur and brightness
are powers of φ. The default transition is `leave` on `out-quart`.

| CSS (`ease-*`) | Engine curve (`POINTS`) | Job                                     |
| -------------- | ----------------------- | --------------------------------------- |
| `out-cream`    | -                       | A hover or focus arriving               |
| `phosphor`     | -                       | Light decaying after the pointer leaves |
| `out-expo`     | `expo`                  | Chrome and readouts snapping in         |
| `out-quint`    | `silk`                  | Names and lines settling                |
| `fade`         | `fade`                  | Plain opacity                           |
| `in-out-cubic` | `glide`                 | Loops, sweeps, scrubs                   |
| `out-quart`    | -                       | The default for anything unnamed        |
| `in-cubic`     | -                       | Leaving                                 |

The engine also owns `pour`, `dolly` and `fall`, reached as `--curve-<name>` in
CSS. The CSS names that have an engine curve are aliases of its `--curve-*`
variable, so there is one definition of each. In motion's API, pass a curve as
`[...POINTS.expo]` and a duration as `step(n)`; never a number of seconds.

Transitions are off by default in `globals.css` and exist inside `.ui-motion`,
`.ui-scene` and `[data-cinematic]`; a component that animates lives inside one.
A page's `main` carries `ui-scene` so its controls answer; a dock surface gets
it from `SurfaceStage`.

## 4. Interaction contract

### 4.1 The two beats

Every control answers in the same two beats:

- **In:** hover or focus arrives over `reveal` on `cream`.
- **Out:** it fades over `settle` on `phosphor`, like light decaying.
- **Press:** down in `touch`, back in `move`. Press scale is `0.96`, or `0.98`
  for links and full-width controls.

`tempo-quick` quickens the beats inside a dock surface (it sits on the dock's
`surfaceBody`): in over `light`, out over `leave`. A 5% step stretched across
`reveal` / `settle` moves one colour level at a time and reads as stepping,
hence the quicker pair there.

Springs (`SPRING` in `src/config/theme/motion.ts`) are the engine's own, turned
into stiffness and damping by `springForce`: `press` is the engine's press on
_light_, one rung quicker than its hover, for a control going down and back;
`follow` is _ink_ answering a hand, for a highlight sliding after the pointer or
the choice (`SlidingHighlight`, the segmented control's pill). A spring written
anywhere else is built the same way, from `springForce(response(MATTER.x, n))`
(the print's `Tilt`, the glyph's `Magnet`), never from a stiffness typed by
hand. A stagger between marks steps by `ripple` (a rating's stars) or `flick`
(siblings).

### 4.2 States

| State    | Treatment                                                                               |
| -------- | --------------------------------------------------------------------------------------- |
| Rest     | Text `ink-body` (never dimmer for a control); surface `fill`, ring `edge`               |
| Hover    | Text `ink`; surface `fill-hover`, ring `edge-hover`                                     |
| Focus    | The hover treatment via `focus-visible` (ring at `edge-focus`), plus the global outline |
| Active   | The press beat and scale                                                                |
| Chosen   | `TONE.chosen`: `bg-grade/15 ring-grade/25`, hover `20 / 30`; text in grade              |
| Disabled | `opacity-50`, not interactive                                                           |
| Submit   | `PRIMARY` / `SURFACE_PRIMARY`, white. Grade marks a chosen state, never a submit        |

**Hover and focus arrive together.** Every `hover:` that changes colour has a
`focus-visible:` twin that does the same; on a field it is `focus:`. Under a
`group`, a `group-hover:` colour or opacity has two twins:
`group-focus-visible:` for when the group itself takes focus and
`group-has-focus-visible:` for when something inside it does. Movement
(`translate`, `scale`) has no twin.

**Inside one hover target** (`group`: a row, card or tile) the title rises to
`ink` and its secondary parts (an icon, a meta line) take one step,
`ink-muted` to `ink-body`, through `group-hover`. Nothing else steps by one.

**Focus outline** comes from `globals.css`: 1.5px, 20% white, or 40% grade on
film and person pages. Components do not set their own. What a component may
add is the state's own step: `focus-visible:ring-edge-focus` on a button or
tab, `focus:bg-fill-hover focus:ring-edge-focus` on a field. Fields are
`SURFACE_FIELD`, never a copy of it.

### 4.3 Links and text decoration

Two forms, both with `underline-offset-2`. The text of a link never dims on
hover.

| Form                | Where                          | Classes                                                                                 |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Always underlined   | A link inside running text     | Decoration (or border) `ink-faint`, `ink-muted` on hover and focus                      |
| Underlined on point | A name or title that is a link | `underline decoration-transparent hover:decoration-current` + the `focus-visible:` twin |

`hover:underline` is not used.

### 4.4 Helper classes

| Class        | Effect                                                            |
| ------------ | ----------------------------------------------------------------- |
| `ui-iris`    | A fill blooms behind the control on hover and focus               |
| `ui-fade`    | Transitions opacity along with colour                             |
| `ui-glyph`   | An icon that scales to 1.08 with its control                      |
| `ui-still`   | Opts a control out of the press scale                             |
| `ui-sheen`   | The sheen sweep on `PRIMARY`                                      |
| `cine-press` | Lift and press, for standalone surface buttons                    |
| `cine-fade`  | Colour fade on hover and focus, for icon buttons inside a toolbar |

## 5. Components and recipes

### 5.1 Pick the recipe

| You need                                 | Use                                         |
| ---------------------------------------- | ------------------------------------------- |
| A surface that reacts to the pointer     | `TONE.surface`                              |
| A chosen state                           | `TONE.chosen`                               |
| Floating chrome over a picture           | `TONE.glass`; carousel arrows `TONE.arrows` |
| A select                                 | `TONE.select`                               |
| The button that shows the rest of a list | `TONE.more`                                 |
| A small caps label                       | `TONE.label`                                |
| A label-sized text action                | `TONE.link`                                 |
| Dividers between rows                    | `TONE.rule`, `TONE.rules`                   |
| Awards on a page                         | `STAGE_LOOK`                                |
| Long-form reading                        | `PROSE_CLASS` (`PROSE_TYPE`)                |
| A page headline                          | `headlineClass()`, `HEADLINE_*`             |
| Inside a surface (dock card, modal)      | The surface kit, 5.3                        |

### 5.2 Layers

The dock, modals, the context menu, toasts and tooltips are cut from one set of
chrome in `src/config/theme/chrome.ts`.

| Name       | Look                                                | For                                |
| ---------- | --------------------------------------------------- | ---------------------------------- |
| `SHELL`    | 70% black glass, `ring-edge-hover`                  | Dock card, modal, context menu     |
| `FLOAT`    | The same glass, blurred                             | Dock controls, breadcrumbs, toasts |
| `TIP`      | The same glass with `ring-edge` and `ink-lead` text | Tooltips (and `.tooltip-content`)  |
| `BACKDROP` | 60% black, `blur-md`                                | What dims the page behind a layer  |
| `DIM`      | 30% black, `blur-xs`                                | A layer left under the top one     |
| `FILL`     | `fill` / `edge`, one step up on hover               | A control inside a layer           |
| `PRIMARY`  | White, black ink, a 10% sheen, `white/90` on hover  | The one action a layer exists for  |

Shells hold content on the card scale: a shell is `rounded-shell` (26), or
`rounded-sheet` (24) for the menu, and what sits inside is `rounded-card`. A
select's list is a menu: `SHELL` with `backdrop-blur-xl`.

**Layer motion.** Every layer opens with its opacity over `light` and its shape
over `reveal` (menu) or `move` (modal, dock), from a scale of `0.98`; it closes
over `leave`. Rows inside a menu or select come in one `step` (`step(-5)`) apart,
at most five. A piece inside an open layer stepping aside (a dock action, a
control, a tooltip) leaves over `touch`.

### 5.3 The surface kit

`src/ui/surface.tsx` holds what goes inside a surface: `surfaceButton`,
`surfaceIconButton`, `SURFACE_PRIMARY`, `SURFACE_DANGER`, `SURFACE_FIELD`,
`surfaceRow`, `SURFACE_TILE` and its parts, `SURFACE_TEXT`, `SURFACE_TITLE`,
`SURFACE_META`.

- **Tiles and rows carry no ring.** A tile is `bg-fill`; only a chosen one takes
  the grade ring (`SURFACE_TILE_LIT`). Rings stay on fields and buttons.
- **Text in a tile** is a title over a meta line with no gap (`SURFACE_TEXT`).
- **Radius inside a tile:** buttons and icon tiles are `rounded-inset`.
- **A list of rows shares one hover.** `HighlightGroup` and `useHighlight`
  slide a single `bg-fill` after the pointer or the keyboard focus, so a row
  sets no hover background of its own.
- **The action a surface exists for** (Save, Update review, Create, Add
  passkey) is always `SURFACE_PRIMARY`, white. Grade marks a chosen state,
  never a submit.
- **An icon button inside a tile** is bare (36px, no fill, no ring) and takes
  `bg-fill-hover` on hover.
- **A chosen button or row** uses the same grade steps as `TONE.chosen`.

## 6. Motion

Guffin has one motion engine, `src/motion/engine/`. Every page, dock surface,
scroll and CSS duration answers to it, so the interface moves like one
material. The engine standardises _laws_, not movements: a page writes a score
(who is on stage, what each part is made of, in what order they arrive) and the
engine supplies the time, the shape and the physics. `docs/motion-engine.md` is
the full reference; this section is the contract.

```ts
const movie = defineScore({
  tempo: 0,
  cast: {
    backdrop: { matter: "plate", depth: 1 },
    title: "ink",
    facts: "light",
    poster: { matter: "paper", enter: "door" },
    review: "paper",
  },
  opening: ["backdrop", "title", "facts", "poster"],
  sections: { reviews: ["review"] },
});
```

A score never contains a duration, a distance, an easing or a delay. If a page
seems to need one, the page is missing a matter, a verb or a rung (section 6.9).

### 6.1 Time: one ladder, one tempo

Every duration is a rung of the ladder in section 3.6. A page chooses only its
**tempo** (-2 to +2): how many rungs to slide the whole ladder. Because the
ladder is geometric, tempo scales every duration by the same factor.

| Surface                             | Tempo | Why                                               |
| ----------------------------------- | ----- | ------------------------------------------------- |
| Legal pages                         | -1    | Reading, not a scene                              |
| Film, person, home, account, salons | 0     | The default pace                                  |
| Dock surfaces                       | -2    | A tool in the hand, two rungs quicker than a page |
| Revisited page                      | -1    | A page already seen plays one rung quicker        |

In CSS, `StageRoot` and `SurfaceRoot` set `data-tempo` and `--tempo` on their
own root, and the `--step-*` tokens are declared on `:root,[data-tempo]` so they
resolve there. A duration written in a stylesheet keeps the time of the page it
is on.

### 6.2 Matter: weight, not seconds

A part says what it is made of. The matter fixes its rung, mass, damping, curve
and its entering and leaving verbs.

| Matter  | Rung | Arrives | Enters    | Leaves | For                      |
| ------- | ---- | ------- | --------- | ------ | ------------------------ |
| `light` | 1    | 0.81 s  | `glow`    | `fade` | Labels, facts, figures   |
| `glass` | 1    | 0.81 s  | `clear`   | `fog`  | Panels, buttons, notes   |
| `ink`   | 2    | 1.31 s  | `rise`    | `fade` | Titles, text             |
| `paper` | 2    | 1.31 s  | `lift`    | `sink` | Cards, posters, rows     |
| `metal` | 3    | 2.12 s  | `settle`  | `sink` | A heavy object           |
| `plate` | 4    | 3.43 s  | `develop` | `cool` | A backdrop, a photograph |

- **Leaving** takes two rungs less than arriving and never more than `step(2)`.
  A page lets go faster than it arrived.
- **A hand** (pointer, drag, keyboard) is answered three rungs quicker than the
  part arrived, by a spring of the same matter.
- An entering verb may be overridden per part (`enter: "door"`, `"wipe"`,
  `"still"`). Verbs are shapes (progress to look) and contain no time. Light
  reaches full strength by φ⁻¹ of the way, so a part reads before it settles.

### 6.3 Attention: one queue

- One beat asks for attention at a time. The next beat starts **two rungs
  inside** the previous one (`CUE_LEAD`): when the eye finds it, not when the
  last one lands.
- Copies of one part (list rows, words) arrive on a golden `trail`; however many
  there are, they fit in a window one rung below the part.
- A section scrolled into view joins the same queue, when its top edge reaches
  φ⁻¹ of the screen. Waiting cues shorten the gap by a rung, at most two
  (`HURRY_CAP`): a fast scroller never waits for an animation.
- A part in the cast that no beat calls plays with the last beat of the
  opening. Nothing stays in the dark.
- A part that must wait for its picture says `usePart(name, { ready: false })`;
  the beat holds for it, no longer than `step(3)`.
- A section that is the direct continuation of the opening but lives in its own
  scope is `Section now` / `Swap now`. Dock surfaces use `now` throughout.

### 6.4 Forces: depth and drift

- **Depth.** A part with `depth: d` moves at φ^(-d/2) of the scroll, dims to
  φ^-d and blurs by d·φ px as it is passed. A backdrop is `depth: 1`. A page
  never says "scroll 240px over 900px"; it gives a depth.
- **Drift.** A part with `drift: k` leans toward the pointer by `reach(-2) · k`
  px, through its matter's response spring.
- **A part owns `opacity`, `transform`, `filter` and `clip-path`.** If the
  element needs a transform of its own (`-translate-x-1/2`), put the part on a
  wrapper. Never write those four properties on a part in a class or a style.

### 6.5 Touch: the same matter at the speed of a hand

Hover, focus and press enter a part as a **force** and are blended with the
fields. The verbs are `press` (shrinks by φ⁻⁷), `lift` (rises `reach(-3)`) and
`glow` (brightens by φ⁻⁴). `:focus-visible` counts as hover and Enter as press.
A part takes `usePart(name, { touch: "lift" })`; a button that is not a part
takes `useTouch({ verb, matter })`, which writes only `transform` and `filter`.
This is the JavaScript half of the two beats in section 4.1; plain controls use
the CSS half.

### 6.6 Scroll, navigation and hand-over

- **The wheel is a force.** `<EngineProvider drive>` (in `providers.tsx`) turns
  each wheel step into a target and follows it with a critically damped spring
  whose period is `step(1 + tempo)`: a heavy page scrolls heavily. The browser's
  own scrolling (keyboard, scrollbar, touch, anchors) is adopted, never
  blocked. Nested scrollers, `data-scroll-native`, locked pages, horizontal and
  Ctrl/⌘ wheels are left alone. A dock surface's scroll box carries
  `data-scroll-native` and `overscroll-contain`.
- **Leaving is a contract.** `StageRoot` holds the framework's navigation. A
  trip to another path plays `stage.leave()` on every part, together, by matter,
  and the route is requested when the stage is `gone`. A change of query or hash
  is not a leave (`leaves` overrides this). A cancelled trip calls
  `stage.stay()`. Navigate with `useDockActions().navigate` or a framework
  link, never `router.push`, which skips the hold.
- **Hand-over.** `usePart("poster", { carry: "poster" })` lets a pressed picture
  fly to its twin on the next page, for `step(min(rung + tempo - 1, 2))` on
  `glide`. Poster rows carry `posterCarry(id)`; small pictures (reviews,
  rising members) do not.
- **Reduced motion.** Everything arrives at once, over `step(-1)`, by opacity
  alone: no movement, depth, drift or wheel driving. The clock sleeps when
  nothing moves, caps a frame at 1/20 s, and writes `will-change` only while
  moving. Without JavaScript, `[data-part]` is simply visible.

### 6.7 Colour: the room comes from the picture

`StageRoot grade={…}` takes a picture URL (the engine reads its tone), a `Tint`,
or `null` (a dark room). One hue is taken from the picture's coloured mid-tones;
lightness and chroma are fixed (OKLCH 0.74 / 0.1), so every page has the same
light in a different colour. It crosses the hue circle by the short way over
`step(3)` and is published on `<html>` as `--tint`, `--tint-presence`, `--light`
and `--grade` (the channels behind `bg-grade/15` and `text-grade`). The colour
is handed over between pages, and stays until the next page reads its own
picture. `Room` paints the light (wash, grain, lens glass, house lights) and has
no motion; `useShowing` dims the house by φ⁻¹ while a modal stands in front.

### 6.8 The kit and the recipes

Build with the kit in `src/motion/engine/kit/` (bound to the page's score by
`bindScore`) before writing anything of your own.

| Need                                                 | Use                                                            |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| A page, and its parts and sections                   | `StageRoot`, `Part` / `usePart`, `Section`                     |
| A headline or text that arrives by words or lines    | `Text` (`by="line"`, `mask`)                                   |
| A section heading (lamp, name, rule, actions)        | `Header` cast as `{ matter: "ink", enter: "still" }`           |
| A printed line of text that exposes and burns away   | `Expose` (`hover` replays the band)                            |
| A number that counts up                              | `Count`                                                        |
| Content that changes in place (filter, tab, page)    | `Swap`                                                         |
| Views kept alive while hidden                        | `Deck` (with `cue`, or as columns of sections)                 |
| A gallery wall hung in front of the page             | `WallStage`, `useWall`                                         |
| The light of the room                                | `Room`                                                         |
| A canvas or WebGL scene                              | `useScene` / `mountScene`: frames come from the engine's clock |
| A poster with tilt, glare and a hand-over            | `ArtworkPrint part carry`                                      |
| A carousel                                           | `Carousel part="…"`, each slide a part                         |
| An action button that belongs to the stage           | `ActionButton` with the page's `Part`                          |
| A dock surface (fields, rows, loaders, empty states) | `SurfaceStage`, `SurfacePart`, `SurfaceSwap`                   |
| A canvas that is not a scene                         | Do not. Mount it as a `useScene` part                          |

Rules of use:

- **Scopes nest.** `Swap`, `Deck` and `WallStage` open their own scope; a
  `Section` inside one joins it. What is done to a scope (`dismiss`, `recede`,
  `reset`) is done to everything under it.
- **Header sweeps.** A section's content enters with the header's light and
  only exposes, so a part below a `Header` takes `light` or `paper`, not a
  second movement.
- **Marks have their own verbs.** Bars and tiles enter with `door` (opening
  from their axis or base), a rule with `wipe`, a heading with `still`.
- **Surfaces** are tempo -2: a short rest while the dock opens, then fields and
  rows in DOM order. A loaded list, a category or a region is a `SurfaceSwap`;
  loading, empty and error states are a `note` (`glass`) in the rows' place.
  There are no directional entrances (`left`, `right`).
- **Export bound components one by one** from a client module
  (`export const PageStage = bound.StageRoot`); destructured exports are not
  visible to server components.
- **Salons and scenes** own their arrival (`enter: "still"`); the engine owns
  their leaving. Their renderers take `dt` from the engine and keep no
  `requestAnimationFrame` loop of their own.

### 6.9 Extending the engine

When the engine has no word for what you need, add the word; do not step around
it.

| Missing           | Add                                            | Where                    |
| ----------------- | ---------------------------------------------- | ------------------------ |
| A weight          | A matter                                       | `matter.ts`              |
| A movement        | An entering or leaving verb (progress to look) | `verbs.ts`               |
| A curve           | A named cubic in `POINTS`                      | `curve.ts` (CSS follows) |
| A force on a part | A field                                        | `fields.ts`              |
| A piece of chrome | A kit component, bound to the score            | `kit/`                   |
| A new page        | A score, in the feature's `motion.tsx`         | `features/<name>/`       |

Then document it here if it changes a contract, and in `docs/motion-engine.md`
for the detail. Try it in `/lab/kit` (every kit piece) or `/lab/engine` (tempo,
replay, leave, hand-over, wheel, depth, scene, touch); both are development
only and return 404 in production.

## 7. Exceptions

These are tuned against the picture rather than the interface, and are the only
places the rules above bend:

- **The projection room's optics:** the sheen, the ambient wash, grain, the dock
  banner's masks, the reticle, the film tube and the projector's camera and
  lens springs may sit below the 5% step and use raw white or black.
- **The idle screen's CRT** (switch-off collapse, beam) keeps its own curves and
  timings; it imitates a device, not the interface.
- **The kit's exposure light** (`Expose`, `Header`, `Room`) is a warm white near
  `#fcfcfb` and may use raw rgb, because it is light on the picture.
- **A member's backdrop** washed behind a notification: 25, 40 on hover.
- **Pointer followers** (the reticle's cursor loop, `layout-flow`'s FLIP
  playback) run their own frame or Web Animation, because they track the
  pointer or the layout, not a score; their curves still come from `POINTS`.
- **Scene renderers** (the three salons, the projection) keep their own
  time-bases and shaders; only their frames, `dt`, pixel ratio and leaving come
  from the engine.
- **Data-viz geometry** (the career chart's 3px gaps and bar corners) follows
  the chart, not the radius scale.
- **The labs** (`/lab/*`) follow the same tokens; only their stand-in pictures
  (gradients in place of stills) use raw colours, because they are pictures.

Anything else that seems to need an exception needs a role instead.

## 8. Common mistakes

| Don't                                                      | Do                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| `bg-white/[0.07]`, `text-[13px]`, `rounded-[14px]`         | `bg-fill-hover`, `type-control`, `rounded-card`             |
| `text-sm`, `text-gray-400`                                 | `type-body`, `text-ink-muted`                               |
| `shadow-lg`, `drop-shadow-*`                               | Nothing: separate with glass, ring and blur                 |
| `hover:text-ink` alone                                     | `hover:text-ink focus-visible:text-ink`                     |
| `hover:underline`                                          | `underline decoration-transparent hover:decoration-current` |
| A link that dims to `ink-body` on hover                    | Rest at `ink` or `ink-body`, rise to `ink`                  |
| A white chosen tab or a grade submit button                | Chosen: `TONE.chosen`. Submit: `SURFACE_PRIMARY`            |
| A hand-written `bg-white text-black` button                | `PRIMARY`                                                   |
| A copied input style                                       | `SURFACE_FIELD` through `cn`                                |
| `focus-visible:outline-*` on a component                   | Nothing: the outline is global                              |
| `duration-300`, `ease-in-out`                              | `duration-reveal`, `ease-out-cream`                         |
| `transition={{ duration: 0.4, ease: "easeOut" }}`          | `{ duration: step(1), ease: [...POINTS.expo] }`             |
| A hand-tuned `{ stiffness: 52, damping: 17 }`              | `springForce(response(MATTER.paper, n))`                    |
| `delay: 0.1 + i * 0.04`                                    | `step(-3) + i * step(-5)`, or a part with `index`           |
| A page that says how long or how far                       | A score: matter, depth, order                               |
| `opacity` or `transform` classes on a part                 | A wrapper element that owns the class                       |
| Your own `requestAnimationFrame` loop or smooth-scroll lib | The engine's clock (`useScene`) and `drive`                 |
| `router.push` to leave a page                              | `useDockActions().navigate`, which waits for the stage      |
| `text-ink-faint` on a date                                 | `text-ink-muted`                                            |
| A hover background on a row in a list                      | `HighlightGroup` / `useHighlight`                           |

## 9. Checklist

Before finishing UI work:

- [ ] Every colour, size, radius and duration is a role from this document.
- [ ] No arbitrary value for colour, type, radius, shadow or opacity.
- [ ] Every `hover:` has its `focus-visible:` twin (`group-` forms included).
- [ ] Controls rest at `ink-body` or brighter and rise to `ink`.
- [ ] Chosen uses grade; the submit action uses `PRIMARY`.
- [ ] Nested radii come from `nested()` or `rounded-inset`.
- [ ] Classes are merged with `@/ui/cn`.
- [ ] A new page has a score; its parts are matters, not seconds.
- [ ] No duration, delay, easing or spring is typed by hand; all come from
      `step`, `POINTS` or `springForce(response(…))`.
- [ ] The page's `main` carries `ui-scene`; a surface uses `SurfaceStage`.
- [ ] Reduced motion was tried: the page still reads.
- [ ] `npm run typecheck`, `npm run lint` and `npm run format:check` pass.

Quick audits, each of which should print nothing:

```bash
# arbitrary opacity
grep -rnE '[a-z]+/\[[0-9.]+\]' src --include='*.ts' --include='*.tsx'
# shadows
grep -rnE '\b(shadow|drop-shadow|inset-shadow)-' src --include='*.ts' --include='*.tsx'
# Tailwind palette colours
grep -rnE '\b(text|bg|ring|border)-(gray|zinc|slate|neutral|stone|red|orange|amber|yellow|green|emerald|teal|sky|blue|indigo|violet|purple|pink|rose)-[0-9]' src
# Tailwind and arbitrary type sizes
grep -rnE '\btext-(xs|sm|lg|xl|[2-9]xl|\[[0-9])' src/features src/ui src/motion src/config src/app
# Tailwind radii, tracking and weights
grep -rnE '\brounded(-[trbl]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|tracking-(tighter|tight|normal|wide|wider|widest)|font-(thin|extralight|light|normal|extrabold|black)\b' src
# raw durations and easings in classes
grep -rnE '\b(duration|delay)-[0-9\[]|ease-(in-out|in|out|linear)([^-a-z]|$)' src --include='*.ts' --include='*.tsx'
# the old underline form
grep -rn 'hover:underline' src --include='*.ts' --include='*.tsx'
# retired motion systems
grep -rnE 'motion/(stage|scene|scroll)|SmoothScroll|data-lenis' src --include='*.ts' --include='*.tsx'
```
