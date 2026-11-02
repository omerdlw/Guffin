# Guffin Design System

Guffin is a film diary with a cinematic, dark-only interface. This document is
the contract for how it looks and moves. It is written for contributors and for
AI agents that generate or review UI in this repository: follow it literally,
and when it is silent, extend the system instead of working around it.

## 1. Working with this system

### 1.1 The one idea

**Every visual value has a role, and every role has one value.** A colour is
not "white at 6%"; it is `fill`. A radius is not "14px"; it is `card`. A
duration is not "400ms"; it is `reveal`. Components name roles, never raw
values, so changing the system means changing one line.

### 1.2 Where the values live

| What                                     | Where                                                               |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Tokens (colour, type, radius, time)      | `src/app/globals.css`, `@theme`                                     |
| Class recipes (`TONE`) and `RADIUS`      | `src/ui/page.ts`                                                    |
| Layer chrome (`SHELL`, `PRIMARY` …)      | `src/config/theme/chrome.ts`                                        |
| Surface kit (buttons, tiles, fields)     | `src/ui/surface.tsx`                                                |
| Shared row hover                         | `src/ui/highlight-group.tsx`                                        |
| Class merging that understands tokens    | `src/ui/cn.ts`                                                      |
| Durations, easing, springs (JS mirrors)  | `src/motion/stage/tempo.ts` (`size`, `EASE`, `SPRING`)              |
| Page choreography                        | `src/motion/stage/choreography.ts` (`GRAMMAR`), `src/motion/stage/` |
| Theme slots for dock, modal, menu, toast | `src/config/theme/*.ts`                                             |

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
9. Durations and easings come from the scale in section 3.6.
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

All durations come from one scale, `size(n) = 0.5s × φⁿ`, rounded to 5ms in
CSS.

| Token    | n   | ms   | For                                   |
| -------- | --- | ---- | ------------------------------------- |
| `ripple` | -6  | 30   | A stagger across many marks (a dial)  |
| `flick`  | -4  | 75   | Staggers between siblings             |
| `touch`  | -3  | 120  | A press going down; a tooltip closing |
| `leave`  | -2  | 190  | Something closing                     |
| `light`  | -1  | 310  | A small light coming up (tooltip)     |
| `reveal` | 0   | 500  | A hover or focus arriving             |
| `move`   | 1   | 810  | A press coming back; a turn           |
| `settle` | 2   | 1310 | A hover fading out; an image arriving |
| `linger` | 3   | 2120 | Afterglow, zoom, shimmer              |

| CSS            | JS `EASE` | Job                                     |
| -------------- | --------- | --------------------------------------- |
| `out-cream`    | `cream`   | A hover or focus arriving               |
| `phosphor`     | —         | Light decaying after the pointer leaves |
| `out-expo`     | `expo`    | Chrome and readouts snapping in         |
| `out-quint`    | `silk`    | Names and lines settling                |
| `fade`         | `fade`    | Plain opacity                           |
| `in-out-cubic` | `glide`   | Loops, sweeps, scrubs                   |
| `in-cubic`     | —         | Leaving                                 |

Transitions are off by default in `globals.css` and exist inside `.ui-motion`,
`.ui-scene` and `[data-cinematic]`; a component that animates lives inside one.

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

Springs (`SPRING` in `tempo.ts`): `press` for a control going down and back,
`follow` for a highlight sliding after the pointer or the choice
(`SlidingHighlight`, the segmented control's pill). A stagger between marks
steps by `ripple` (a rating's stars) or `flick` (siblings).

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
over `leave`. Rows inside a menu or select come in one `step` (size(-5)) apart,
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

## 6. Entrances

- Content inside a page section enters with `from="light"`; the section
  header's sweep carries the movement, so the content only exposes.
- Data marks use `grow` (bars) and `dot` (timeline points).
- Dock surfaces use `up` for rows and `scale` for a single state (loading,
  empty, error).
- As the page scrolls, the header layers (title, rule, tagline, prose) dim to
  the same depth, `0.2`, one after another (`GRAMMAR.layers`).

## 7. Exceptions

These are tuned against the picture rather than the interface, and are the only
places the rules above bend:

- **The projection room's optics:** the sheen, the ambient wash, grain, the dock
  banner's masks, the reticle and the film tube may sit below the 5% step and
  use raw white or black.
- **A member's backdrop** washed behind a notification: 25, 40 on hover.
- **Page choreography** (stage, cinema, the spotlight scenes) keeps its own
  timings.
- **Data-viz geometry** (the career chart's 3px gaps and bar corners) follows
  the chart, not the radius scale.

Anything else that seems to need an exception needs a role instead.

## 8. Common mistakes

| Don't                                              | Do                                                          |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `bg-white/[0.07]`, `text-[13px]`, `rounded-[14px]` | `bg-fill-hover`, `type-control`, `rounded-card`             |
| `text-sm`, `text-gray-400`                         | `type-body`, `text-ink-muted`                               |
| `shadow-lg`, `drop-shadow-*`                       | Nothing: separate with glass, ring and blur                 |
| `hover:text-ink` alone                             | `hover:text-ink focus-visible:text-ink`                     |
| `hover:underline`                                  | `underline decoration-transparent hover:decoration-current` |
| A link that dims to `ink-body` on hover            | Rest at `ink` or `ink-body`, rise to `ink`                  |
| A white chosen tab or a grade submit button        | Chosen: `TONE.chosen`. Submit: `SURFACE_PRIMARY`            |
| A hand-written `bg-white text-black` button        | `PRIMARY`                                                   |
| A copied input style                               | `SURFACE_FIELD` through `cn`                                |
| `focus-visible:outline-*` on a component           | Nothing: the outline is global                              |
| `duration-300`, `ease-in-out`                      | `duration-reveal`, `ease-out-cream`                         |
| `text-ink-faint` on a date                         | `text-ink-muted`                                            |
| A hover background on a row in a list              | `HighlightGroup` / `useHighlight`                           |

## 9. Checklist

Before finishing UI work:

- [ ] Every colour, size, radius and duration is a role from this document.
- [ ] No arbitrary value for colour, type, radius, shadow or opacity.
- [ ] Every `hover:` has its `focus-visible:` twin (`group-` forms included).
- [ ] Controls rest at `ink-body` or brighter and rise to `ink`.
- [ ] Chosen uses grade; the submit action uses `PRIMARY`.
- [ ] Nested radii come from `nested()` or `rounded-inset`.
- [ ] Classes are merged with `@/ui/cn`.
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
# the old underline form
grep -rn 'hover:underline' src --include='*.ts' --include='*.tsx'
```
