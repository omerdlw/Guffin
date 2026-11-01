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

The only other colours are what a member did with a film: `watched`, `listed`,
`liked`, `rated`.

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

Two more are derived, not chosen: `rounded-inset` (10) is a card less the 6px
padding of a surface tile, for a tile inside one; `rounded-shell` (26) is a
card plus the 10px gutter of the dock and modal shells.

A frame inside another keeps the curves parallel: its radius is the outer one
minus the padding between them (`nested(outer, padding)`). A card of 20 with
`p-1` holds a photo of 16; a surface tile of 16 with `p-1.5` holds 10. Props
that take a number (`Carousel`, `MediaCard`, `Tile`) read `RADIUS`.

## Type

- Labels: `TONE.label` — 11/16, semibold, `0.14em` tracking, uppercase. Every
  small caps label uses it; centred ones pull back `-mr-[0.14em]`.
- Label-sized actions ("More", "Read more", "In the timeline"): `TONE.link` —
  `ink-muted`, `ink` on hover.
- Taglines track tighter (`0.12em`) because they are set larger.

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
| `FILL`     | `fill` / `edge`, one step up on hover                 | A control inside a layer           |
| `PRIMARY`  | White, black ink, a 10% sheen, `white/90` on hover    | The one action a layer exists for  |

Shells hold content on the card scale: a shell is `rounded-shell` (26), or
`rounded-sheet` (24) for the menu, and what sits inside is `rounded-card`.
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
- Disabled is `opacity-50`.

## Exceptions

The projection room's optics (the sheen, the ambient wash, grain) are tuned
against the picture rather than the UI, and sit below the 5% step. Data-viz
geometry (the career chart's 3px gaps and bar corners) follows the chart, not
the radius scale.
