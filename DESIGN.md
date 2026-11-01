# Design rules

Every visual value has a role, and every role has one value. The tokens live in
`src/app/globals.css` (`@theme`), with TypeScript mirrors in `src/ui/page.ts`
(`TONE`, `RADIUS`) and `src/motion/stage/tempo.ts` (`size`, `EASE`). If a value
you need is not here, add a role for it rather than an arbitrary one.

## Opacity

Opacity moves in steps of 5%. Arbitrary values such as `/[0.04]` or `/[0.07]`
are not used.

### Ink (text and glyphs on the dark page)

| Token            | Value | Role                                                      |
| ---------------- | ----- | --------------------------------------------------------- |
| `text-ink`       | 100   | Titles, names, fact values, the hovered state of anything |
| `text-ink-lead`  | 90    | A tagline; tooltip text                                   |
| `text-ink-body`  | 70    | Prose, secondary text, section titles, idle controls      |
| `text-ink-muted` | 50    | Labels, dates, meta, label-sized text actions             |
| `text-ink-faint` | 30    | Placeholder glyphs in empty frames                        |

A control never goes dimmer than `ink-body` at rest, and always comes up to
`ink` on hover or focus.

### Surfaces

| Token                             | Value       | Role                               |
| --------------------------------- | ----------- | ---------------------------------- |
| `bg-fill` / `-hover` / `-active`  | 5 / 10 / 15 | A surface at rest, hovered, chosen |
| `ring-edge` / `-hover` / `-focus` | 5 / 10 / 15 | Its inset ring, in the same states |
| `bg-rule`, `divide-rule`          | 5           | Dividers between rows              |
| `bg-line`                         | 10          | Tracks, axes, a timeline spine     |

### Grade (the colour taken from the picture)

| Use                         | Value                                        |
| --------------------------- | -------------------------------------------- |
| Chosen control              | `bg-grade/15 ring-grade/25`, hover `20 / 30` |
| Header rule                 | `bg-grade/20` drawn, `bg-grade/40` hairline  |
| Focus outline, section icon | 40, 85                                       |
| Text selection              | 30                                           |
| Glow under a chosen bar     | 50 (`shadow-glow`)                           |

Without a grade (no picture behind), the focus outline is 20% white.

### Other colours

Tailwind's palette is switched off: every colour is a role.

| Token                                 | Role                                         |
| ------------------------------------- | -------------------------------------------- |
| `watched`, `listed`, `liked`, `rated` | What a member did with a film                |
| `danger`                              | An error, a destructive action               |
| `award`                               | A statuette: the Oscars index, the year dial |
| `plate`                               | `fill` made opaque, for a frame over another |

Danger takes the grade's steps: text `text-danger`, a soft button
`bg-danger/15 ring-danger/25` (hover `20 / 30`), and a destructive action
armed for its second press `bg-danger text-black`, like `PRIMARY`.

### Marks, links and black

- Data marks and tracks use the ink steps as colours: `bg-line` for the
  track or axis, `bg-ink-faint` / `bg-ink-muted` / `bg-ink-body` for the
  marks, `bg-ink` for the current one. A progress fill is `bg-ink-body`.
- An underlined link: decoration (or border) `ink-faint`, `ink-muted` on
  hover.
- Raw white appears only as `PRIMARY` (and a checked switch): white,
  `white/90` on hover.
- Raw black appears only in the layers' glass (70), the backdrop and the
  glass over a picture (60), `DIM` (30), and a scrim under text on a picture
  (`from-black/80` to transparent).

### Element opacity

Disabled is `opacity-50`. A picture link dims to `opacity-80` on hover; an
idle picture in a list rests at 70 and comes up to 100.

## Radius

Corners sit on the 4px grid, named by what they round:

| Token           | px  | For                                        |
| --------------- | --- | ------------------------------------------ |
| `rounded-thumb` | 8   | Thumbnails, logos, small posters           |
| `rounded-tile`  | 12  | List rows                                  |
| `rounded-card`  | 16  | Cards, carousels, menus' options, tooltips |
| `rounded-panel` | 20  | Person cards, menus                        |
| `rounded-sheet` | 24  | The poster, modals                         |
| `rounded-full`  | —   | Buttons, pills, tabs, avatars              |
| `rounded-mark`  | 3   | A data mark: chart bar, calendar cell      |

Tailwind's radii (`rounded-sm`, `rounded-xl` …) and arbitrary ones are
switched off; `rounded-none` and `rounded-[inherit]` remain.

Two more are derived, not chosen: `rounded-inset` (10) is a card less the 6px
padding of a surface tile, for a tile inside one; `rounded-shell` (26) is a
card plus the 10px gutter of the dock and modal shells.

A frame inside another keeps the curves parallel: its radius is the outer one
minus the padding between them (`nested(outer, padding)`). A card of 20 with
`p-1` holds a photo of 16; a surface tile of 16 with `p-1.5` holds 10. Props
that take a number (`Carousel`, `MediaCard`, `Tile`) and inline styles read
`RADIUS`.

## Shadow

| Token                 | For                                                 |
| --------------------- | --------------------------------------------------- |
| `shadow-float`        | One control or note over the page; a dragged row    |
| `shadow-lift`         | A layer that holds content; the profile avatar      |
| `shadow-knob`         | A thumb riding its track (switch, slider, scrubber) |
| `shadow-stack`        | A poster laid over its neighbour                    |
| `shadow-glow`         | The chosen bar of a chart, in the grade             |
| `inset-shadow-top`    | The 1px top light of glass                          |
| `drop-shadow-legible` | Text set on a picture                               |

Tailwind's shadows and arbitrary ones are switched off.

## Type

Sizes are `type-*` utilities, never `text-*` (`text-*` is ink only). The
Tailwind sizes (`text-sm`, `text-xs` …) are switched off, as are arbitrary
sizes such as `text-[13px]`. Each step carries its line height:

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

- Line height: a step's own, `leading-none` for a single line set tight, or
  `leading-3` to `leading-9` (the 4px grid) for a paragraph. `leading-crop`
  (0.8) sets a Zuume figure on its caps. `tight`, `snug`, `relaxed` and
  arbitrary line heights are switched off.
- Tracking: text sits at 0. Only three roles track: `tracking-label` (0.14em,
  small caps labels), `tracking-tagline` (0.12em, set larger) and
  `tracking-slate` (0.32em, the intermission card).
- Weight: `font-medium`, `font-semibold`, `font-bold`; nothing else.
- Labels: `TONE.label` — `type-label`, semibold, `tracking-label`, uppercase.
  Every small caps label uses it; a label set at `type-micro` (a badge, the
  reticle) adds `tracking-label` itself. Centred ones pull back
  `-mr-(--tracking-label)`.
- Label-sized actions ("More", "Read more", "In the timeline"): `TONE.link` —
  `ink-muted`, `ink` on hover.
- Merge classes with `cn` from `@/ui/cn`: it knows every token family
  (type, radius, shadow, tracking, leading, duration, curve), so a later
  `type-meta` replaces `type-body` and `rounded-full` replaces
  `rounded-card`. The framework's `cn` reads these as unknown and keeps
  both, leaving the winner to CSS order.

## Time

All durations come from one scale, `size(n) = 0.5s × φⁿ`, rounded to 5ms in CSS.

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

Every control answers in the same two beats: hover in `reveal` on `cream`,
fade out over `settle` on `phosphor`; press down in `touch`, back in `move`.
Press scale is `0.96`, or `0.98` for links and full-width controls.

A stagger between marks steps by `ripple` (a rating's stars) or `flick`
(siblings). Two springs, `SPRING` in `tempo.ts`: `press` for a control going
down and back, `follow` for a highlight sliding after the pointer or the
choice (`SlidingHighlight`, the segmented control's pill).

## Easing

| CSS            | JS `EASE` | Job                                     |
| -------------- | --------- | --------------------------------------- |
| `out-cream`    | `cream`   | A hover or focus arriving               |
| `phosphor`     | —         | Light decaying after the pointer leaves |
| `out-expo`     | `expo`    | Chrome and readouts snapping in         |
| `out-quint`    | `silk`    | Names and lines settling                |
| `fade`         | `fade`    | Plain opacity                           |
| `in-out-cubic` | `glide`   | Loops, sweeps, scrubs                   |
| `in-cubic`     | —         | Leaving                                 |

## Entrances

- Content inside a page section enters with `from="light"`; the section
  header's sweep carries the movement, so the content only exposes.
- Data marks use `grow` (bars) and `dot` (timeline points).
- Dock surfaces use `up` for rows and `scale` for a single state (loading,
  empty, error).
- As the page scrolls, the header layers (title, rule, tagline, prose) dim to
  the same depth, `0.2`, one after another (`GRAMMAR.layers`).

## Layers

The dock, modals, the context menu, toasts and tooltips are cut from one set
of chrome in `src/config/theme/chrome.ts`:

| Name       | Look                                                  | For                                |
| ---------- | ----------------------------------------------------- | ---------------------------------- |
| `SHELL`    | 70% black glass, `ring-edge-hover`, top light, `lift` | Dock card, modal, context menu     |
| `FLOAT`    | The same glass with `shadow-float`                    | Dock controls, breadcrumbs, toasts |
| `TIP`      | The same glass with `ring-edge` and `ink-lead` text   | Tooltips (and `.tooltip-content`)  |
| `BACKDROP` | 60% black, `blur-md`                                  | What dims the page behind a layer  |
| `DIM`      | 30% black, `blur-xs`                                  | A layer left under the top one     |
| `FILL`     | `fill` / `edge`, one step up on hover                 | A control inside a layer           |
| `PRIMARY`  | White, black ink, a 10% sheen, `white/90` on hover    | The one action a layer exists for  |

Shells hold content on the card scale: a shell is `rounded-shell` (26), or
`rounded-sheet` (24) for the menu, and what sits inside is `rounded-card`.
A select's list is a menu: `SHELL` with `backdrop-blur-xl`.
Inside a surface tile, buttons and icon tiles are `rounded-inset`. In the
surface kit (`src/ui/surface.tsx`): `surfaceButton`, `SURFACE_PRIMARY`,
`SURFACE_FIELD`; a chosen button or row uses the same grade steps as
`TONE.chosen`.

Every layer moves the same way: it opens with its opacity over `light` and
its shape over `reveal` (menu) or `move` (modal, dock), from a scale of
`0.98`; it closes over `leave`. Rows inside a menu or select come in one
`step` (size(-5)) apart, at most five. A piece inside an open layer stepping
aside (a dock action, a control, a tooltip) leaves over `touch`.

## Composition

- Surfaces: `TONE.surface`; chosen: `TONE.chosen`; floating chrome over a
  picture: `TONE.glass`; carousel arrows: `TONE.arrows`.
- Selects: `TONE.select`. The button that shows the rest of a list:
  `TONE.more`. Awards on a page: `STAGE_LOOK`.
- Standalone surface buttons use `cine-press` (lift and press); icon buttons
  inside a toolbar use `cine-fade`.
- Focus rings come from `globals.css`; components do not set their own.

## Exceptions

The projection room's optics (the sheen, the ambient wash, grain, the dock
banner's masks, the reticle and the film tube) are tuned against the picture
rather than the UI: they may sit below the 5% step and use raw white or
black. So does a member's backdrop washed behind a notification (25, 40 on
hover). Page choreography (stage, cinema, the spotlight scenes) keeps its own
timings. Data-viz
geometry (the career chart's 3px gaps and bar corners) follows the chart, not
the radius scale.
