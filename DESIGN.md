# Guffin Design System

Guffin is a film diary with a cinematic interface with a dark and a light theme. This document is
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

### 1.2 Where things live

```
src/design/
  styles/        the system's CSS: tokens, palettes, interaction, cinematic, effects
  foundations/   what components are built from, no React
    cn.ts          class merging that knows every token family
    variants.ts    CVA, merged through cn
    tones.ts       TONES (one per intent), STATE (disabled, busy), TONE, FILL
    layers.ts      layerVariants and SHELL, FLOAT, TIP, BACKDROP, DIM, GLASS
    geometry.ts    the control ladder (CONTROL), RADIUS, nested()
    layout.ts      page containers, columns, headline and prose measures
  hooks/         use-dock-link-click, use-confirm
  components/    one folder per component
    <name>/
      index.ts            the public API: import from "@/design/components/<name>"
      <name>.tsx          the component
      variants.ts         its CVA recipes, when it has variants
      <name>.module.css   its own CSS, when it needs any
```

| Component           | Exports                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `button`            | `Button`, `ActionButton`, `buttonVariants`                                               |
| `input`             | `Input`, `Textarea`, `inputVariants`                                                     |
| `checkbox`          | `Checkbox`, `CheckboxIndicator`, `checkboxVariants`                                      |
| `switch`            | `Switch`, `switchVariants`                                                               |
| `select`            | `Select`, `selectTriggerVariants`, `selectMenuVariants`, `selectOptionVariants`          |
| `segmented-control` | `SegmentedControl`, `SurfaceSegmentedControl`, `segmentedControlVariants`                |
| `tooltip`           | `Tooltip`, `TOOLTIP` (its parts, for a surface drawn without it)                         |
| `media-card`        | `MediaCard`, `mediaCardVariants`, `mediaFrameVariants`                                   |
| `carousel`          | `Carousel`, `carouselArrowVariants`                                                      |
| `image`, `avatar`   | `Image` (`layout` fill/intrinsic, `fit` cover/contain); `Avatar`                         |
| `icon`, `logo`      | `Icon`; `Logo`                                                                           |
| `backdrop`          | `BACKDROP_HERO`, `BACKDROP_HERO_MASK`, `BackdropHeroSkeleton`                            |
| `link`              | `Link`, `DockLink`, `ExternalLink`, `LinkButton`, `TextButton`, `FactLink` (`variant`)   |
| `loader`            | `Loader`, `Spinner`                                                                      |
| `skeleton`          | `SkeletonBlock`, `SkeletonLines`, `SKELETON` and page skeletons                          |
| `surface`           | `SurfaceStage`, `SurfacePart`, `DockAction`, `rowVariants`, `tileVariants`, tile anatomy |
| `highlight-group`   | `HighlightGroup`, `useHighlight` (one shared hover for a list)                           |
| `indicator`         | `SlidingHighlight`, `SlidingPill` (fills that follow the choice)                         |
| `route-error`       | `RouteError`                                                                             |

Outside `src/design`:

| What                                      | Where                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| The document reset and nothing else       | `src/app/globals.css`                                                                   |
| A feature's own CSS                       | Beside it, as `*.module.css` (e.g. `src/features/home/hero.module.css`)                 |
| Time, curves, springs (the ladder)        | `src/motion/utils.ts` (`step`), `constants.ts` (`POINTS`), `time.ts` (`SPRING`, matter) |
| The ladder as CSS (`--step-*`, `--curve`) | `src/motion/color.ts`, written to `:root` by the engine                                 |
| Page choreography (scores)                | `src/features/*/motion.tsx`                                                             |
| Motion reference (laws, kit, lab)         | `docs/motion-engine.md`, `/lab/engine`, `/lab/kit` (dev only)                           |
| Framework slots: dock, modal, menu, toast | `src/app/theme.ts` (built from `foundations/` and component variants)                   |

### 1.3 Workflow for any UI change

1. **Look for an existing recipe** in the table in section 5 before writing
   classes. Most surfaces are one `TONE.*`, one surface-kit export or one
   `src/design` component or recipe.
2. **Compose from roles.** Use the tokens in section 3 and the state rules in
   section 4.
3. **If a value you need has no role, add one** (token in `@theme`, mirror in
   TypeScript if it has one, a row in this document). Never reach for an
   arbitrary value.
4. **Merge classes with `cn`** from `@/design/foundations/cn`, not the framework's. It knows
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
9. Time comes from the ladder in section 3.7; a page names what a part is made
   of and never how long it takes (section 6).
10. Components do not draw their own focus outline.

## 2. Principles

- **Quiet, in two themes.** Dark is near-black with off-white ink; light is
  paper (the ambient `shadow` lifted to L 0.95, so a pale tint of the picture's
  own hue) with near-black ink. Chrome recedes so the picture can lead. The
  theme is `data-theme` on `<html>` (Settings → Appearance: System, Light,
  Dark; `src/lib/theme.ts`). **Each theme is art-directed on its own.**
  Components name roles (`ink`, `fill`, `glass`, `primary`); each theme gives
  every role its own value in `src/design/styles/themes.css`, and neither is
  computed by turning the other over. Dark surfaces are light breathed onto
  the page; light layers are frosted white sheets with crisp edges. Text that
  sits on a photograph takes `on-photo`, which keeps the dark palette inside
  that element in light.
- **The picture sets the colour.** On film and person pages the accent is the
  _grade_, a colour taken from the artwork. Without a picture it falls back to
  white. Nothing else introduces an accent.
- **Light, not weight.** Surfaces are 5% fills and 1px rings. Layers are glass.
  Hierarchy comes from ink steps and type, never from shadows or borders.
- **One answer to a touch.** Every control reacts in the same two beats: light
  arriving fast, decaying slowly. Consistency is the polish.
- **One scale.** 5% opacity steps, a 4px corner grid, a golden-ratio time scale.
- **Slow, soft, in focus.** Nothing is hurried and nothing cuts in. A part comes
  out of the soft (blur, scale, opacity together) and takes its edge last, so
  the eye follows every movement from its first frame to its last.
- **The same every time.** A page opens with the same sequence, at the same
  times, in the same rhythm, on every visit (section 6.3).

## 3. Foundations

### 3.1 Colour

Tailwind's palette is switched off: every colour is a role.

#### Ink: text and glyphs on the page

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
its second press `bg-danger text-on-accent` (`TONES.armed`).

#### Page, layers and the primary action

| Token                   | Dark                      | Light                 | Role                                      |
| ----------------------- | ------------------------- | --------------------- | ----------------------------------------- |
| `bg-page`               | ambient shadow, near #000 | ambient hue at L 0.95 | The page; a curtain over it               |
| `bg-glass`              | page at 70%               | white at 72%          | Chrome: dock, menus, modals, tooltips     |
| `bg-veil`               | page at 60%               | white at 60%          | A control or backdrop laid over a picture |
| `bg-dim`                | page at 30%               | ink at 20%            | What sits behind a modal                  |
| `bg-primary` / `-hover` | ink / ink 90%             | ink / ink lifted 14%  | The one action a surface exists for       |
| `text-on-primary`       | page                      | white                 | Ink on the primary action                 |
| `text-on-accent`        | page                      | white                 | Ink on a solid grade or danger fill       |

- **Data marks** use the ink steps as colours: `bg-line` for the track or axis,
  `bg-ink-faint` / `bg-ink-muted` / `bg-ink-body` for marks, `bg-ink` for the
  current one. A progress fill is `bg-ink-body`.
- **`primary`** is the submit action, a checked switch, a thumb riding its
  track and the text caret. A chosen control is never primary.
- **A scrim under text on a picture** is `from-page/80` inside `on-photo`.
- `white` and `black` survive only as aliases for the framework's defaults;
  product code never names them.

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
that take a number (`MediaCard`, `Tile`) and inline styles read `RADIUS`.

**A carousel's ends wear its cards' corners.** The track clips its picture
band to the radius of the first card's frame, so a card scrolled half out is
cut along a curve equal to its own, never a square edge. Captions under the
frames are left square.

### 3.5 Geometry

Every interactive block sits on one height ladder, so controls placed side by
side (dock actions, a field and its button, a row of chips) share a baseline
and a centre line. A rung fixes the whole box: height, inline padding, the gap
between glyph and label, the glyph size and the type step travel together.

| Size     | Class              | px  | Padding | Gap | Glyph | Type      | For                              |
| -------- | ------------------ | --- | ------- | --- | ----- | --------- | -------------------------------- |
| `xs`     | `h-control-xs`     | 24  | 10      | 4   | 12    | `label`   | Badges, inline chips             |
| `sm`     | `h-control-sm`     | 32  | 14      | 6   | 14    | `meta`    | Compact toolbars, media controls |
| `chrome` | `h-control-chrome` | 36  | 16      | 8   | 16    | `control` | Dock and modal chrome            |
| `md`     | `h-control-md`     | 40  | 16      | 8   | 16    | `control` | The default; the dock action     |
| `lg`     | `h-control-lg`     | 48  | 20      | 10  | 18    | `body`    | Hero actions, touch-first rows   |

A square control is `size-control-*` (`<Button icon>`). A height off
the ladder (`h-7`, `h-9`, `h-11`) on a control is a bug; on an avatar, a
picture or a mark it is not a control and is free.

### 3.6 Depth

There are no shadows. Tailwind's shadows and arbitrary ones are switched off,
and no layer, control, picture or mark casts one. A layer is told from the page
by its glass, its ring and its blur alone.

### 3.7 Time and easing

All time is one geometric ladder, `step(n) = 0.5s × φⁿ`. In TypeScript it is
`step(n)` from `@/motion/utils`; in CSS it is `--step-n6 … --step-6` (and the
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

Every curve starts gently and keeps moving to the end. As the share of its time
a curve has used when it reaches 50% / 90% of the way: `fade` 35 / 63, `silk`
34 / 61, `pour` 31 / 59, `expo` 27 / 58, `fall` 50 / 77. (The curves these
replaced reached 90% after a third of their time, which is why a 1.3 s arrival
looked finished in half a second.) New curves are measured the same way: no
curve may reach 90% before half of its time.

The engine also owns `pour`, `dolly` and `fall`, reached as `--curve-<name>` in
CSS. The CSS names that have an engine curve are aliases of its `--curve-*`
variable, so there is one definition of each. In motion's API, pass a curve as
`[...POINTS.expo]` and a duration as `step(n)`; never a number of seconds.

#### Focus

Blur is a rung like time: `haze(n) = φⁿ` px, in CSS `--haze-n1 … --haze-6`
(0.6 px … 17.9 px). It is a force of the same standing as opacity, scale and
travel, and the engine caps what one part may carry at once (`HAZE_CAP`,
`haze(6)`).

- Entering and leaving verbs carry it: opacity lands first, then scale and blur
  finish with the movement, so the last thing seen is the part coming into
  focus.
- A press softens the control by `haze(-1)` and lets it back into focus.
  Nothing at rest is blurred: pointing at a card in a carousel never puts its
  neighbours out of focus.
- **Glass never carries a filter.** A filter on an element takes the backdrop
  away from every `backdrop-filter` below it, so layers (`SHELL`, `FLOAT`, the
  dock card) animate by opacity and scale; what is written inside them (text,
  icons, rows) comes out of the soft.
- Reduced motion removes blur with the rest of the movement.

Transitions are off by default (`src/design/styles/interaction.css`) and exist inside `.ui-motion`,
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

Springs (`SPRING` in `src/motion/time.ts`) are the engine's own, turned
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
| Disabled | `STATE.disabled`: `opacity-50`, no pointer, no press                                    |
| Busy     | `STATE.busy`: keeps its colour, wait cursor, the loader over the label                  |
| Submit   | `<Button intent="primary">`. Grade marks a chosen state, never a submit                 |

Each row is one tone in `src/design/foundations/tones.ts` (`TONES.neutral`,
`chosen`, `primary`, `danger`, `armed`, `glass`, `ghost`): a complete answer
to rest, hover, focus-visible and active, written against roles only.

**Hover and focus arrive together.** Every `hover:` that changes colour has a
`focus-visible:` twin that does the same; on a field it is `focus:`. Under a
`group`, a `group-hover:` colour or opacity has two twins:
`group-focus-visible:` for when the group itself takes focus and
`group-has-focus-visible:` for when something inside it does. Movement
(`translate`, `scale`) has no twin.

**Inside one hover target** (`group`: a row, card or tile) the title rises to
`ink` and its secondary parts (an icon, a meta line) take one step,
`ink-muted` to `ink-body`, through `group-hover`. Nothing else steps by one.

**Focus outline** comes from `src/design/styles/interaction.css`: 1.5px in
`--focus-ring` (20% ink in dark, 35% in light), or 40% grade on film and
person pages. Components do not set their own. What a component may
add is the state's own step: `focus-visible:ring-edge-focus` on a button or
tab, `focus:bg-fill-hover focus:ring-edge-focus` on a field. Fields are
`<Input>` (or `inputVariants()`), never a copy of it.

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

### 5.1 Pick the component

| You need                                  | Use                                                              |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Any button                                | `<Button intent size shape icon width>`                          |
| A link drawn as a button                  | `<LinkButton intent size shape dock>`                            |
| A link: a card, a row, running text       | `<Link variant>`, `<DockLink variant>`, `<ExternalLink variant>` |
| A text action (Read more, Show it anyway) | `<TextButton variant>` (`inline`, `reveal`, `label`, `quiet`)    |
| A picture                                 | `<Image layout fit wrapperClassName>`; never a bare `<img>`      |
| A toggle on a detail page                 | `<ActionButton>`                                                 |
| The button that shows the rest of a list  | `<Button intent="neutral" shape="pill" width="full">`            |
| A text field                              | `<Input size shape>`, `<Textarea>`                               |
| A choice that applies at once             | `<Switch>`                                                       |
| A row that is checked                     | `<CheckboxIndicator>` inside the row; `<Checkbox>` alone         |
| A select                                  | `<Select size shape>`                                            |
| Tabs that switch a view                   | `<SegmentedControl size shape width>`                            |
| A picture that is a target                | `<MediaCard aspect framed>` in a `<Carousel>`                    |
| A label on hover                          | `<Tooltip>`                                                      |
| A row or tile inside a surface            | `rowVariants({ intent })`, `tileVariants()` and the anatomy      |
| Floating chrome over a picture            | `TONE.glass`; carousel arrows `TONE.arrows`                      |
| A small caps label                        | `TONE.label`                                                     |
| Dividers between rows                     | `TONE.rule`, `TONE.rules`                                        |
| Long-form reading                         | `PROSE_CLASS` (`PROSE_TYPE`)                                     |
| A page headline                           | `headlineClass()`, `HEADLINE_*`                                  |

### 5.2 Layers

The dock, modals, the context menu, toasts and tooltips are cut from one set of
chrome in `src/design/foundations/layers.ts`.

| Name       | Look                                                | For                                |
| ---------- | --------------------------------------------------- | ---------------------------------- |
| `SHELL`    | `glass`, `ring-edge-hover`                          | Dock card, modal, context menu     |
| `FLOAT`    | The same glass, blurred                             | Dock controls, breadcrumbs, toasts |
| `TIP`      | The same glass with `ring-edge` and `ink-lead` text | Tooltips (and `TOOLTIP.content`)   |
| `BACKDROP` | `veil`, `blur-md`                                   | What dims the page behind a layer  |
| `DIM`      | `dim`, `blur-xs`                                    | A layer left under the top one     |
| `FILL`     | `fill` / `edge`, one step up on hover               | A control inside a layer           |
| `PRIMARY`  | `primary`, `on-primary` ink, a 10% sheen            | The one action a layer exists for  |

Each is a call of `layerVariants({ kind })` or a tone in `foundations/tones.ts`.

Shells hold content on the card scale: a shell is `rounded-shell` (26), or
`rounded-sheet` (24) for the menu, and what sits inside is `rounded-card`. A
select's list is a menu: `SHELL` with `backdrop-blur-xl`.

**Layer motion.** Every layer opens with its opacity over `light` and its shape
over `reveal` (menu) or `move` (modal, dock), from a scale of `0.98`; it closes
over `leave`. Rows inside a menu or select come in one `step` (`step(-5)`) apart,
at most five. A piece inside an open layer stepping aside (a dock action, a
control, a tooltip) leaves over `touch`.

### 5.3 Inside a surface

`components/surface` holds the stage a dock surface plays in (`SurfaceStage`,
`SurfacePart`, `DockAction`), the row and tile recipes (`rowVariants`,
`tileVariants`) and the tile's anatomy (`SURFACE_TEXT`, `SURFACE_TITLE`,
`SURFACE_META`, `SURFACE_TILE_INNER` …).

- **Tiles and rows carry no ring.** A tile is `bg-fill`; only a chosen one takes
  the grade ring. Rings stay on fields and buttons.
- **Text in a tile** is a title over a meta line with no gap (`SURFACE_TEXT`).
- **Radius inside a tile:** buttons and icon tiles are `rounded-inset`.
- **A list of rows shares one hover.** `HighlightGroup` and `useHighlight`
  slide a single `bg-fill` after the pointer or the keyboard focus, so a row
  sets no hover background of its own.
- **The action a surface exists for** (Save, Update review, Create, Add
  passkey) is always `<Button intent="primary">`. Grade marks a chosen state,
  never a submit.
- **An icon button inside a tile** is bare (36px, no fill, no ring) and takes
  `bg-fill-hover` on hover.
- **A chosen button or row** uses the same grade steps as `TONE.chosen`.

### 5.4 The variant API

Every component is driven by props, and its look lives in a `variants.ts`
beside it, written with CVA through `variants()` (`foundations/variants.ts`),
which merges with `cn`: a caller's class replaces the recipe's class of the
same family instead of both landing in the DOM.

```tsx
<Button intent="primary">Save</Button>
<Button intent="ghost" icon shape="pill" size="sm" aria-label="Close">…</Button>
<Select options={…} value={v} onChange={setV} size="sm" shape="pill" />
<SegmentedControl items={…} value={tab} onChange={setTab} size="md" width="fill" />
<Link className={buttonVariants({ width: "full" })} href="/">Home</Link>
```

The props mean the same thing on every component:

| Prop     | Values                                                              |
| -------- | ------------------------------------------------------------------- |
| `intent` | `neutral`, `chosen`, `primary`, `danger`, `armed`, `glass`, `ghost` |
| `size`   | a rung of the ladder: `xs`, `sm`, `chrome`, `md`, `lg`              |
| `shape`  | `card`, `pill` (and `thumb` for a button)                           |
| `width`  | `auto`, `full`, `fill` (shares a row with its siblings)             |

- Write every class literally inside a recipe: Tailwind reads the source, so a
  class assembled at runtime is never generated.
- A new visual state is a new variant, never a ternary of class strings at the
  call site.
- `className` is for placement (margins, widths, grid positions), not for
  restyling a component. If a call site needs a different look, the component
  needs a variant.
- A component's folder is its boundary: features import from
  `@/design/components/<name>`, never from a file inside it.

### 5.5 Where a style lives

- **Global** (`src/app/globals.css`): the reset and the import of the design
  system. Nothing else.
- **System** (`src/design/styles`): tokens, palettes, the interaction
  contract, and vocabulary used by several features (`cine-*`, `ui-sheen`).
- **Component** (`*.module.css` beside it): keyframes, masks, pseudo-elements
  and cross-element selectors that only one component uses. Wrap rules in the
  layer the original sat in (`@layer components` or `utilities`) so utilities
  passed by a caller still win; reach page scopes with
  `:global([data-cinematic])`.
- **Inline** (Tailwind in the recipe or the element): everything else.

## 6. Motion

Guffin has one motion engine, `src/motion/`. Every page, dock surface,
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

Every duration is a rung of the ladder in section 3.7. A page chooses only its
**tempo** (-3 to +3): how many rungs to slide the whole ladder. Because the
ladder is geometric, tempo scales every duration by the same factor.

| Surface                             | Tempo | Why                                                 |
| ----------------------------------- | ----- | --------------------------------------------------- |
| Legal pages                         | -1    | Reading, not a scene                                |
| Film, person, home, account, salons | 0     | The default pace                                    |
| Dock surfaces                       | -3    | A tool in the hand, three rungs quicker than a page |

In CSS, `StageRoot` and `SurfaceRoot` set `data-tempo` and `--tempo` on their
own root, and the `--step-*` tokens are declared on `:root,[data-tempo]` so they
resolve there. A duration written in a stylesheet keeps the time of the page it
is on.

### 6.2 Matter: weight, not seconds

A part says what it is made of. The matter fixes its rung, mass, damping, curve
and its entering and leaving verbs.

| Matter  | Rung | Arrives | Enters    | Leaves | For                      |
| ------- | ---- | ------- | --------- | ------ | ------------------------ |
| `light` | 2    | 1.31 s  | `glow`    | `fade` | Labels, facts, figures   |
| `glass` | 2    | 1.31 s  | `clear`   | `fog`  | Panels, buttons, notes   |
| `ink`   | 3    | 2.12 s  | `rise`    | `fade` | Titles, text             |
| `paper` | 3    | 2.12 s  | `lift`    | `sink` | Cards, posters, rows     |
| `metal` | 4    | 3.43 s  | `settle`  | `sink` | A heavy object           |
| `plate` | 4    | 3.43 s  | `develop` | `cool` | A backdrop, a photograph |

Prose enters with `read` (word by word, a wave of light blur and a few pixels
of travel); a staircase step enters with `descend` (from above and a little
behind). Nothing is a block: text is split into words or letters, a heading
into lamp, letters, rule and actions, a sidebar into its rows.

Display type enters with `focus` (`{ matter: "ink", enter: "focus" }`): out of
a blur of `haze(5)`, a little larger and a little low, into its edge. Nothing
arrives in less than a second and a quarter.

- **Leaving** takes two rungs less than arriving and never more than `step(2)`.
  A page lets go faster than it arrived.
- **A hand** (pointer, drag, keyboard) is answered three rungs quicker than the
  part arrived, by a spring of the same matter.
- An entering verb may be overridden per part (`enter: "door"`, `"wipe"`,
  `"still"`). Verbs are shapes (progress to look) and contain no time. Light
  reaches full strength by φ⁻¹ of the way, so a part reads before it settles.

### 6.3 Attention: one queue

- One beat asks for attention at a time. The next beat starts **three rungs
  inside** the previous one (`CUE_LEAD`): when the eye finds it, not when the
  last one lands. Matters arrive one rung slower than they once did and the
  lead is one rung longer, so beats start when they always did and every part
  overlaps the one before it by more.
- Copies of one part follow each other by their `cadence`: rows and cards on a
  golden `trail` (each gap φ⁻¹ of the one before); words, letters and lines at
  an **even** gap, paced like speech, never bunched at the end; a column of
  rows or buttons on **stairs**: one step after another, top to bottom, the
  whole flight no longer than one arrival. A score may cast a cadence
  (`{ matter: "light", enter: "descend", cadence: "stairs" }`). However many
  there are, they fit in a window one rung below the part.
- **The opening is a fixed piece of time.** The curtain stays down until the
  opening's parts are ready (the picture, the fonts) or `PATIENCE` has run out;
  then the whole opening is laid on the clock at once, every beat at its own
  place on the score's timeline (`stage.timeline`), counted from the frame the
  curtain rose. What comes before the curtain is waiting; what comes after is
  always the same sequence at the same times. It does not depend on frame
  rate, scroll, a backlog, the order parts mounted in, or an earlier visit
  (there is no faster revisit). A part that mounts late takes its place on the
  timeline.
- A section scrolled into view joins the same queue, when its top edge reaches
  φ⁻¹ of the screen. Waiting cues shorten the gap by a rung, at most two
  (`HURRY_CAP`): a fast scroller never waits for an animation.
- A part in the cast that no beat calls plays with the last beat of the
  opening. Nothing stays in the dark.
- A part that must wait for its picture says `usePart(name, { ready: false })`;
  the curtain holds for it, no longer than `step(3)`.
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
fields. The verbs are `press` (shrinks by φ⁻⁷ and softens by `haze(-1)`), `lift` (rises `reach(-3)`) and
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
  `glide`. No page uses it for posters now: film and person pages always open
  on the title card (`Marquee`), so no picture flies in under it.
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
no motion; the grain is a file of its own (`/grain.png`), preloaded with the
document and laid from the first render, so it is there at the first paint and
is never faded in. `useShowing` dims the house by φ⁻¹ while a modal stands in front.

### 6.8 The kit and the recipes

Build with the kit in `src/motion/kit.tsx` (bound to the page's score by
`bindScore`) before writing anything of your own.

| Need                                                       | Use                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| A page, and its parts and sections                         | `StageRoot`, `Part` / `usePart`, `Section`                     |
| A headline or text that arrives by words or letters        | `Text` (`by="word"` `"char"` `"line"` `"block"`)               |
| A section heading (lamp, name, rule, actions)              | `Header` cast as `{ matter: "ink", enter: "still" }`           |
| A printed line of text that exposes and burns away         | `Expose` (`hover` replays the band)                            |
| A film's or person's name: lit from the left, then focused | `Bloom` cast as `{ matter: "ink", enter: "still" }`            |
| A page that opens on its title, picture cut into the name  | `Marquee` cast as `{ matter: "plate", enter: "still" }`        |
| A number that counts up                                    | `Count`                                                        |
| Content that changes in place (filter, tab, page)          | `Swap`                                                         |
| Views kept alive while hidden                              | `Deck` (with `cue`, or as columns of sections)                 |
| A gallery wall hung in front of the page                   | `WallStage`, `useWall`                                         |
| The light of the room                                      | `Room`                                                         |
| A canvas or WebGL scene                                    | `useScene` / `mountScene`: frames come from the engine's clock |
| A poster with tilt and glare                               | `ArtworkPrint part`                                            |
| A carousel                                                 | `Carousel part="…"`, each slide a part                         |
| An action button that belongs to the stage                 | `ActionButton` with the page's `Part`                          |
| A dock surface (fields, rows, loaders, empty states)       | `SurfaceStage`, `SurfacePart`, `SurfaceSwap`                   |
| A canvas that is not a scene                               | Do not. Mount it as a `useScene` part                          |

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

| Missing           | Add                                            | Where                   |
| ----------------- | ---------------------------------------------- | ----------------------- |
| A weight          | A matter                                       | `time.ts`               |
| A movement        | An entering or leaving verb (progress to look) | `time.ts`               |
| A curve           | A named cubic in `POINTS`                      | `time.ts` (CSS follows) |
| A force on a part | A field                                        | `forces.ts`             |
| A piece of chrome | A kit component, bound to the score            | `kit.tsx`               |
| A new page        | A score, in the feature's `motion.tsx`         | `features/<name>/`      |

Then document it here if it changes a contract, and in `docs/motion-engine.md`
for the detail. Try it in `/lab/kit` (every kit piece) or `/lab/engine` (tempo,
replay, leave, hand-over, wheel, depth, scene, touch); both are development
only and return 404 in production.

## 7. Exceptions

These are tuned against the picture rather than the interface, and are the only
places the rules above bend:

- **The projection room's optics:** the sheen, the ambient wash, grain, the reticle, the film tube and the projector's camera and
  lens springs may sit below the 5% step and use raw white or black.
- **The idle screen's CRT** (switch-off collapse, beam) keeps its own curves and
  timings; it imitates a device, not the interface.
- **The kit's exposure light** (`Expose`, `Header`, `Bloom`, `Room`) is a warm white near
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

| Don't                                                             | Do                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `bg-white/[0.07]`, `text-[13px]`, `rounded-[14px]`                | `bg-fill-hover`, `type-control`, `rounded-card`             |
| `text-sm`, `text-gray-400`                                        | `type-body`, `text-ink-muted`                               |
| `shadow-lg`, `drop-shadow-*`                                      | Nothing: separate with glass, ring and blur                 |
| `hover:text-ink` alone                                            | `hover:text-ink focus-visible:text-ink`                     |
| `hover:underline`                                                 | `underline decoration-transparent hover:decoration-current` |
| A link that dims to `ink-body` on hover                           | Rest at `ink` or `ink-body`, rise to `ink`                  |
| A white chosen tab or a grade submit button                       | Chosen: `intent="chosen"`. Submit: `intent="primary"`       |
| `bg-white text-black`, `bg-black/70`                              | `bg-primary text-on-primary`, `bg-glass`                    |
| A light value derived from the dark one (`black/5` for `white/5`) | A role, valued per theme in `themes.css`                    |
| `${a} ${lit ? "x" : "y"}` class strings                           | A variant: `<Button intent={lit ? "chosen" : "neutral"}>`   |
| A component's keyframes in `globals.css`                          | A `*.module.css` beside the component                       |
| `h-9` / `h-11` on a control                                       | A rung of the ladder: `h-control-chrome`, `h-control-lg`    |
| A copied input style                                              | `<Input>`                                                   |
| `focus-visible:outline-*` on a component                          | Nothing: the outline is global                              |
| `duration-300`, `ease-in-out`                                     | `duration-reveal`, `ease-out-cream`                         |
| `transition={{ duration: 0.4, ease: "easeOut" }}`                 | `{ duration: step(1), ease: [...POINTS.expo] }`             |
| A hand-tuned `{ stiffness: 52, damping: 17 }`                     | `springForce(response(MATTER.paper, n))`                    |
| `delay: 0.1 + i * 0.04`                                           | `step(-3) + i * step(-5)`, or a part with `index`           |
| A page that says how long or how far                              | A score: matter, depth, order                               |
| `opacity` or `transform` classes on a part                        | A wrapper element that owns the class                       |
| Your own `requestAnimationFrame` loop or smooth-scroll lib        | The engine's clock (`useScene`) and `drive`                 |
| `router.push` to leave a page                                     | `useDockActions().navigate`, which waits for the stage      |
| `text-ink-faint` on a date                                        | `text-ink-muted`                                            |
| A hover background on a row in a list                             | `HighlightGroup` / `useHighlight`                           |

## 9. Checklist

Before finishing UI work:

- [ ] Every colour, size, radius and duration is a role from this document.
- [ ] Controls sit on the geometry ladder and are drawn by a recipe.
- [ ] Both themes were looked at; a role that looks wrong in one is retuned in
      `themes.css`, not patched at the call site.
- [ ] No arbitrary value for colour, type, radius, shadow or opacity.
- [ ] Every `hover:` has its `focus-visible:` twin (`group-` forms included).
- [ ] Controls rest at `ink-body` or brighter and rise to `ink`.
- [ ] Chosen uses grade; the submit action uses `PRIMARY`.
- [ ] Nested radii come from `nested()` or `rounded-inset`.
- [ ] Classes are merged with `@/design/foundations/cn`.
- [ ] Controls are design-system components with props, not class strings.
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
grep -rnE '\btext-(xs|sm|lg|xl|[2-9]xl|\[[0-9])' src/features src/design src/motion src/config src/app
# Tailwind radii, tracking and weights
grep -rnE '\brounded(-[trbl]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|4xl)\b|tracking-(tighter|tight|normal|wide|wider|widest)|font-(thin|extralight|light|normal|extrabold|black)\b' src
# raw durations and easings in classes
grep -rnE '\b(duration|delay)-[0-9\[]|ease-(in-out|in|out|linear)([^-a-z]|$)' src --include='*.ts' --include='*.tsx'
# raw white and black (roles only)
grep -rnE '\b(bg|text|ring|border|from|to|via)-(white|black)\b' src --include='*.ts' --include='*.tsx'
# the old underline form
grep -rn 'hover:underline' src --include='*.ts' --include='*.tsx'
# retired motion systems
grep -rnE 'motion/(stage|scene|scroll)|SmoothScroll|data-lenis' src --include='*.ts' --include='*.tsx'
```
